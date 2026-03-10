import React from 'react';
import { Key, DollarSign, AlertTriangle, FileText } from 'lucide-react';

const Locacao: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Locação & Administração</h1>
      <p className="text-black/60 font-medium">Contratos ativos, reajustes, inadimplência e boletos.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[
        { icon: Key, label: 'Contratos Ativos', value: '0', color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: DollarSign, label: 'Receita Mensal', value: 'R$ 0', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { icon: AlertTriangle, label: 'Inadimplentes', value: '0', color: 'text-red-600', bg: 'bg-red-50' },
        { icon: FileText, label: 'Reajustes Pendentes', value: '0', color: 'text-amber-600', bg: 'bg-amber-50' },
      ].map((stat, idx) => (
        <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}><stat.icon size={24} /></div>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
          <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
      <Key className="mx-auto text-slate-300 mb-4" size={48} />
      <h3 className="text-lg font-bold text-slate-600 mb-2">Nenhum Contrato de Locação</h3>
      <p className="text-sm text-slate-400 mb-4">Gerencie contratos, reajustes automáticos e inadimplência</p>
      <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all">Novo Contrato</button>
    </div>
  </div>
);

export default Locacao;
