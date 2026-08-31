import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, KeyRound, Lock } from 'lucide-react';

export const Security = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Segurança & Criptografia</h2>
          <p className="text-sm text-[#9097A5] mt-1">Políticas globais de segurança e gerenciamento de chaves.</p>
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
            <h3 className="text-lg font-semibold text-white">Chaves Ed25519</h3>
          </div>
          <p className="text-sm text-[#9097A5]">Par de chaves ativo usado para assinar manifestos de licença.</p>
          <div className="p-3 rounded bg-[#161A23] border border-[#252A35]">
            <p className="text-xs font-mono text-[#9097A5] break-all">CHAVE_PÚBLICA: (gerenciada pelo servidor)</p>
          </div>
          <button className="self-start text-sm text-[#d4af37] hover:underline">Rotacionar Chaves</button>
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
            <h3 className="text-lg font-semibold text-white">Políticas de Banco de Dados</h3>
          </div>
          <p className="text-sm text-[#9097A5]">Segurança em nível de linha (RLS) e aplicação de administrador de plataforma ativas.</p>
          <button className="self-start px-4 py-2 mt-auto rounded bg-[#161A23] border border-[#252A35] text-sm text-white hover:bg-[#252A35] transition-colors">
            Executar Auditoria de Segurança
          </button>
        </motion.div>
      </div>
    </div>
  );
};
