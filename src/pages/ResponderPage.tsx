import React, { useState } from 'react';
import { MapContainer } from '../components/MapContainer';
import { MapLegend } from '../components/MapLegend';
import { Navigation } from '../components/Navigation';
import { useUser } from '../hooks/useUser';
import { useRealTimeRoadStatus } from '../hooks/useRealTimeRoadStatus';

export const ResponderPage: React.FC = () => {
  const { logout, canUseRouting } = useUser();
  const [routingEnabled, setRoutingEnabled] = useState(false); // Changed from canUseRouting to false
  const [tallVehicleRouting, setTallVehicleRouting] = useState(false);
  const { roadStatusUpdates, loading, error, refreshRoadStatus } = useRealTimeRoadStatus();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation
        isAuthenticated={true}
        onLogoutClick={logout}
      />
      
      {/* Map area - Responsive layout with proper spacing for mobile */}
      <div className="absolute top-16 sm:top-20 left-2 sm:left-4 right-2 sm:right-4 bottom-2 sm:bottom-4 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg overflow-hidden">
        <MapContainer 
          editable={false} 
          routingEnabled={routingEnabled && canUseRouting}
          tallVehicleRouting={tallVehicleRouting}
          onRoutingToggle={setRoutingEnabled}
        />
        <MapLegend />
      </div>

      {/* Responder controls - Responsive positioning and sizing */}
      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div className="absolute left-3 sm:left-6 bottom-20 sm:bottom-24 flex flex-col space-y-2 sm:space-y-3 pointer-events-auto">
          {canUseRouting ? (
            <>
              {/* Tall Vehicle Routing Button */}
              {routingEnabled && (
                <button
                  onClick={() => setTallVehicleRouting(!tallVehicleRouting)}
                  className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg font-semibold shadow-lg transition-all duration-200 ${
                    tallVehicleRouting 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-gray-400 hover:bg-gray-500 text-white'
                  }`}
                >
                  {tallVehicleRouting ? 'Tall Vehicle: ON' : 'tallVehicleRouting'}
                </button>
              )}
              
              {/* Enable Routing Toggle Button */}
              <button
                onClick={() => setRoutingEnabled(!routingEnabled)}
                className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg font-semibold shadow-lg transition-all duration-200 ${
                  routingEnabled 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                {routingEnabled ? '✅ Routing Enabled' : '🚗 Enable Routing'}
              </button>
            </>
          ) : (
            <div className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-500 text-white rounded-lg font-semibold shadow-lg">
              ❌ Routing Access Denied
            </div>
          )}
        </div>
      </div>
    </div>
  );
};