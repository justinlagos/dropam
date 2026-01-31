import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { User, Membership, MembershipRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface UserContextType {
  currentUser: User | null;
  checkPermission: (action: PermissionAction, resourceOwnerId?: string) => boolean;
  hasPodAccess: (podId: string) => boolean;
  getPodRole: (podId: string) => MembershipRole | null;
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

  // Helper to map DB profile + memberships to App User
  const mapProfileToUser = (profile: any, memberships: any[], sessionUser: any): User => {
    // Role is now simplified: 'admin' or 'user'
    // Legacy roles (pod_member, pod_lead) are mapped to 'user' - pod access comes from memberships
    let role: User['role'] = 'user';
    if (profile.role === 'admin') {
      role = 'admin';
    }

    // Map memberships from DB format
    const mappedMemberships: Membership[] = (memberships || []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      podId: m.pod_id,
      role: m.role as MembershipRole,
      status: m.status,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));

    return {
      id: profile.id,
      email: profile.email || sessionUser.email || '',
      name: profile.name || sessionUser.email?.split('@')[0] || 'User',
      role,
      // Legacy podId - first active membership's pod (for backward compatibility)
      podId: mappedMemberships.find(m => m.status === 'active')?.podId,
      memberships: mappedMemberships,
      preferences: profile.preferences
    };
  };

  const handleUserSession = async (sessionUser: any) => {
    const fallbackUser: User = {
      id: sessionUser.id,
      email: sessionUser.email || '',
      name: sessionUser.email?.split('@')[0] || 'User',
      role: 'user',
      podId: undefined,
      memberships: [],
    };
    try {
      setError(null);

      // 1. Fetch Profile
      let { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      // Handle specific database errors gracefully (no alert popups)
      if (fetchError) {
        if (fetchError.code === '42P01') {
          // Tables missing
          setError('Database tables not found. Contact admin.');
          setCurrentUser(fallbackUser);
          return;
        }
        if (fetchError.code === '42501' || fetchError.message?.includes('permission') || fetchError.message?.includes('policy')) {
          // Permission denied - RLS issue
          setError('Permission denied. Database policies may need to be applied.');
          setCurrentUser(fallbackUser);
          return;
        }
        // PGRST116 = no rows found, which is fine - we'll create the profile
        if (fetchError.code !== 'PGRST116') {
          console.error('Profile fetch error:', fetchError);
        }
      }

      // 2. Self-Heal: If profile is missing, create it with 'user' role
      // Note: Clients never log in - they use brand drop links with access keys
      if (!profile) {
        const meta = sessionUser.user_metadata || {};
        const insertRow = {
          id: sessionUser.id,
          email: sessionUser.email,
          role: 'user', // New users get 'user' role - access comes from memberships
          name: meta.name || sessionUser.email?.split('@')[0] || 'User'
        };
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert(insertRow)
          .select()
          .single();

        if (createError) {
          console.error('Failed to auto-create profile:', createError);
          if (createError.code === '23505') {
            // Duplicate key - another request created it, fetch again
            const { data: retryProfile } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
            profile = retryProfile;
          } else if (createError.code === '42501' || createError.message?.includes('permission')) {
            setError('Permission denied creating profile. Contact admin.');
            setCurrentUser(fallbackUser);
            return;
          } else {
            setError('Failed to create user profile.');
            setCurrentUser(fallbackUser);
            return;
          }
        } else {
          profile = newProfile;
        }
      }

      // 3. Fetch memberships for this user
      let memberships: any[] = [];
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', sessionUser.id);

      if (membershipError) {
        // Memberships table might not exist yet - that's okay during migration
        if (membershipError.code !== '42P01') {
          console.warn('Memberships fetch warning:', membershipError);
        }
      } else {
        memberships = membershipData || [];
      }

      if (profile) {
        setCurrentUser(mapProfileToUser(profile, memberships, sessionUser));
      } else {
        setCurrentUser(fallbackUser);
      }

    } catch (e: any) {
      console.error('Session handling error:', e);
      setError(e.message || 'An unexpected error occurred.');
      setCurrentUser(fallbackUser);
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

      // Race profile load against a hard timeout so we never hang forever
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
          const fallback: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.email?.split('@')[0] || 'User',
            role: 'user',
            podId: undefined,
            memberships: []
          };
          setCurrentUser(fallback);
        }
      } catch (e: any) {
        console.error("Session sync error:", e?.message);
        if (mounted && !profileLoaded) {
          const fallback: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.email?.split('@')[0] || 'User',
            role: 'user',
            podId: undefined,
            memberships: []
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

  // Check if user has access to a specific pod
  const hasPodAccess = useCallback((podId: string): boolean => {
    if (!currentUser) return false;
    // Admins have access to all pods
    if (currentUser.role === 'admin') return true;
    // Check memberships
    return currentUser.memberships?.some(m => m.podId === podId && m.status === 'active') ?? false;
  }, [currentUser]);

  // Get user's role in a specific pod
  const getPodRole = useCallback((podId: string): MembershipRole | null => {
    if (!currentUser) return null;
    // Admins effectively have pod_lead access everywhere
    if (currentUser.role === 'admin') return 'pod_lead';
    // Check memberships
    const membership = currentUser.memberships?.find(m => m.podId === podId && m.status === 'active');
    return membership?.role ?? null;
  }, [currentUser]);

  const checkPermission = useCallback((action: PermissionAction, resourceOwnerId?: string): boolean => {
    if (!currentUser) return false;
    const { role, id, memberships } = currentUser;

    // Get the user's highest role across all their memberships
    const isPodLead = memberships?.some(m => m.role === 'pod_lead' && m.status === 'active') ?? false;
    const isPodMember = memberships?.some(m => m.status === 'active') ?? false;

    switch (action) {
      case 'reassign_brief':
      case 'set_deadline':
        return role === 'admin' || isPodLead;
      case 'delete_brief':
      case 'manage_users':
        return role === 'admin';
      case 'view_internal_notes':
        return role === 'admin' || isPodMember;
      case 'take_brief':
        return role === 'admin' || isPodMember;
      case 'deliver_brief':
        // Owner, Lead, or Admin can deliver
        return role === 'admin' || isPodLead || id === resourceOwnerId;
      default:
        return false;
    }
  }, [currentUser]);

  return (
    <UserContext.Provider value={{ currentUser, checkPermission, hasPodAccess, getPodRole, isLoading, signOut, error, refetchUser }}>
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
