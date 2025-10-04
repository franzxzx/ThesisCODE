import React from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Admin bypass - hardcoded admin login
      if (email === 'admin@test.com' && password === 'test123') {
        const mockSession = {
          user: {
            id: 'admin-mock-id',
            email: 'admin@test.com',
            user_metadata: { role: 'admin' }
          }
        };
        localStorage.setItem('mock_session', JSON.stringify(mockSession));
        setSuccessMessage('Admin login successful!');
        
        setTimeout(() => {
          window.location.reload(); // Trigger UserContext to pick up the session
        }, 1000);
        return;
      }

      // Check localStorage for responder accounts
      const responderAccounts = JSON.parse(localStorage.getItem('responder_accounts') || '[]');
      const responderUser = responderAccounts.find((user: any) => 
        user.email === email && user.password === password
      );

      if (responderUser) {
        // Create mock session for responder
        const mockSession = {
          user: {
            id: responderUser.id,
            email: responderUser.email,
            user_metadata: { role: 'responder' }
          }
        };
        localStorage.setItem('mock_session', JSON.stringify(mockSession));
        setSuccessMessage('Responder login successful!');
        
        setTimeout(() => {
          window.location.reload(); // Trigger UserContext to pick up the session
        }, 1000);
        return;
      }

      // If no local account found, try Supabase (fallback)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('Login successful!');
      setEmail('');
      setPassword('');
      
      // Note: UserContext will handle routing based on user role
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error: any) {
      console.error('Login error:', error);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm transform transition-all duration-300 scale-100">
        {/* Header with Logo */}
        <div className="flex flex-col items-center pt-8 pb-6 px-8">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl mb-4">
            <img
              src="/img/logoonly.png"
              alt="SeguRuta Logo"
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SeguRuta</h1>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mx-8 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mx-8 mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-green-600 dark:text-green-400 text-sm text-center">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
          <div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Email"
              required
            />
          </div>
          
          <div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Password"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 dark:bg-blue-600 text-white py-4 px-6 rounded-2xl hover:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              'Log in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};