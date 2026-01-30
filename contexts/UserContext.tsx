import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface UserContextType {
  currentUser: User | null;
  checkPermission: (action: PermissionAction, resourceOwnerId?: string) => boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  error: string | null;
}

type PermissionAction = 'reassign_brief' | 'delete_brief' | 'view_internal_notes' | 'set_deadline' | 'take_brief' | 'deliver_brief' | 'manage_users';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to map DB profile to App User
  const mapProfileToUser = (profile: any, sessionUser: any): User => ({
      id: profile.id,
      email: profile.email || sessionUser.email || '',
      name: profile.name || sessionUser.email?.split('@')[0] || 'User',
      role: profile.role || 'creative',
      podId: profile.pod_id,
      brandId: profile.brand_id,
      preferences: profile.preferences
  });

  const handleUserSession = async (sessionUser: any) => {
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
            return;
        }
        
        // 2. Self-Heal: If profile is missing (auth exists, but db row doesn't), create it.
        // We ignore 'PGRST116' which is "Result contains 0 rows" - meaning we need to create one.
        if (!profile) {
            console.log("Profile missing for authenticated user. Auto-creating...");
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: sessionUser.id,
                    email: sessionUser.email,
                    role: 'creative', // Default permission
                    name: sessionUser.email?.split('@')[0] || 'User'
                })
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
            // Fallback if profile creation failed completely
             setCurrentUser({
                id: sessionUser.id,
                email: sessionUser.email || '',
                name: sessionUser.email?.split('@')[0] || 'User',
                role: 'creative'
            });
        }

    } catch (e: any) {
        console.error("Session handling error:", e);
        setError(e.message);
    }
  };

  useEffect(() => {
    let mounted = true;

    // We rely SOLELY on onAuthStateChange to handle initialization and updates.
    // This avoids race conditions between a manual getSession() and the listener firing.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                 // Only fetch if we don't have the user, or if it's a new session
                 // But strictly, we should just sync state to be safe.
                 await handleUserSession(session.user);
            }
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setError(null);
        }
        
        if (mounted) setIsLoading(false);
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
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
    <UserContext.Provider value={{ currentUser, checkPermission, isLoading, signOut, error }}>
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