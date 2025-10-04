import React from 'react';
import { X } from 'lucide-react';

interface SegmentStatusSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusSelect: (status: 'passable' | 'restricted' | 'blocked') => void;
  currentStatus: 'passable' | 'restricted' | 'blocked';
  segmentName?: string;
  position: { x: number; y: number };
}

export const SegmentStatusSelector: React.FC<SegmentStatusSelectorProps> = ({
  isOpen,
  onClose,
  onStatusSelect,
  currentStatus,
  segmentName,
  position
}) => {
  if (!isOpen) return null;

  const statusOptions = [
    {
      value: 'passable' as const,
      label: 'Open',
      description: 'Fully passable for all vehicles',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      textColor: 'text-white',
      icon: '✅'
    },
    {
      value: 'restricted' as const,
      label: 'Restricted',
      description: 'Passable only for certain vehicle types',
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
      textColor: 'text-white',
      icon: '⚠️'
    },
    {
      value: 'blocked' as const,
      label: 'Blocked',
      description: 'Completely impassable',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      textColor: 'text-white',
      icon: '🚫'
    }
  ];

  const handleStatusSelect = (status: 'passable' | 'restricted' | 'blocked') => {
    onStatusSelect(status);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-[1000]"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div 
        className="fixed z-[1001] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[280px] max-w-[320px]"
        style={{
          left: `${Math.min(position.x, window.innerWidth - 340)}px`,
          top: `${Math.min(position.y, window.innerHeight - 300)}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Road Status
            </h3>
            {segmentName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {segmentName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Status Options */}
        <div className="p-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusSelect(option.value)}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 mb-2 last:mb-0 ${
                currentStatus === option.value
                  ? `${option.color} ${option.textColor} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-opacity-50`
                  : `hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600`
              }`}
            >
              <div className="flex items-center space-x-3 w-full">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStatus === option.value 
                    ? 'bg-white bg-opacity-20' 
                    : option.color
                }`}>
                  <span className="text-sm">
                    {currentStatus === option.value ? '✓' : option.icon}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-medium ${
                    currentStatus === option.value 
                      ? option.textColor 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {option.label}
                  </div>
                  <div className={`text-xs ${
                    currentStatus === option.value 
                      ? 'text-white text-opacity-80' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {option.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 rounded-b-xl border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Click to change road status
          </p>
        </div>
      </div>
    </>
  );
};