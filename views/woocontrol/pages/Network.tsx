import React from 'react';
import { motion } from 'framer-motion';
import { Network as NetworkIcon, MoreVertical } from 'lucide-react';

const mockResellers = [
  { id: 1, name: 'Grupo Alpha', type: 'Master Reseller', licenses: 450, mrr: 'R$ 45,000', status: 'ACTIVE' },
  { id: 2, name: 'TechImob', type: 'Reseller', licenses: 120, mrr: 'R$ 12,000', status: 'ACTIVE' },
  { id: 3, name: 'AgroSoft BR', type: 'Master Reseller', licenses: 310, mrr: 'R$ 38,500', status: 'ACTIVE' },
];

export const Network = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Reseller Network</h2>
          <p className="text-sm text-[#9097A5] mt-1">Manage your master resellers and hierarchical distribution.</p>
        </div>
        <button className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors">
          Add Reseller
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#252A35] bg-[#161A23]">
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Organization</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Type</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Active Licenses</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">MRR</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {mockResellers.map((r, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={r.id} 
                className="border-b border-[#252A35] hover:bg-[#161A23]/50 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#161A23] border border-[#252A35] flex items-center justify-center">
                      <NetworkIcon size={14} className="text-[#d4af37]" />
                    </div>
                    <span className="font-medium text-white">{r.name}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-[#9097A5]">{r.type}</td>
                <td className="p-4 text-sm text-white">{r.licenses}</td>
                <td className="p-4 text-sm text-emerald-400 font-medium">{r.mrr}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-500">
                    {r.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-[#9097A5] hover:text-white"><MoreVertical size={18}/></button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
