import React from 'react';
import { motion } from 'framer-motion';
import { Headset, Eye } from 'lucide-react';

const mockTickets = [
  { id: 'TKT-9912', subject: 'Limite da API atingido', reseller: 'Grupo Alpha', priority: 'ALTA', status: 'ABERTO' },
  { id: 'TKT-9910', subject: 'Erro de sincronização de cobrança', reseller: 'AgroSoft', priority: 'MÉDIA', status: 'EM ANDAMENTO' },
];

export const Support = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Suporte Global</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gerencie tickets globais e realize impersonação de conta com segurança.</p>
        </div>
      </div>
      
      <div className="grid gap-4">
        {mockTickets.map((t, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={t.id} 
            className="p-4 rounded-xl border flex items-center justify-between"
            style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
          >
            <div className="flex items-center gap-4">
              <Headset size={20} className="text-[#9097A5]" />
              <div>
                <p className="text-sm font-medium text-white">{t.subject}</p>
                <p className="text-xs text-[#9097A5]">{t.id} • {t.reseller}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-xs rounded border border-[#252A35] ${t.priority === 'ALTA' ? 'text-red-500 bg-red-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                {t.priority}
              </span>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#161A23] border border-[#252A35] text-xs text-[#9097A5] hover:text-white transition-colors">
                <Eye size={14} /> Ver
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
