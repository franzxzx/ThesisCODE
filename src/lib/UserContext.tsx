import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type UserRole = 'admin' | 'responder';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
}

interface UserContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canEditBlocked: boolean;
  canUseRouting: boolean;
  isPublicUser: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Remove the old fetchUserProfile function since it's now handled inline

  useEffect(() => {
    const fetchProfile = async (userId: string, userEmail?: string, userMetadata?: any) => {
      try {
        setLoading(true);
        
        // First try to get role from user metadata (for users created with metadata approach)
        if (userMetadata?.role) {
          setProfile({
            id: userId,
            email: userEmail || '',
            role: userMetadata.role as UserRole
          });
          setLoading(false);
          return;
        }

        // Fallback: try to fetch from user_profiles table
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.warn('Could not fetch user profile from database:', error);
          
          // Check if this is the admin email specifically
          if (userEmail === 'cdrrmoadmin@email.com') {
            setProfile({
              id: userId,
              email: userEmail || '',
              role: 'admin' as UserRole
            });
          } else {
            // If user_profiles table doesn't exist or user not found, 
            // default to 'responder' role for regular users
            setProfile({
              id: userId,
              email: userEmail || '',
              role: 'responder' as UserRole
            });
          }
        } else {
          // Use the role from the database
          setProfile(data);
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
        
        // Check if this is the admin email specifically
        if (userEmail === 'cdrrmoadmin@email.com') {
          setProfile({
            id: userId,
            email: userEmail || '',
            role: 'admin' as UserRole
          });
        } else {
          // Default fallback - assume responder role
          setProfile({
            id: userId,
            email: userEmail || '',
            role: 'responder' as UserRole
          });
        }
      } finally {
        setLoading(false);
      }
    };

    const initializeAuth = async () => {
      try {
        // Check for mock session first (localStorage-based auth)
        const mockSession = localStorage.getItem('mock_session');
        if (mockSession) {
          const parsedSession = JSON.parse(mockSession);
          setSession(parsedSession);
          
          // Set profile from mock session
          setProfile({
            id: parsedSession.user.id,
            email: parsedSession.user.email,
            role: parsedSession.user.user_metadata.role
          });
          
          setLoading(false);
          return;
        }

        // Fallback to Supabase session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        setSession(supabaseSession);
        
        if (supabaseSession?.user) {
          await fetchProfile(
            supabaseSession.user.id, 
            supabaseSession.user.email, 
            supabaseSession.user.user_metadata
          );
        } else {
          setLoading(false);
        }

        // Listen for auth changes (Supabase only)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            setSession(session);
            if (session?.user) {
              await fetchProfile(
                session.user.id, 
                session.user.email, 
                session.user.user_metadata
              );
            } else {
              setProfile(null);
              setLoading(false);
            }
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []); // Empty dependency array to run only once

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!profile) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(profile.role);
  }, [profile]);

  const canEditBlocked = profile?.role === 'admin';
  const canUseRouting = profile?.role === 'responder'; // Routing exclusive to responders only
  const isPublicUser = !session;
  const isAdmin = profile?.role === 'admin';

  const logout = useCallback(async () => {
    try {
      // Clear mock session data
      localStorage.removeItem('mock_session');
      
      // Sign out from Supabase with proper error handling
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('Logout error (non-critical):', error);
        // Don't throw error, just log it - we still want to clear local state
      }
      
      // Clear local state regardless of Supabase logout result
      setSession(null);
      setProfile(null);
      
      // Force reload to ensure clean state
      window.location.reload();
    } catch (error) {
      console.warn('Logout error:', error);
      // Clear local state even if logout fails
      setSession(null);
      setProfile(null);
      window.location.reload();
    }
  }, []);

  const value: UserContextType = {
    session,
    user: session?.user || null,
    profile,
    loading,
    hasRole,
    canEditBlocked,
    canUseRouting,
    isPublicUser,
    isAdmin,
    logout
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext };