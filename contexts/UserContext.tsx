import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { User, Membership, MembershipRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface UserContextType {
  currentUser: User | null;
  checkPermission: (action: PermissionAction, resourceOwnerId?: string) => boolean;
  hasPodAccess: (podId: string) => boolean;
  getPodRole: (podId: string) => MembershipRole | null;
  isLoading: boolean;
  initialized: boolean;
  signOut: () => Promise<void>;
  error: string | null;
  refetchUser: () => Promise<void>;
}

type PermissionAction = 'reassign_brief' | 'delete_brief' | 'view_internal_notes' | 'set_deadline' | 'take_brief' | 'deliver_brief' | 'manage_users';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against race conditions
  const mountedRef = useRef(true);
  const sessionSyncInProgress = useRef(false);
  const lastSyncedUserId = useRef<string | null>(null);

  // Helper to map DB profile + memberships to App User
  const mapProfileToUser = (profile: any, memberships: any[], sessionUser: any): User => {
    let role: User['role'] = 'user';
    if (profile.role === 'admin') {
      role = 'admin';
    }

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
      podId: mappedMemberships.find(m => m.status === 'active')?.podId,
      memberships: mappedMemberships,
      preferences: profile.preferences
    };
  };

  const createFallbackUser = (sessionUser: any): User => ({
    id: sessionUser.id,
    email: sessionUser.email || '',
    name: sessionUser.email?.split('@')[0] || 'User',
    role: 'user',
    podId: undefined,
    memberships: []
  });

  const handleUserSession = useCallback(async (sessionUser: any): Promise<User> => {
    const fallbackUser = createFallbackUser(sessionUser);

    try {
      setError(null);

      // 1. Fetch Profile
      let { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (fetchError) {
        if (fetchError.code === '42P01') {
          setError('Database tables not found. Contact admin.');
          return fallbackUser;
        }
        if (fetchError.code === '42501' || fetchError.message?.includes('permission') || fetchError.message?.includes('policy')) {
          setError('Permission denied. Database policies may need to be applied.');
          return fallbackUser;
        }
        if (fetchError.code !== 'PGRST116') {
          console.error('Profile fetch error:', fetchError);
        }
      }

      // 2. Self-Heal: If profile is missing, create it
      if (!profile) {
        const meta = sessionUser.user_metadata || {};
        const insertRow = {
          id: sessionUser.id,
          email: sessionUser.email,
          role: 'user',
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
            const { data: retryProfile } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
            profile = retryProfile;
          } else if (createError.code === '42501' || createError.message?.includes('permission')) {
            setError('Permission denied creating profile. Contact admin.');
            return fallbackUser;
          } else {
            setError('Failed to create user profile.');
            return fallbackUser;
          }
        } else {
          profile = newProfile;
        }
      }

      // 3. Fetch memberships
      let memberships: any[] = [];
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', sessionUser.id);

      if (membershipError) {
        if (membershipError.code !== '42P01') {
          console.warn('Memberships fetch warning:', membershipError);
        }
      } else {
        memberships = membershipData || [];
      }

      if (profile) {
        return mapProfileToUser(profile, memberships, sessionUser);
      }
      return fallbackUser;

    } catch (e: any) {
      console.error('Session handling error:', e);
      setError(e.message || 'An unexpected error occurred.');
      return fallbackUser;
    }
  }, []);

  const syncSession = useCallback(async (session: any) => {
    // Guard: Don't sync if component unmounted
    if (!mountedRef.current) return;

    // Guard: Don't sync if no session
    if (!session?.user) {
      setCurrentUser(null);
      setIsLoading(false);
      setInitialized(true);
      return;
    }

    // Guard: Prevent concurrent syncs
    if (sessionSyncInProgress.current) {
      console.log('Session sync already in progress, skipping...');
      return;
    }

    // Guard: Skip if we've already synced this user
    if (lastSyncedUserId.current === session.user.id && currentUser) {
      setIsLoading(false);
      setInitialized(true);
      return;
    }

    sessionSyncInProgress.current = true;

    try {
      const SYNC_TIMEOUT_MS = 8000;

      const timeoutPromise = new Promise<User>((_, reject) => {
        setTimeout(() => reject(new Error('Profile sync timeout')), SYNC_TIMEOUT_MS);
      });

      const sessionPromise = handleUserSession(session.user);

      const user = await Promise.race([sessionPromise, timeoutPromise]);

      if (mountedRef.current) {
        setCurrentUser(user);
        lastSyncedUserId.current = session.user.id;
      }
    } catch (e: any) {
      console.error('Session sync error:', e?.message);
      if (mountedRef.current) {
        setCurrentUser(createFallbackUser(session.user));
        lastSyncedUserId.current = session.user.id;
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setInitialized(true);
      }
      sessionSyncInProgress.current = false;
    }
  }, [handleUserSession, currentUser]);

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: NodeJS.Timeout;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await syncSession(session);
      } catch (e) {
        console.error('Initial session fetch failed:', e);
        if (mountedRef.current) {
          setCurrentUser(null);
          setIsLoading(false);
          setInitialized(true);
        }
      }
    };

    // Safety timeout: never hang on loading > 10s
    timeoutId = setTimeout(() => {
      if (mountedRef.current && !initialized) {
        console.warn('Auth initialization timeout - forcing completion');
        setIsLoading(false);
        setInitialized(true);
      }
    }, 10000);

    initialize();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      console.log('Auth state changed:', event);

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          // Only sync if user changed or we haven't synced yet
          if (session?.user?.id !== lastSyncedUserId.current) {
            await syncSession(session);
          }
          break;

        case 'SIGNED_OUT':
          setCurrentUser(null);
          setError(null);
          lastSyncedUserId.current = null;
          setIsLoading(false);
          break;

        case 'INITIAL_SESSION':
          // Already handled by initialize() above, but handle anyway if racing
          if (!initialized && session?.user) {
            await syncSession(session);
          }
          break;

        default:
          // USER_UPDATED, PASSWORD_RECOVERY, etc.
          if (session?.user && session.user.id === lastSyncedUserId.current) {
            // Refetch profile for user updates
            const updatedUser = await handleUserSession(session.user);
            if (mountedRef.current) {
              setCurrentUser(updatedUser);
            }
          }
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []); // Empty deps - only run once on mount

  const refetchUser = useCallback(async () => {
    if (!mountedRef.current) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Force refetch by clearing the cached user ID
      lastSyncedUserId.current = null;
      await syncSession(session);
    }
  }, [syncSession]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setError(null);
      lastSyncedUserId.current = null;
    } catch (e: any) {
      console.error('Sign out error:', e);
      setError('Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasPodAccess = useCallback((podId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.memberships?.some(m => m.podId === podId && m.status === 'active') ?? false;
  }, [currentUser]);

  const getPodRole = useCallback((podId: string): MembershipRole | null => {
    if (!currentUser) return null;
    if (currentUser.role === 'admin') return 'pod_lead';
    const membership = currentUser.memberships?.find(m => m.podId === podId && m.status === 'active');
    return membership?.role ?? null;
  }, [currentUser]);

  const checkPermission = useCallback((action: PermissionAction, resourceOwnerId?: string): boolean => {
    if (!currentUser) return false;
    const { role, id, memberships } = currentUser;

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
        return role === 'admin' || isPodLead || id === resourceOwnerId;
      default:
        return false;
    }
  }, [currentUser]);

  return (
    <UserContext.Provider value={{
      currentUser,
      checkPermission,
      hasPodAccess,
      getPodRole,
      isLoading,
      initialized,
      signOut,
      error,
      refetchUser
    }}>
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
