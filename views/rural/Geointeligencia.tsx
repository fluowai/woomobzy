import React from 'react';
import { Map, Layers, Eye, Download } from 'lucide-react';

const Geointeligencia: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Geointeligência</h1>
      <p className="text-black/60 font-medium">Camadas WMS/WFS, sobreposição ambiental e análise territorial.</p>
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ height: '500px' }}>
      <div className="h-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Map className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-lg font-bold text-slate-500 mb-2">Mapa de Geointeligência</h3>
          <p className="text-sm text-slate-400">Integração com camadas WMS/WFS em desenvolvimento</p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { icon: Layers, label: 'Camadas Disponíveis', desc: 'SIGEF, CAR, IBAMA, INCRA' },
        { icon: Eye, label: 'Histórico de Uso', desc: 'Análise temporal do solo' },
        { icon: Download, label: 'Exportar Mapa', desc: 'PDF técnico com legendas' },
      ].map((item, idx) => (
        <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all cursor-pointer">
          <item.icon className="text-emerald-600 mb-3" size={28} />
          <h3 className="font-bold text-black mb-1">{item.label}</h3>
          <p className="text-sm text-slate-400">{item.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

export default Geointeligencia;
