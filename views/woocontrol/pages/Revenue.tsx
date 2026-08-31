import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';

export const Revenue = () => {
  const kpis = [
    { title: 'MRR Global', value: 'R$ —' },
    { title: 'Pagamentos Pendentes', value: 'R$ —' },
    { title: 'Faturamento Pago (30d)', value: 'R$ —' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Painel de Receita</h2>
          <p className="text-sm text-[#9097A5] mt-1">Análises financeiras, repasses e detalhamento de MRR.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((k, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={k.title} 
            className="p-6 rounded-xl border flex flex-col gap-2"
            style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#9097A5]">{k.title}</span>
              <DollarSign size={16} className="text-[#d4af37]" />
            </div>
            <h3 className="text-2xl font-bold text-white">{k.value}</h3>
          </motion.div>
        ))}
      </div>
      
      <div className="p-6 rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
        <h3 className="text-lg font-semibold text-white mb-4">Linha do Tempo de Repasses</h3>
        <div className="h-48 flex items-center justify-center border border-dashed border-[#252A35] rounded-lg">
          <span className="text-[#9097A5] text-sm">A visualização do gráfico de receita será renderizada aqui</span>
        </div>
      </div>
    </div>
  );
};
