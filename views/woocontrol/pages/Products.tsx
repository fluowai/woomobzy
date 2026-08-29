import React from 'react';
import { motion } from 'framer-motion';
import { Package, Plus } from 'lucide-react';

const mockProducts = [
  { id: 1, name: 'IMOBZY Core', version: 'v4.8.0', type: 'SaaS', status: 'PRODUCTION' },
  { id: 2, name: 'AGROZY', version: 'v2.1.0', type: 'SaaS', status: 'PRODUCTION' },
  { id: 3, name: 'Fluowai AI Agent', version: 'v1.5.2', type: 'Microservice', status: 'BETA' },
];

export const Products = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Product Catalog</h2>
          <p className="text-sm text-[#9097A5] mt-1">Manage deployable software modules and microservices.</p>
        </div>
        <button className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors flex items-center gap-2">
          <Plus size={18} /> New Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProducts.map((p, i) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={p.id} 
            className="p-6 rounded-xl border flex flex-col gap-4"
            style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
          >
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#161A23] to-[#252A35] border border-[#252A35] flex items-center justify-center shadow-lg">
                <Package size={24} className="text-[#d4af37]" />
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-[#161A23] border border-[#252A35] text-[#9097A5]">
                {p.type}
              </span>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white">{p.name}</h3>
              <p className="text-sm text-[#9097A5] mt-1">Current Version: <span className="text-white font-mono">{p.version}</span></p>
            </div>

            <div className="mt-4 pt-4 border-t border-[#252A35] flex items-center justify-between">
              <span className={`text-xs font-semibold ${p.status === 'PRODUCTION' ? 'text-emerald-500' : 'text-amber-500'}`}>
                ● {p.status}
              </span>
              <button className="text-sm text-[#d4af37] hover:underline">Manage</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
