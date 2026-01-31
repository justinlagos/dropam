import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface UserContextType {
  currentUser: User | null;
  checkPermission: (action: PermissionAction, resourceOwnerId?: string) => boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  error: string | null;
  refetchUser: () => Promise<void>;
}

type PermissionAction = 'reassign_brief' | 'delete_brief' | 'view_internal_notes' | 'set_deadline' | 'take_brief' | 'deliver_brief' | 'manage_users';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to map DB profile to App User (Supabase returns snake_case for columns)
  const mapProfileToUser = (profile: any, sessionUser: any): User => {
    const dbRole = profile.role ?? (profile as any).role;
    const role = (dbRole === 'creative' ? 'pod_member' : dbRole) || 'pod_member';
    return {
      id: profile.id,
      email: profile.email || sessionUser.email || '',
      name: profile.name || sessionUser.email?.split('@')[0] || 'User',
      role: role as User['role'],
      podId: profile.pod_id ?? (profile as any).pod_id,
      brandId: profile.brand_id ?? (profile as any).brand_id,
      preferences: profile.preferences
    };
  };

  const handleUserSession = async (sessionUser: any) => {
    const fallbackUser = {
      id: sessionUser.id,
      email: sessionUser.email || '',
      name: sessionUser.email?.split('@')[0] || 'User',
      role: 'pod_member' as const,
    };
    try {
        setError(null);
        
        // 1. Fetch Profile
        let { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionUser.id)
            .single();
        
        if (fetchError && fetchError.code === '42P01') {
            const msg = "Database tables missing. Run supabase_schema.sql";
            console.error(msg);
            setError(msg);
            setCurrentUser({ ...fallbackUser, podId: undefined, brandId: undefined });
            return;
        }
        
        // 2. Self-Heal: If profile is missing (auth exists, but db row doesn't), create it.
        // We ignore 'PGRST116' which is "Result contains 0 rows" - meaning we need to create one.
        if (!profile) {
            const meta = sessionUser.user_metadata || {};
            const role = meta.role === 'client' ? 'client' : 'pod_member';
            const insertRow: Record<string, any> = {
                id: sessionUser.id,
                email: sessionUser.email,
                role,
                name: meta.name || sessionUser.email?.split('@')[0] || 'User'
            };
            if (role === 'client' && meta.brand_id) insertRow.brand_id = meta.brand_id;
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert(insertRow)
                .select()
                .single();
            
            if (createError) {
                console.error("Failed to auto-create profile:", createError);
                // If the error is not duplicate key (23505), report it
                if (createError.code !== '23505') {
                   setError("Failed to create user profile.");
                } else {
                   // If duplicate key, it means another request beat us to it. Fetch again.
                   const { data: retryProfile } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
                   profile = retryProfile;
                }
            } else {
                profile = newProfile;
            }
        }

        if (profile) {
            setCurrentUser(mapProfileToUser(profile, sessionUser));
        } else {
            setCurrentUser({ ...fallbackUser, podId: undefined, brandId: undefined });
        }

    } catch (e: any) {
        console.error("Session handling error:", e);
        setError(e.message);
        setCurrentUser({ ...fallbackUser, podId: undefined, brandId: undefined });
    }
  };

  useEffect(() => {
    let mounted = true;
    let profileLoaded = false;

    const SYNC_TIMEOUT_MS = 8000;

    const syncSession = async (session: any) => {
      if (!mounted || !session?.user) return;

      const timeoutId = setTimeout(() => {
        if (!profileLoaded) {
          console.warn("Profile fetch taking longer than expected...");
        }
      }, 5000);

      // Race profile load against a hard timeout so we never hang forever (e.g. if
      // the 5s app-level timeout already ran before sign-in).
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), SYNC_TIMEOUT_MS);
      });
      const sessionPromise = (async (): Promise<'session'> => {
        await handleUserSession(session.user);
        return 'session';
      })();

      try {
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        profileLoaded = result === 'session';
        if (mounted && !profileLoaded) {
          const fallback = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.email?.split('@')[0] || 'User',
            role: 'pod_member' as const,
            podId: undefined,
            brandId: undefined
          };
          setCurrentUser(fallback);
        }
      } catch (e: any) {
        console.error("Session sync error:", e?.message);
        if (mounted && !profileLoaded) {
          const fallback = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.email?.split('@')[0] || 'User',
            role: 'pod_member' as const,
            podId: undefined,
            brandId: undefined
          };
          setCurrentUser(fallback);
        }
      } finally {
        clearTimeout(timeoutId);
        if (mounted) setIsLoading(false);
      }
    };

    // Bootstrap immediately with getSession (avoids waiting for onAuthStateChange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        syncSession(session);
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    // Safety: never hang on loading > 5s
    const t = setTimeout(() => { if (mounted) setIsLoading(false); }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                 await syncSession(session);
            } else if (mounted) setIsLoading(false);
        } else {
            setCurrentUser(null);
            setError(null);
            setIsLoading(false);
        }
    });

    return () => {
        mounted = false;
        clearTimeout(t);
        subscription.unsubscribe();
    };
  }, []);

  const refetchUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await handleUserSession(session.user);
  }, []);

  const signOut = async () => {
      setIsLoading(true);
      await supabase.auth.signOut();
      setCurrentUser(null);
      setIsLoading(false);
  };

  const checkPermission = useCallback((action: PermissionAction, resourceOwnerId?: string): boolean => {
    if (!currentUser) return false;
    const { role, id } = currentUser;

    switch (action) {
      case 'reassign_brief':
      case 'set_deadline':
        return role === 'admin' || role === 'pod_lead';
      case 'delete_brief':
      case 'manage_users':
        return role === 'admin';
      case 'view_internal_notes':
        return role !== 'client';
      case 'take_brief':
        return role !== 'client';
      case 'deliver_brief':
        // Owner, Lead, or Admin can deliver
        return role === 'admin' || role === 'pod_lead' || id === resourceOwnerId;
      default:
        return false;
    }
  }, [currentUser]);

  return (
    <UserContext.Provider value={{ currentUser, checkPermission, isLoading, signOut, error, refetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};