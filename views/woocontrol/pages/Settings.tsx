import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export const Settings = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Platform Settings</h2>
          <p className="text-sm text-[#9097A5] mt-1">Configure global platform behavior.</p>
        </div>
      </div>
      
      <div className="p-6 rounded-xl border flex items-center justify-center h-64" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
        <div className="text-center">
          <SettingsIcon size={32} className="text-[#9097A5] mx-auto mb-3" />
          <p className="text-white font-medium">Global Settings Engine</p>
          <p className="text-sm text-[#9097A5] mt-1">System flags and white-labeling overrides.</p>
        </div>
      </div>
    </div>
  );
};
