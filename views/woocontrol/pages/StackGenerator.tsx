import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, Download } from 'lucide-react';

export const StackGenerator = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Stack Generator</h2>
          <p className="text-sm text-[#9097A5] mt-1">Generate dynamic docker-compose.yml configurations securely.</p>
        </div>
      </div>
      
      <div className="p-6 rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Product</label>
              <select className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none">
                <option>IMOBZY Core</option>
                <option>AGROZY</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Version</label>
              <select className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none">
                <option>v4.8.0</option>
                <option>v4.7.5</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">Target Domain</label>
              <input type="text" placeholder="crm.example.com" className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9097A5]">License Key</label>
              <input type="text" placeholder="LIC-XXXX-XXXX" className="w-full p-2.5 rounded-lg bg-[#161A23] border border-[#252A35] text-white outline-none" />
            </div>
          </div>
          
          <div className="space-y-3 pt-4 border-t border-[#252A35]">
            <p className="text-sm font-medium text-[#9097A5]">Features</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" defaultChecked className="accent-[#d4af37]" /> Redis Cache</label>
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" defaultChecked className="accent-[#d4af37]" /> WhatsApp Worker</label>
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" defaultChecked className="accent-[#d4af37]" /> Traefik Edge</label>
            </div>
          </div>

          <button type="button" className="w-full py-3 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors flex items-center justify-center gap-2">
            <Wand2 size={18} /> Generate Stack
          </button>
        </form>
      </div>
    </div>
  );
};
