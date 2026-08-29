import React from 'react';
import { motion } from 'framer-motion';
import { Command } from 'lucide-react';

const mockLogs = [
  { id: 'AL-001', action: 'SNAPSHOT_GENERATED', target: 'snap_4f92a1', user: 'fluowai@gmail.com', time: '10 mins ago' },
  { id: 'AL-002', action: 'LICENSE_ISSUED', target: 'LIC-9A82', user: 'system', time: '1 hour ago' },
  { id: 'AL-003', action: 'RESELLER_CREATED', target: 'Grupo Alpha', user: 'fluowai@gmail.com', time: '2 hours ago' },
];

export const Audit = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Audit Logs</h2>
          <p className="text-sm text-[#9097A5] mt-1">Immutable ledger of platform-level events.</p>
        </div>
      </div>
      
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#252A35] bg-[#161A23]">
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Log ID</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Action</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Target</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Actor</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody>
            {mockLogs.map((log, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={log.id} 
                className="border-b border-[#252A35] hover:bg-[#161A23]/50 transition-colors"
              >
                <td className="p-4 text-sm text-[#9097A5] font-mono">{log.id}</td>
                <td className="p-4 text-sm text-white font-medium">{log.action}</td>
                <td className="p-4 text-sm text-[#d4af37]">{log.target}</td>
                <td className="p-4 text-sm text-[#9097A5]">{log.user}</td>
                <td className="p-4 text-sm text-[#9097A5]">{log.time}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
