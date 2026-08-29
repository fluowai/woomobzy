import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Download } from 'lucide-react';

const mockSnapshots = [
  { id: 'snap_4f92a1', date: '2026-08-28', product: 'IMOBZY Core v4.8', size: '42 MB' },
  { id: 'snap_8b11c3', date: '2026-08-27', product: 'AGROZY v2.1', size: '28 MB' },
];

export const Snapshots = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Code Snapshots</h2>
          <p className="text-sm text-[#9097A5] mt-1">Watermarked source code packages generated for clients.</p>
        </div>
      </div>
      
      <div className="grid gap-4">
        {mockSnapshots.map((s, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={s.id} 
            className="p-4 rounded-xl border flex items-center justify-between"
            style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
          >
            <div className="flex items-center gap-4">
              <Camera size={20} className="text-[#9097A5]" />
              <div>
                <p className="text-sm font-medium text-white">{s.id}</p>
                <p className="text-xs text-[#9097A5]">{s.product} • {s.date}</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#161A23] border border-[#252A35] text-xs text-[#9097A5] hover:text-white transition-colors">
              <Download size={14} /> Download
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
