import React from 'react';
import { ClipboardCheck, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const ComplianceUrbano: React.FC = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Compliance Urbano</h1>
      <p className="text-black/60 font-medium">Matrícula, IPTU, Habite-se, Zoneamento e documentação.</p>
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-8">
      <h3 className="text-lg font-bold text-black mb-6">Documentação Obrigatória</h3>
      <div className="space-y-3">
        {[
          { name: 'Matrícula Atualizada', status: 'pending' },
          { name: 'IPTU em dia', status: 'pending' },
          { name: 'Habite-se', status: 'pending' },
          { name: 'Zoneamento Verificado', status: 'pending' },
          { name: 'Licenças / Alvarás', status: 'pending' },
          { name: 'Documentação do Proprietário', status: 'pending' },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-200" />
            </div>
            <span className="text-sm font-medium text-slate-600">{item.name}</span>
            <span className="ml-auto text-[10px] font-bold text-amber-500 uppercase tracking-widest">Pendente</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ComplianceUrbano;
