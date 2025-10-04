import React from 'react';
import { MapContainer } from '../components/MapContainer';
import { MapLegend } from '../components/MapLegend';
import { LoginModal } from '../components/LoginModal';
import { Navigation } from '../components/Navigation';

export const PublicMapPage: React.FC = () => {
  const [isLoginOpen, setIsLoginOpen] = React.useState(false);

  return (
    <div className="relative w-full h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* navbar*/}
      <Navigation
        isAuthenticated={false}
        onLoginClick={() => setIsLoginOpen(true)}
      />

      {/* map area like admin page */}
      <div
        className={`absolute inset-12 top-28 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden h-[calc(100vh-6rem)] transition-all duration-300 ${
          isLoginOpen ? 'blur-sm pointer-events-none' : ''
        }`}
      >
        <MapContainer editable={false} routingEnabled={false} />
        <MapLegend />
      </div>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};
