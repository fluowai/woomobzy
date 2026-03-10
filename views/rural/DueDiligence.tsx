import React from 'react';
import { ShieldCheck, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

const DueDiligence: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Due Diligence Rural</h1>
      <p className="text-black/60 font-medium">Checklists fundiários e ambientais, semáforo documental e score de risco.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { icon: CheckCircle, label: 'Documentos Aprovados', value: '0', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { icon: AlertTriangle, label: 'Pendências', value: '0', color: 'text-amber-600', bg: 'bg-amber-50' },
        { icon: ShieldCheck, label: 'Score Médio', value: '—', color: 'text-blue-600', bg: 'bg-blue-50' },
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
    <div className="bg-white rounded-2xl border border-slate-200 p-8">
      <h3 className="text-lg font-bold text-black mb-6">Checklist Fundiário</h3>
      <div className="space-y-3">
        {['Matrícula Atualizada', 'Certidão de Ônus', 'GEO/CAR Regularizado', 'ITR em dia', 'CCIR Válido', 'Reserva Legal Averbada'].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-200" />
            </div>
            <span className="text-sm font-medium text-slate-600">{item}</span>
            <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendente</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default DueDiligence;
