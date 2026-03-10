import React from 'react';
import { Map, Upload, Layers, AlertTriangle } from 'lucide-react';

const CadastroTecnico: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Cadastro Técnico Rural</h1>
      <p className="text-black/60 font-medium">Georreferenciamento, polígonos e dados técnicos das propriedades.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { icon: Map, label: 'Polígonos Cadastrados', value: '0', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { icon: Upload, label: 'Arquivos KML/KMZ', value: '0', color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: Layers, label: 'Camadas Ativas', value: '0', color: 'text-amber-600', bg: 'bg-amber-50' },
        { icon: AlertTriangle, label: 'Sobreposições', value: '0', color: 'text-red-600', bg: 'bg-red-50' },
      ].map((stat, idx) => (
        <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}>
            <stat.icon size={24} />
          </div>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</h3>
          <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</p>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
      <Upload className="mx-auto text-slate-300 mb-4" size={48} />
      <h3 className="text-lg font-bold text-slate-600 mb-2">Importe Arquivos Geográficos</h3>
      <p className="text-sm text-slate-400 mb-4">Arraste KML, KMZ, GeoJSON ou Shapefile aqui</p>
      <button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all">
        Selecionar Arquivos
      </button>
    </div>
  </div>
);

export default CadastroTecnico;
