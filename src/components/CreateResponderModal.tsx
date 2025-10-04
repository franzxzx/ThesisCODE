import React from 'react';
import { X, UserPlus, Loader2, Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface CreateResponderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateResponderModal: React.FC<CreateResponderModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Check if email already exists
      const existingAccounts = JSON.parse(localStorage.getItem('responder_accounts') || '[]');
      const emailExists = existingAccounts.some((account: any) => account.email === formData.email);
      
      if (emailExists) {
        throw new Error('An account with this email already exists');
      }

      // Extract username from email for display name
      const emailUsername = formData.email.split('@')[0];

      // Create new responder account
      const newAccount = {
        id: `responder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: formData.email.trim().toLowerCase(),
        password: formData.password, // In production, this should be hashed
        role: 'responder',
        createdAt: new Date().toISOString(),
        createdBy: 'admin' // In production, get from current user context
      };

      // Save to localStorage (in production, this would be a database call)
      const updatedAccounts = [...existingAccounts, newAccount];
      localStorage.setItem('responder_accounts', JSON.stringify(updatedAccounts));

      setSuccessMessage('Responder account created successfully!');
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: ''
      });

      // Call success callback and close modal after delay
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1500);

    } catch (error: any) {
      console.error('Account creation error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return; // Prevent closing during loading
    
    setFormData({
      email: '',
      password: '',
      confirmPassword: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
        {/* Header with Logo and Title */}
        <div className="flex flex-col items-center pt-6 sm:pt-8 pb-4 sm:pb-6 px-4 sm:px-8">
          <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
            <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">Create Responder</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
            Add a new responder to the SeguRuta system
          </p>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mx-4 sm:mx-8 mb-3 sm:mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm text-center">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mx-4 sm:mx-8 mb-3 sm:mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-green-600 dark:text-green-400 text-xs sm:text-sm text-center">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-4 sm:px-8 pb-6 sm:pb-8 space-y-4 sm:space-y-5">
          {/* Email Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-green-500 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Email Address"
              required
            />
          </div>
          
          {/* Password Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-green-500 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Password (min. 6 characters)"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Confirm Password Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Shield className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-green-500 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Confirm Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Role Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Role: Responder
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-6">
              Can access routing dashboard and view road status updates
            </p>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white py-4 px-6 rounded-2xl hover:from-green-600 hover:to-emerald-700 dark:hover:from-green-700 dark:hover:to-emerald-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                Create Responder Account
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};