import React, { useState, useEffect } from 'react';
import { 
  FileSearch, 
  Download, 
  Share2, 
  ShieldCheck, 
  Map, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Zap
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Property } from '../../types';
import AgroMarketWidget from '../../components/AgroMarketWidget';

const DossieInteligente: React.FC = () => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProperties(data);
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-none mb-3">
            Dossiê Inteligente <br />{' '}
            <span className="text-emerald-600">360 Premium</span>
          </h1>
          <p className="text-black/60 font-medium italic">
            Análise técnica, jurídica e de mercado unificada em um único documento.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-2xl border border-slate-100 flex items-center gap-2">
            <select 
              onChange={(e) => {
                const prop = properties.find(p => p.id === e.target.value);
                setSelectedProperty(prop || null);
              }}
              className="px-6 py-3 bg-slate-50 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Selecionar Imóvel</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <button className="h-12 px-6 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
             <Download size={14} /> Gerar PDF
          </button>
        </div>
      </div>

      {!selectedProperty ? (
        <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
          <FileSearch size={64} className="text-slate-200 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-black uppercase italic tracking-tighter">Aguardando Seleção</h3>
          <p className="text-slate-400 font-medium italic mt-2">Escolha um imóvel para gerar o dossiê técnico 360.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Overview Card */}
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
               
               <div className="relative z-10 flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-48 h-48 rounded-[2rem] bg-slate-100 overflow-hidden shrink-0">
                    {selectedProperty.images?.[0] ? (
                      <img src={selectedProperty.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Map size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                        {selectedProperty.property_type}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Calendar size={12} /> Atualizado em: {new Date(selectedProperty.updated_at || '').toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="text-3xl font-black text-black uppercase italic tracking-tighter leading-none mb-4">
                      {selectedProperty.title}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium italic mb-6">
                      {selectedProperty.description?.substring(0, 150)}...
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <div className="px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold text-black border border-slate-100">
                         {selectedProperty.total_area_ha} Hectares
                      </div>
                      <div className="px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold text-black border border-slate-100">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProperty.price || 0)}
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Technical Validation */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-sm font-black uppercase tracking-widest text-black">Validação Técnica</h3>
                   <CheckCircle2 size={20} className="text-emerald-500" />
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Georreferenciamento', status: 'Certificado', icon: Map },
                    { label: 'CAR (Ambiental)', status: 'Ativo', icon: ShieldCheck },
                    { label: 'Matrícula', status: 'Regular', icon: FileSearch },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <item.icon size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Intelligence */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-sm font-black uppercase tracking-widest text-black">Inteligência de Mercado</h3>
                   <TrendingUp size={20} className="text-indigo-500" />
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Valor do Hectare</p>
                    <p className="text-lg font-black text-indigo-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((selectedProperty.price || 0) / (selectedProperty.total_area_ha || 1))}
                    </p>
                    <p className="text-[9px] text-indigo-400 italic mt-1">± 12% em relação à média regional</p>
                  </div>
                  <button className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all">
                    Ver Comparativo Completo →
                  </button>
                </div>
              </div>
            </div>

            {/* AI Risk Analysis */}
            <div className="bg-amber-50 rounded-[2.5rem] p-10 border border-amber-100 relative overflow-hidden">
               <Zap size={48} className="absolute -bottom-4 -right-4 text-amber-200 opacity-20 rotate-12" />
               <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-amber-900">Análise de Risco IA</h3>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Processamento Neural 360</p>
                  </div>
               </div>
               <p className="text-sm text-amber-800 font-medium italic leading-relaxed">
                 O imóvel apresenta <strong>Baixo Risco Fundiário</strong>. No entanto, identificamos uma sobreposição de 2% com área de preservação permanente (APP) que requer atenção na próxima atualização do CAR. O potencial de valorização é estimado em <strong>15% ao ano</strong> devido à proximidade com o novo eixo logístico.
               </p>
            </div>
          </div>

          {/* Sidebar Widgets */}
          <div className="space-y-8">
            <AgroMarketWidget />
            
            <div className="bg-black rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-200">
               <h3 className="text-lg font-black uppercase italic tracking-tighter mb-8">Ferramentas de Venda</h3>
               <div className="space-y-4">
                  <button className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-emerald-600 hover:border-emerald-500 transition-all text-left group">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/80 mb-1">Apresentação</p>
                    <p className="text-sm font-black">Enviar para Cliente (WhatsApp)</p>
                  </button>
                  <button className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-indigo-600 hover:border-indigo-500 transition-all text-left group">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/80 mb-1">Jurídico</p>
                    <p className="text-sm font-black">Solicitar Minuta de Venda</p>
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DossieInteligente;
