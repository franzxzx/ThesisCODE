import React, { useState } from 'react';
import { MapContainer } from '../components/MapContainer';
import { MapLegend } from '../components/MapLegend';
import { ConsolidateReportButton } from '../components/ConsolidateReportButton';
import { Navigation } from '../components/Navigation';
import UserManagement from '../components/UserManagement';
import { useUser } from '../hooks/useUser';

function AdminPage() {
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const { logout } = useUser();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation
        isAuthenticated={true}
        onLogoutClick={logout}
        onCreateAccountClick={() => setShowCreateAccount(true)}
      />
      {/* Map area - Updated to account for navbar height */}
      <div className="absolute top-20 left-4 right-4 bottom-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <MapContainer editable={true} routingEnabled={false} />
        <MapLegend />
      </div>

      {/* Fixed overlay container - Admin controls only */}
      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div className="absolute left-6 bottom-16 flex flex-col space-y-3 pointer-events-auto">
          {/* Consolidate Report button */}
          <ConsolidateReportButton />
        </div>
      </div>
      
      {/* Create Account Modal */}
      {showCreateAccount && (
        <UserManagement 
          isOpen={showCreateAccount}
          onClose={() => setShowCreateAccount(false)} 
        />
      )}
    </div>
  );
}

export default AdminPage;
