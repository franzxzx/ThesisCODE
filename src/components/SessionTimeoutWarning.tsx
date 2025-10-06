import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { useTheme } from '../lib/ThemeContext';

interface SessionTimeoutWarningProps {
  isVisible: boolean;
  timeRemaining: number;
  onExtendSession: () => void;
  onLogout: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  isVisible,
  timeRemaining,
  onExtendSession,
  onLogout
}) => {
  const { theme } = useTheme();
  const [countdown, setCountdown] = useState(timeRemaining);

  useEffect(() => {
    setCountdown(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (!isVisible || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, countdown, onLogout]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className={`
        ${theme === 'dark' 
          ? 'bg-gray-800 border-gray-700 shadow-2xl shadow-black/50' 
          : 'bg-white border-gray-200 shadow-2xl shadow-black/20'
        } 
        rounded-xl border w-full max-w-md mx-auto transform transition-all duration-300 ease-out animate-in slide-in-from-top-4
      `}>
        {/* Header */}
        <div className={`
          ${theme === 'dark' 
            ? 'bg-gradient-to-r from-orange-900/50 to-red-900/50 border-gray-700' 
            : 'bg-gradient-to-r from-orange-50 to-red-50 border-gray-200'
          } 
          px-6 py-4 rounded-t-xl border-b flex items-center space-x-3
        `}>
          <div className={`
            ${theme === 'dark' 
              ? 'bg-orange-600 text-white' 
              : 'bg-orange-600 text-white'
            } 
            p-2 rounded-lg shadow-lg
          `}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className={`
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'} 
              text-lg font-bold
            `}>
              Session Timeout Warning
            </h2>
            <p className={`
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} 
              text-sm
            `}>
              Your session will expire soon
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="text-center mb-6">
            <div className={`
              ${theme === 'dark' 
                ? 'bg-red-900/30 border-red-700/50 text-red-300' 
                : 'bg-red-50 border-red-200 text-red-700'
              } 
              inline-flex items-center space-x-2 px-4 py-3 border rounded-xl font-mono text-lg font-bold
            `}>
              <Clock size={20} />
              <span>{formatTime(countdown)}</span>
            </div>
            <p className={`
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} 
              mt-3 text-sm leading-relaxed
            `}>
              You've been inactive for an extended period. Your session will automatically expire in the time shown above for security reasons.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onExtendSession}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-4 py-3 
                bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                text-white rounded-xl font-semibold transition-all duration-200 
                hover:scale-[1.02] active:scale-[0.98] shadow-lg
              `}
            >
              <RefreshCw size={18} />
              <span>Extend Session</span>
            </button>
            
            <button
              onClick={onLogout}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-4 py-3 
                ${theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                } 
                border rounded-xl font-semibold transition-all duration-200 
                hover:scale-[1.02] active:scale-[0.98]
              `}
            >
              <span>Logout Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};