import React, { useState } from 'react';
import { MapPin, User, LogOut, Moon, Sun, UserPlus, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1100] bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and branding */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <img
                src="/img/logoonly.png"
                alt="SeguRuta Logo"
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg"
              />
              <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">SeguRuta</span>
            </div>

            {/* Role-based navigation tabs - Hidden on mobile, shown on tablet+ */}
            {isAuthenticated && profile && (
              <div className="hidden lg:flex space-x-1">
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
          
          {/* Center - Prominent User Role Display */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center">
              {profile && (
                <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg border-2 transition-all duration-200 ${
                  profile.role === 'admin' 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 shadow-red-200 dark:shadow-red-900/50' 
                    : profile.role === 'responder'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400 shadow-green-200 dark:shadow-green-900/50'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-blue-200 dark:shadow-blue-900/50'
                }`}>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      profile.role === 'admin' ? 'bg-red-200' : 
                      profile.role === 'responder' ? 'bg-green-200' : 'bg-blue-200'
                    }`} />
                    <span className="uppercase tracking-wide">
                      {profile.role === 'admin' ? '👑 ADMIN' : 
                       profile.role === 'responder' ? '🚗 RESPONDER' : '👤 USER'}
                    </span>
                  </div>
                </div>
              )}
              {!isAuthenticated && (
                <div className="px-4 py-2 rounded-full text-sm font-bold shadow-lg border-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-blue-200 dark:shadow-blue-900/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-200" />
                    <span className="uppercase tracking-wide">👤 CITIZEN</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Desktop right side buttons - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
            {/* Create Account Button - Only visible to admins */}
            {isAuthenticated && profile?.role === 'admin' && (
              <button
                onClick={onCreateAccountClick}
                className="flex items-center space-x-1 px-2 lg:px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 text-xs lg:text-sm font-medium shadow-md"
                title="Create Responder Account"
              >
                <UserPlus className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden lg:inline">Create Account</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 lg:w-5 lg:h-5" />
              ) : (
                <Sun className="w-4 h-4 lg:w-5 lg:h-5" />
              )}
            </button>

            {/* Auth Button */}
            {isAuthenticated ? (
              <button
                onClick={onLogoutClick}
                className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md hover:shadow-lg text-xs lg:text-sm"
              >
                <LogOut className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md hover:shadow-lg text-xs lg:text-sm"
              >
                <User className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden lg:inline">Admin Login</span>
              </button>
            )}
          </div>

          {/* Mobile controls - Dark mode toggle and hamburger menu */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Dark Mode Toggle - Adjacent to hamburger menu */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 shadow-sm"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 shadow-sm"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <>
            {/* Background blur overlay */}
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1095] md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Mobile menu content */}
            <div className="absolute top-full left-0 right-0 z-[1099] md:hidden mt-2 mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 backdrop-blur-md">
              <div className="p-4 space-y-3">
              {/* Role badges for mobile */}
              <div className="flex items-center justify-center space-x-2 xs:hidden">
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
              </div>

              {/* Role-based navigation for mobile */}
              {isAuthenticated && profile && (
                <div className="text-center">
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

              {/* Create Account Button for mobile - Only visible to admins */}
              {isAuthenticated && profile?.role === 'admin' && (
                <button
                  onClick={() => {
                    onCreateAccountClick?.();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 text-sm font-medium shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Responder Account</span>
                </button>
              )}

              {/* Auth Button for mobile */}
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    onLogoutClick?.();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onLoginClick?.();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  <User className="w-4 h-4" />
                  <span>Admin Login</span>
                </button>
              )}
            </div>
          </div>
        </>
        )}
      </div>
    </nav>
  );
};
