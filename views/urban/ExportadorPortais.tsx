import React from 'react';
import { Upload, RefreshCw, CheckCircle, Globe } from 'lucide-react';

const ExportadorPortais: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Exportador para Portais</h1>
      <p className="text-black/60 font-medium">Feed XML automático para ZAP Imóveis, Viva Real, OLX e outros portais.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[
        { icon: Globe, label: 'Portais Conectados', value: '0', color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: Upload, label: 'Imóveis Exportados', value: '0', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { icon: RefreshCw, label: 'Última Sincronização', value: '—', color: 'text-amber-600', bg: 'bg-amber-50' },
        { icon: CheckCircle, label: 'Taxa de Sucesso', value: '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      ].map((stat, idx) => (
        <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}><stat.icon size={24} /></div>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
          <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
      <Upload className="mx-auto text-slate-300 mb-4" size={48} />
      <h3 className="text-lg font-bold text-slate-600 mb-2">Configure Seus Portais</h3>
      <p className="text-sm text-slate-400 mb-4">Conecte seu feed XML aos portais imobiliários</p>
      <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all">Conectar Portal</button>
    </div>
  </div>
);

export default ExportadorPortais;
