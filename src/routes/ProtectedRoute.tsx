import React from 'react';
import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { UserRole } from '../lib/UserContext';

export const ProtectedRoute: React.FC<{
  session: Session | null;
  requiredRole?: UserRole;
  userRole?: UserRole;
  children: React.ReactNode;
}> = ({ session, requiredRole, userRole, children }) => {
  if (!session) return <Navigate to="/public" replace />;
  
  if (requiredRole && userRole !== requiredRole) {
    // Redirect to appropriate page based on user's actual role
    const redirectPath = userRole === 'admin' ? '/admin' : '/responder';
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};
