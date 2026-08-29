import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, KeyRound, Lock } from 'lucide-react';

export const Security = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Security & Encryption</h2>
          <p className="text-sm text-[#9097A5] mt-1">Global security policies and key management.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border flex flex-col gap-4"
          style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
        >
          <div className="flex items-center gap-3">
            <KeyRound size={20} className="text-[#d4af37]" />
            <h3 className="text-lg font-semibold text-white">Ed25519 Keys</h3>
          </div>
          <p className="text-sm text-[#9097A5]">Active keypair used for signing license manifests.</p>
          <div className="p-3 rounded bg-[#161A23] border border-[#252A35]">
            <p className="text-xs font-mono text-[#9097A5] break-all">PUBLIC_KEY: a7x9b...f12z</p>
          </div>
          <button className="self-start text-sm text-[#d4af37] hover:underline">Rotate Keys</button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl border flex flex-col gap-4"
          style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
        >
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-white">Database Policies</h3>
          </div>
          <p className="text-sm text-[#9097A5]">Row Level Security (RLS) and Platform Admin enforcement is active.</p>
          <button className="self-start px-4 py-2 mt-auto rounded bg-[#161A23] border border-[#252A35] text-sm text-white hover:bg-[#252A35] transition-colors">
            Run Security Audit
          </button>
        </motion.div>
      </div>
    </div>
  );
};
