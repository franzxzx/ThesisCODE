import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';

import { Navigation } from './components/Navigation';
import AdminPage from './pages/AdminPage';
import { ResponderPage } from './pages/ResponderPage';
import { PublicMapPage } from './pages/PublicMapPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ThemeProvider } from './lib/ThemeContext';
import { UserProvider } from './lib/UserContext';
import { useUser } from './hooks/useUser';

function AdminLayout() {
  const [activeAdminTab, setActiveAdminTab] = useState<'map' | 'users'>('map');
  const { logout } = useUser();

  return (
    <div className="flex flex-row min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navigation
        isAuthenticated={true}
        onLogoutClick={logout}
        onTabChange={(tab) => setActiveAdminTab(tab as 'map' | 'users')}
        activeTab={activeAdminTab}
      />
      <main className="flex-1 pt-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {activeAdminTab === 'map' && <AdminPage />}
        {activeAdminTab === 'users' && (
          <div className="p-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-colors duration-200">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Accounts Management</h2>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg h-96 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 transition-colors duration-200">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-200">
                    <span className="w-8 h-8 text-gray-400 dark:text-gray-300">👥</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">User Accounts Management</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ResponderLayout() {
  const { logout } = useUser();

  return (
    <div className="flex flex-row min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navigation
        isAuthenticated={true}
        onLogoutClick={logout}
      />
      <main className="flex-1 pt-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <ResponderPage />
      </main>
    </div>
  );
}

function App() {
  const { session, profile, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasRedirectedAfterLogin, setHasRedirectedAfterLogin] = useState(false);

  // Redirect users to their role-specific pages after login
  useEffect(() => {
    if (loading) return;

    // If user just logged in and is on public page, redirect to their role page
    if (session && profile && location.pathname === '/public' && !hasRedirectedAfterLogin) {
      if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
        setHasRedirectedAfterLogin(true);
      } else if (profile.role === 'responder') {
        navigate('/responder', { replace: true });
        setHasRedirectedAfterLogin(true);
      }
    }

    // Reset redirect flag when user logs out
    if (!session) {
      setHasRedirectedAfterLogin(false);
    }
  }, [session, profile, loading, navigate, location.pathname, hasRedirectedAfterLogin]);

  // Protect routes - redirect unauthorized users to public
  useEffect(() => {
    if (loading) return;

    // If user is on admin route but not admin, redirect to public
    if (location.pathname === '/admin' && (!session || !profile || profile.role !== 'admin')) {
      navigate('/public', { replace: true });
    }
    
    // If user is on responder route but not responder, redirect to public  
    if (location.pathname === '/responder' && (!session || !profile || profile.role !== 'responder')) {
      navigate('/public', { replace: true });
    }
  }, [session, profile, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/public" replace />} />
      
      {/* Public page - acts as citizen (view-only) */}
      <Route path="/public" element={<PublicMapPage />} />
      
      {/* Admin protected route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute session={session} requiredRole="admin" userRole={profile?.role}>
            <AdminLayout />
          </ProtectedRoute>
        }
      />
      
      {/* Responder protected route */}
      <Route
        path="/responder"
        element={
          <ProtectedRoute session={session} requiredRole="responder" userRole={profile?.role}>
            <ResponderLayout />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/public" replace />} />
    </Routes>
  );
}

function AppWithProviders() {
  return (
    <ThemeProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </ThemeProvider>
  );
}

export default AppWithProviders;
