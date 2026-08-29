import React from 'react';
import { motion } from 'framer-motion';
import { Key, ShieldAlert } from 'lucide-react';

const mockLicenses = [
  { id: 'LIC-9A82', domain: 'crm.alpha.com.br', product: 'IMOBZY Core', lease: '72h', status: 'ACTIVE' },
  { id: 'LIC-1B3C', domain: 'fazendas.agro.com', product: 'AGROZY', lease: '24h', status: 'GRACE_PERIOD' },
  { id: 'LIC-8X99', domain: 'test.local', product: 'Fluowai AI', lease: '0h', status: 'REVOKED' },
];

export const Licensing = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Licensing Engine</h2>
          <p className="text-sm text-[#9097A5] mt-1">Cryptographic leases and domain entitlements.</p>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#252A35] bg-[#161A23]">
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">License ID</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Domain</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Product</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Lease Left</th>
              <th className="p-4 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockLicenses.map((l, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={l.id} 
                className="border-b border-[#252A35] hover:bg-[#161A23]/50 transition-colors"
              >
                <td className="p-4 font-mono text-sm text-white">{l.id}</td>
                <td className="p-4 text-sm text-[#9097A5]">{l.domain}</td>
                <td className="p-4 text-sm text-white">{l.product}</td>
                <td className="p-4 text-sm font-mono text-[#d4af37]">{l.lease}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    l.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' :
                    l.status === 'GRACE_PERIOD' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {l.status}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
