import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  forceLogout: () => Promise<void>;
  isSessionValid: () => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  // Session timeout configuration (30 minutes of inactivity)
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Check if session is still valid
  const isSessionValid = useCallback(() => {
    if (!session) return false;
    
    // Check if session has expired based on Supabase token
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      return false;
    }
    
    // Check for inactivity timeout
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    return timeSinceLastActivity < INACTIVITY_TIMEOUT;
  }, [session, INACTIVITY_TIMEOUT]);

  // Force logout with comprehensive cleanup
  const forceLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return; // Prevent multiple logout attempts
    isLoggingOutRef.current = true;
    
    try {
      // Clear all timers
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }

      // Clear all storage completely
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear Supabase session storage specifically
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('supabase.auth.token') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });

      // Sign out from Supabase with global scope to clear all sessions
      await supabase.auth.signOut({ scope: 'global' });

      // Clear local state
      setSession(null);
      setProfile(null);
      
      // Force a complete page reload to clear any cached state
      window.location.replace('/public');
    } catch (error) {
      console.warn('Force logout error:', error);
      // Even if there's an error, clear local state and redirect
      setSession(null);
      setProfile(null);
      window.location.replace('/public');
    } finally {
      isLoggingOutRef.current = false;
    }
  }, []);

  // Setup inactivity monitoring
  const setupInactivityMonitoring = useCallback(() => {
    // Clear existing timers
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
    }

    // Only setup monitoring if user is authenticated
    if (!session) return;

    // Set up inactivity timeout with 5-minute warning
    const warningTime = 5 * 60 * 1000; // 5 minutes before logout
    const timeUntilWarning = INACTIVITY_TIMEOUT - warningTime;

    inactivityTimeoutRef.current = setTimeout(() => {
      // Show warning for 5 minutes before auto-logout
      console.log('Showing inactivity warning...');
      
      // Set final timeout for auto-logout
      setTimeout(() => {
        console.log('User inactive for too long, logging out...');
        forceLogout();
      }, warningTime);
    }, timeUntilWarning);

    // Set up periodic session validation
    sessionCheckIntervalRef.current = setInterval(() => {
      if (!isSessionValid()) {
        console.log('Session invalid, logging out...');
        forceLogout();
      }
    }, SESSION_CHECK_INTERVAL);

    // Add activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
      // Reset inactivity timer
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        
        // Restart the full timeout cycle
        inactivityTimeoutRef.current = setTimeout(() => {
          console.log('Showing inactivity warning...');
          
          setTimeout(() => {
            console.log('User inactive for too long, logging out...');
            forceLogout();
          }, warningTime);
        }, timeUntilWarning);
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup function
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [session, forceLogout, isSessionValid, updateActivity, INACTIVITY_TIMEOUT]);

  // Remove the old fetchUserProfile function since it's now handled inline

  useEffect(() => {
    const fetchProfile = async (userId: string, userEmail?: string, userMetadata?: any, isInitialLoad = false) => {
      try {
        // Only show loading state on initial load, not on auth state changes
        if (isInitialLoad) {
          setLoading(true);
        }
        
        // First try to get role from user metadata (for users created with metadata approach)
        if (userMetadata?.role) {
          setProfile({
            id: userId,
            email: userEmail || '',
            role: userMetadata.role as UserRole
          });
          if (isInitialLoad) {
            setLoading(false);
          }
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
        if (isInitialLoad) {
          setLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      // Skip initialization if we're in the middle of logging out
      if (isLoggingOutRef.current) {
        setLoading(false);
        return;
      }
      
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
        
        // Don't restore session if we're logging out
        if (isLoggingOutRef.current) {
          setLoading(false);
          return;
        }
        
        setSession(supabaseSession);
        
        if (supabaseSession?.user) {
          await fetchProfile(
            supabaseSession.user.id, 
            supabaseSession.user.email, 
            supabaseSession.user.user_metadata,
            true // This is initial load
          );
        } else {
          setLoading(false);
        }

        // Listen for auth changes (Supabase only)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            // Ignore auth changes during logout
            if (isLoggingOutRef.current) return;
            
            setSession(session);
            if (session?.user) {
              await fetchProfile(
                session.user.id, 
                session.user.email, 
                session.user.user_metadata,
                false // This is not initial load, don't show loading state
              );
            } else {
              setProfile(null);
              // Don't set loading to false here as it might interfere with initial load
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

  // Setup inactivity monitoring when session changes
  useEffect(() => {
    const cleanup = setupInactivityMonitoring();
    return cleanup;
  }, [session, setupInactivityMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, []);

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
    if (isLoggingOutRef.current) return; // Prevent multiple logout attempts
    isLoggingOutRef.current = true;
    
    try {
      // Update activity to prevent race conditions
      updateActivity();
      
      // Clear all timers
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }

      // Clear all storage completely
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear Supabase session storage specifically
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('supabase.auth.token') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Sign out from Supabase with global scope
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.warn('Logout error (non-critical):', error);
        // Don't throw error, just log it - we still want to clear local state
      }
      
      // Clear local state regardless of Supabase logout result
      setSession(null);
      setProfile(null);
      
      // Force a complete page reload to clear any cached state
      window.location.replace('/public');
    } catch (error) {
      console.warn('Logout error:', error);
      // Clear local state even if logout fails
      setSession(null);
      setProfile(null);
      // Force a complete page reload to clear any cached state
      window.location.replace('/public');
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [updateActivity]);

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
    logout,
    forceLogout,
    isSessionValid
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext };