import React from 'react';
import { MapPin, User, LogOut, Moon, Sun, UserPlus } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { useUser } from '../hooks/useUser';

interface NavigationProps {
  isAuthenticated: boolean;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  onCreateAccountClick?: () => void;
  // Removed onTabChange and activeTab since we're removing tabs
}

export const Navigation: React.FC<NavigationProps> = ({ 
  isAuthenticated, 
  onLoginClick, 
  onLogoutClick, 
  onCreateAccountClick
}) => {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useUser();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-1">
              <img
                src="/img/logoonly.png"
                alt="SeguRuta Logo"
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">SeguRuta</span>
              {profile && (
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  profile.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {profile.role.toUpperCase()}
                </span>
              )}
              {!isAuthenticated && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  CITIZEN
                </span>
              )}
              
              {/* Create Account Button - Only visible to admins */}
              {isAuthenticated && profile?.role === 'admin' && (
                <button
                  onClick={onCreateAccountClick}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 text-sm font-medium shadow-md"
                  title="Create Responder Account"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              )}
            </div>

            {/* Role-based navigation tabs - Simplified */}
            {isAuthenticated && profile && (
              <div className="flex space-x-1">
                {profile.role === 'admin' && (
                  <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Road Block Management
                  </div>
                )}
                {profile.role === 'responder' && (
                  <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    🚗 Routing Dashboard
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right side buttons */}
          <div className="flex items-center space-x-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>

            {/* Auth Button */}
            {isAuthenticated ? (
              <button
                onClick={onLogoutClick}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                <User className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
