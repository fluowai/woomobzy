import React from 'react';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';

const mockReleases = [
  { version: 'v4.8.0', date: '2026-08-29', type: 'MAJOR', status: 'STABLE' },
  { version: 'v4.7.5', date: '2026-08-15', type: 'PATCH', status: 'STABLE' },
  { version: 'v5.0.0-beta', date: '2026-08-30', type: 'MAJOR', status: 'BETA' },
];

export const Releases = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Releases & Patches</h2>
          <p className="text-sm text-[#9097A5] mt-1">Manage version availability for the network.</p>
        </div>
        <button className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors">
          Publish Release
        </button>
      </div>
      
      <div className="grid gap-4">
        {mockReleases.map((r, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={r.version} 
            className="p-4 rounded-xl border flex items-center justify-between"
            style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
          >
            <div className="flex items-center gap-4">
              <Rocket size={20} className={r.status === 'STABLE' ? 'text-emerald-500' : 'text-amber-500'} />
              <div>
                <p className="text-sm font-medium text-white">{r.version}</p>
                <p className="text-xs text-[#9097A5]">Released on {r.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 text-xs rounded bg-[#161A23] border border-[#252A35] text-[#9097A5]">{r.type}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
