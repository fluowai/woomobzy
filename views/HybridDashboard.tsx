import React from 'react';
import UrbanDashboard from './UrbanDashboard';
import RuralDashboard from './RuralDashboard';

const HybridDashboard: React.FC = () => {
  return (
    <div className="space-y-12">
      <UrbanDashboard />
      <div className="w-full h-px bg-slate-200" />
      <RuralDashboard />
    </div>
  );
};

export default HybridDashboard;
