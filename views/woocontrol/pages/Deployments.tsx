import React from 'react';
import { motion } from 'framer-motion';
import { Server } from 'lucide-react';

const mockDeployments = [
  { id: 'DEP-101', target: 'AWS sa-east-1', status: 'HEALTHY', lastPing: '2m ago' },
  { id: 'DEP-102', target: 'DigitalOcean NYC', status: 'DEGRADED', lastPing: '5m ago' },
  { id: 'DEP-103', target: 'On-Premise (Local)', status: 'OFFLINE', lastPing: '3d ago' },
];

export const Deployments = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Deployments</h2>
          <p className="text-sm text-[#9097A5] mt-1">Monitor active software instances across infrastructure.</p>
        </div>
      </div>
      
      <div className="grid gap-4">
        {mockDeployments.map((d, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={d.id} 
            className="p-4 rounded-xl border flex items-center justify-between"
            style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
          >
            <div className="flex items-center gap-4">
              <Server size={20} className="text-[#9097A5]" />
              <div>
                <p className="text-sm font-medium text-white">{d.id}</p>
                <p className="text-xs text-[#9097A5]">{d.target}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-xs font-bold ${d.status === 'HEALTHY' ? 'text-emerald-500' : d.status === 'DEGRADED' ? 'text-amber-500' : 'text-red-500'}`}>
                {d.status}
              </span>
              <span className="text-xs text-[#9097A5]">Ping: {d.lastPing}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
