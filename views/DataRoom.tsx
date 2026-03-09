
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  Lock,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../services/supabase';

interface Document {
  id: string;
  type: string;
  name: string;
  status: 'valid' | 'warning' | 'expired' | 'pending';
  expiryDate?: string;
  documentUrl?: string;
  observations?: string;
}

const DataRoom: React.FC = () => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    // Simulated load - will connect to due_diligence_items table
    setTimeout(() => {
      setDocuments([
        { id: '1', type: 'CAR', name: 'Cadastro Ambiental Rural', status: 'valid', expiryDate: '2025-12-31' },
        { id: '2', type: 'SIGEF', name: 'Georreferenciamento de Imóvel Rural', status: 'valid' },
        { id: '3', type: 'ITR', name: 'Imposto Territorial Rural', status: 'warning', expiryDate: '2024-09-30', observations: 'Necessário pagamento da última parcela.' },
        { id: '4', type: 'CCIR', name: 'Certificado de Cadastro de Imóvel Rural', status: 'expired', expiryDate: '2023-12-31' },
        { id: '5', type: 'MATRICULA', name: 'Matrícula Atualizada (30 dias)', status: 'pending' },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'valid': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'warning': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'expired': return 'text-rose-500 bg-rose-50 border-rose-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'valid': return <CheckCircle size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'expired': return <AlertTriangle size={18} />;
      default: return <Clock size={18} />;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Lock size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Acesso Restrito - VIP Data Room</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            Due Diligence <br/> <span style={{ color: settings.primaryColor }}>Técnica & Jurídica</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
              ))}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">3 Usuários com Acesso</span>
          </div>
          <button 
            className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-black transition-all"
          >
            <ShieldCheck size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900">Documentação Obrigatória</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    type="text" 
                    placeholder="Filtrar docs..." 
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 outline-none text-xs font-bold"
                  />
                </div>
                <button className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-50">
              {documents.map((doc) => (
                <div key={doc.id} className="py-6 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl border transition-all ${getStatusColor(doc.status)}`}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-sm uppercase">{doc.name}</h4>
                        <span className="text-[10px] font-bold text-slate-300">[{doc.type}]</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${getStatusColor(doc.status).split(' ')[0]}`}>
                          {getStatusIcon(doc.status)}
                          {doc.status === 'valid' ? 'Documento Válido' : doc.status === 'expired' ? 'Documento Expirado' : doc.status === 'warning' ? 'Atenção Necessária' : 'Em Análise'}
                        </div>
                        {doc.expiryDate && (
                          <span className="text-[10px] font-medium text-slate-400">Vencimento: {new Date(doc.expiryDate).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                      <Eye size={18} />
                    </button>
                    <button className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                      <Download size={18} />
                    </button>
                    <button className="p-3 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-slate-900 transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck size={120} />
             </div>
             <div className="relative z-10">
                <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4">Status da Auditoria</h3>
                <div className="space-y-6 mt-8">
                   <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Conformidade Geral</span>
                        <span className="text-xl font-black italic">85%</span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: '85%' }}></div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                         <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Dossiê Técnico</p>
                         <p className="text-sm font-black text-emerald-400">APROVADO</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                         <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Ambiental (CAR)</p>
                         <p className="text-sm font-black text-emerald-400">OK</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                         <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Fundiário (Geo)</p>
                         <p className="text-sm font-black text-amber-400">PENDENTE</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                         <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Certidão Ônus</p>
                         <p className="text-sm font-black text-rose-400">EXPIRADO</p>
                      </div>
                   </div>
                </div>

                <button 
                  className="w-full mt-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg"
                >
                   Gerar Dossiê Completo (PDF)
                </button>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
             <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
                <ExternalLink size={14} className="text-indigo-600" /> Canais Oficiais
             </h4>
             <div className="space-y-4">
                {[
                  { name: 'Portal SICAR', url: 'https://www.car.gov.br' },
                  { name: 'Incra / SIGEF', url: 'https://sigef.incra.gov.br' },
                  { name: 'Portal SNCR', url: 'https://sncr.incra.gov.br' },
                ].map(portal => (
                  <a 
                    key={portal.name}
                    href={portal.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                  >
                    <span className="text-xs font-bold text-slate-600">{portal.name}</span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </a>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataRoom;
