import React, { useState } from 'react';
import RuralDashboard from './RuralDashboard';
import UrbanDashboard from './UrbanDashboard';
import MegaAdminDashboard from './megaadmin/Dashboard';

const HybridDashboard: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'rural' | 'urban' | 'megaadmin'>('rural');

  return (
    <div className="space-y-6">
      {activeMode === 'rural' && <RuralDashboard />}
      {activeMode === 'urban' && <UrbanDashboard />}
      {activeMode === 'megaadmin' && <MegaAdminDashboard />}
    </div>
  );
};

export default HybridDashboard;
