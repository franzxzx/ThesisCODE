import React, { useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, X, AlertCircle, CheckCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { UserContext } from '../lib/UserContext';
import { useTheme } from '../lib/ThemeContext';

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useContext(UserContext);
  const { theme } = useTheme();
  
  const createResponderAccount = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create user with regular signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            role: 'responder'
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error('Failed to create user account');
      }

      // Manually create the user profile using email as full_name
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: signUpData.user.id,
          email: email,
          role: 'responder',
          full_name: email.split('@')[0] // Use email username as display name
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('Failed to create user profile');
      }

      setSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);

    } catch (error: any) {
      console.error('Error creating responder account:', error);
      setError(error.message || 'Failed to create responder account');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    setError('Unauthorized: Admin access required');
    return;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className={`
        ${theme === 'dark' 
          ? 'bg-gray-800 border-gray-700 shadow-2xl shadow-black/50' 
          : 'bg-white border-gray-200 shadow-2xl shadow-black/20'
        } 
        rounded-2xl border w-full max-w-md mx-auto transform transition-all duration-300 ease-out
      `}>
        {/* Header */}
        <div className={`
          ${theme === 'dark' 
            ? 'bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-gray-700' 
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'
          } 
          px-8 py-6 rounded-t-2xl border-b flex items-center justify-between
        `}>
          <div className="flex items-center space-x-3">
            <div className={`
              ${theme === 'dark' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-600 text-white'
              } 
              p-2.5 rounded-xl shadow-lg
            `}>
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className={`
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'} 
                text-xl font-bold tracking-tight
              `}>
                Create Responder Account
              </h2>
              <p className={`
                ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} 
                text-sm font-medium
              `}>
                Add a new responder to the system
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`
              ${theme === 'dark' 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              } 
              p-2 rounded-xl transition-all duration-200 hover:scale-105
            `}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Error Message */}
          {error && (
            <div className={`
              ${theme === 'dark' 
                ? 'bg-red-900/30 border-red-700/50 text-red-300' 
                : 'bg-red-50 border-red-200 text-red-700'
              } 
              mb-6 p-4 border rounded-xl flex items-start space-x-3 animate-in slide-in-from-top-2 duration-300
            `}>
              <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
              <span className="text-sm font-medium leading-relaxed">{error}</span>
            </div>
          )}
          
          {/* Success Message */}
          {success && (
            <div className={`
              ${theme === 'dark' 
                ? 'bg-green-900/30 border-green-700/50 text-green-300' 
                : 'bg-green-50 border-green-200 text-green-700'
              } 
              mb-6 p-4 border rounded-xl flex items-start space-x-3 animate-in slide-in-from-top-2 duration-300
            `}>
              <CheckCircle className="flex-shrink-0 mt-0.5" size={18} />
              <span className="text-sm font-medium leading-relaxed">
                Responder account created successfully! Welcome to the team.
              </span>
            </div>
          )}

          {/* Form */}
          <div className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className={`
                ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} 
                block text-sm font-semibold tracking-wide
              `}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`
                  ${theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
                  } 
                  w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 font-medium
                `}
                placeholder="responder@example.com"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className={`
                ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} 
                block text-sm font-semibold tracking-wide
              `}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`
                    ${theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
                    } 
                    w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 font-medium
                  `}
                  placeholder="Create a secure password"
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`
                    ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} 
                    absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200
                  `}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className={`
                ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} 
                block text-sm font-semibold tracking-wide
              `}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`
                    ${theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
                    } 
                    w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 font-medium
                  `}
                  placeholder="Confirm your password"
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`
                    ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} 
                    absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200
                  `}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Role Information */}
            <div className={`
              ${theme === 'dark' 
                ? 'bg-blue-900/30 border-blue-700/50' 
                : 'bg-blue-50 border-blue-200'
              } 
              p-4 border rounded-xl
            `}>
              <div className="flex items-start space-x-3">
                <div className={`
                  ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} 
                  flex-shrink-0 mt-0.5
                `}>
                  <Shield size={18} />
                </div>
                <div>
                  <p className={`
                    ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'} 
                    text-sm font-semibold
                  `}>
                    Responder Role Permissions
                  </p>
                  <p className={`
                    ${theme === 'dark' ? 'text-blue-200' : 'text-blue-600'} 
                    text-sm mt-1 leading-relaxed
                  `}>
                    This account will have access to point-to-point routing functionality and can create route updates between two locations.
                  </p>
                </div>
              </div>
            </div>

            {/* Password Requirements */}
            <div className={`
              ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} 
              text-xs space-y-1
            `}>
              <p className="font-medium">Password requirements:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>At least 6 characters long</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              onClick={createResponderAccount}
              disabled={loading || !email || !password || !confirmPassword}
              className={`
                ${loading || !email || !password || !confirmPassword
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] active:scale-[0.98]'
                } 
                w-full text-white py-3.5 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg
              `}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Create Responder Account</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;