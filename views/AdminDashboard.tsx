import React from 'react';
import { useAuth } from '../context/AuthContext';
import RuralDashboard from './RuralDashboard';
import UrbanDashboard from './UrbanDashboard';
import HybridDashboard from './HybridDashboard';

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  
  // Default to traditional (Urban) if not specified
  const niche = profile?.organization?.niche || 'traditional';

  if (niche === 'rural') {
    return <RuralDashboard />;
  }
  
  if (niche === 'hybrid') {
    return <HybridDashboard />;
  }

  // Default Traditional/Urban
  return <UrbanDashboard />;
};

export default AdminDashboard;
