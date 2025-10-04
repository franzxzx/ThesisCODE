import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

export const MapLegend: React.FC = () => {
  const { theme } = useTheme();
  
  // Load persistent settings from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('mapLegend_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isVisible, setIsVisible] = useState(() => {
    const saved = localStorage.getItem('mapLegend_visible');
    return saved ? JSON.parse(saved) : true; // Default: always show
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('mapLegend_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem('mapLegend_visible', JSON.stringify(isVisible));
  }, [isVisible]);

  // If legend is hidden, show only the visibility toggle button
  if (!isVisible) {
    return (
      <div className="absolute bottom-4 right-4 z-[1050]">
        <button
          onClick={() => setIsVisible(true)}
          className={`p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-100 border border-gray-700' 
              : 'bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 border border-gray-200'
          }`}
          title="Show road status legend"
          aria-label="Show road status legend"
        >
          <Eye className="w-5 h-5" />
        </button>
        
        {/* Floating tooltip for better visibility */}
        <div className={`absolute bottom-full right-0 mb-2 px-3 py-2 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap transition-opacity duration-200 ${
          theme === 'dark' 
            ? 'bg-gray-700 text-gray-200 border border-gray-600' 
            : 'bg-gray-800 text-white border border-gray-300'
        } opacity-0 hover:opacity-100 pointer-events-none`}>
          Click to show road status legend
          <div className={`absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
            theme === 'dark' ? 'border-t-gray-700' : 'border-t-gray-800'
          }`}></div>
        </div>
      </div>
    );
  }
  
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
    <div className={`absolute bottom-4 right-4 z-[1050] ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/60' 
        : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200/60'
    } backdrop-blur-md rounded-2xl shadow-2xl border transition-all duration-300 ${
      isCollapsed ? 'min-w-[200px] max-w-[240px]' : 'min-w-[260px] max-w-[320px]'
    } sm:min-w-[280px] sm:max-w-[340px]`}>
      
      {/* Header with toggle button */}
      <div className={`flex items-center justify-between p-4 ${
        isCollapsed ? 'pb-4' : 'pb-2'
      } ${!isCollapsed ? `border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-slate-200/50'}` : ''}`}>
        <div className="flex items-center">
          <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-2 shadow-sm">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
            </svg>
          </div>
          <h3 className={`text-sm font-bold tracking-tight ${
            theme === 'dark' ? 'text-gray-100' : 'text-slate-800'
          }`}>Road Status Legend</h3>
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center space-x-1">
          {/* Hide legend button */}
          <button
            onClick={() => setIsVisible(false)}
            className={`p-1 rounded-lg transition-colors duration-200 ${
              theme === 'dark' 
                ? 'hover:bg-gray-700 text-gray-300 hover:text-gray-100' 
                : 'hover:bg-slate-200 text-slate-600 hover:text-slate-800'
            }`}
            title="Hide legend (will show toggle button)"
            aria-label="Hide legend"
          >
            <EyeOff className="w-4 h-4" />
          </button>
          
          {/* Collapse/expand toggle button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-lg transition-colors duration-200 ${
              theme === 'dark' 
                ? 'hover:bg-gray-700 text-gray-300 hover:text-gray-100' 
                : 'hover:bg-slate-200 text-slate-600 hover:text-slate-800'
            }`}
            title={isCollapsed ? 'Expand legend to show details' : 'Collapse legend to save space'}
            aria-label={isCollapsed ? 'Expand legend' : 'Collapse legend'}
          >
            {isCollapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* Collapsible content */}
      <div className={`transition-all duration-300 overflow-hidden ${
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
      }`}>
        {/* Legend items */}
        <div className="px-4 pb-2 space-y-2">
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
        <div className={`mx-4 mb-4 pt-2 border-t ${
          theme === 'dark' ? 'border-gray-700/50' : 'border-slate-200/50'
        }`}>
          <p className={`text-xs text-center font-medium ${
            theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
          }`}>
            Real-time road conditions • Always visible
          </p>
          <p className={`text-xs text-center mt-1 ${
            theme === 'dark' ? 'text-gray-500' : 'text-slate-400'
          }`}>
            Use controls above to hide or collapse
          </p>
        </div>
      </div>
      
      {/* Collapsed state indicator */}
      {isCollapsed && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center space-x-1">
            {legendItems.map((item, index) => (
              <div 
                key={index}
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: item.color }}
                title={item.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};