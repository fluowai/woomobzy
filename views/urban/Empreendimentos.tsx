import React from 'react';
import { Building2, Layers, BarChart3, Hammer } from 'lucide-react';

const Empreendimentos: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Empreendimentos</h1>
      <p className="text-black/60 font-medium">Cadastro de empreendimentos, unidades e controle de estoque.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[
        { icon: Building2, label: 'Empreendimentos', value: '0', color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: Layers, label: 'Unidades Totais', value: '0', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { icon: BarChart3, label: 'Disponíveis', value: '0', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { icon: Hammer, label: 'Em Obra (%)', value: '—', color: 'text-amber-600', bg: 'bg-amber-50' },
      ].map((stat, idx) => (
        <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}><stat.icon size={24} /></div>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
          <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
      <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
      <h3 className="text-lg font-bold text-slate-600 mb-2">Nenhum Empreendimento Cadastrado</h3>
      <p className="text-sm text-slate-400 mb-4">Cadastre lançamentos e controle o estoque de unidades</p>
      <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all">Novo Empreendimento</button>
    </div>
  </div>
);

export default Empreendimentos;
