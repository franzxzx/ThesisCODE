import React from 'react';
import { useTheme } from '../lib/ThemeContext';

export const MapLegend: React.FC = () => {
  const { theme } = useTheme();
  
  const legendItems = [
    { 
      color: '#22c55e', 
      label: 'Passable', 
      icon: '●',
      bgColor: theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50',
      borderColor: theme === 'dark' ? 'border-green-800' : 'border-green-200'
    },
    { 
      color: '#eab308', 
      label: 'Passable to Certain Vehicles', 
      icon: '●',
      bgColor: theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50',
      borderColor: theme === 'dark' ? 'border-yellow-800' : 'border-yellow-200'
    },
    { 
      color: '#ef4444', 
      label: 'Blocked', 
      icon: '●',
      bgColor: theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50',
      borderColor: theme === 'dark' ? 'border-red-800' : 'border-red-200'
    }
  ];

  return (
    <div className={`absolute bottom-4 right-4 z-[1000] ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/60' 
        : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200/60'
    } backdrop-blur-md rounded-2xl p-4 shadow-2xl border min-w-[260px] transition-colors duration-200`}>
      {/* Header with icon */}
      <div className={`flex items-center mb-3 pb-2 border-b ${
        theme === 'dark' ? 'border-gray-700/50' : 'border-slate-200/50'
      }`}>
        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-2 shadow-sm">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
          </svg>
        </div>
        <h3 className={`text-sm font-bold tracking-tight ${
          theme === 'dark' ? 'text-gray-100' : 'text-slate-800'
        }`}>Road Status Legend</h3>
      </div>
      
      {/* Legend items */}
      <div className="space-y-2">
        {legendItems.map((item, index) => (
          <div 
            key={index} 
            className={`flex items-center p-2 rounded-lg transition-all duration-200 hover:shadow-md ${item.bgColor} ${item.borderColor} border hover:scale-[1.02]`}
          >
            <div className={`flex items-center justify-center w-6 h-6 rounded-full shadow-sm mr-2 ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-white'
            }`}>
              <span 
                className="text-lg font-bold drop-shadow-sm"
                style={{ color: item.color }}
              >
                {item.icon}
              </span>
            </div>
            <span className={`text-xs font-medium leading-relaxed ${
              theme === 'dark' ? 'text-gray-200' : 'text-slate-700'
            }`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      
      {/* Footer note */}
      <div className={`mt-3 pt-2 border-t ${
        theme === 'dark' ? 'border-gray-700/50' : 'border-slate-200/50'
      }`}>
        <p className={`text-xs text-center font-medium ${
          theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
        }`}>
          Real-time road conditions
        </p>
      </div>
    </div>
  );
};