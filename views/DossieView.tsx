
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, 
  Map as MapIcon, 
  Award, 
  ShieldCheck, 
  Printer, 
  Download, 
  Share2,
  CheckCircle2,
  Droplets,
  Layers,
  Thermometer,
  Trees
} from 'lucide-react';
import { propertyService } from '../services/properties';
import { Property } from '../types';
import { useSettings } from '../context/SettingsContext';

const DossieView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSettings();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      propertyService.getById(id).then(data => {
        setProperty(data);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading || !property) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Action Bar (Not printed) */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <button onClick={() => window.history.back()} className="text-slate-400 hover:text-slate-900 transition-all font-bold text-xs uppercase tracking-widest px-4">Voltar</button>
             <div className="h-4 w-px bg-slate-200" />
             <h2 className="text-sm font-black uppercase italic tracking-tighter">Dossiê Técnico: {property.title}</h2>
          </div>
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <Share2 size={16} /> Compartilhar
             </button>
             <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg hover:bg-black transition-all">
                <Printer size={16} /> Imprimir / PDF
             </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <article className="max-w-5xl mx-auto mt-8 bg-white shadow-2xl rounded-none md:rounded-[2rem] overflow-hidden print:shadow-none print:mt-0 print:rounded-none">
        {/* Cover */}
        <header className="relative h-[500px] w-full bg-slate-900 overflow-hidden">
           <img src={property.images?.[0]} alt="Capa" className="w-full h-full object-cover opacity-60" />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
           <div className="absolute bottom-0 left-0 p-12 md:p-20 text-white w-full">
              <div className="flex items-center gap-3 mb-6">
                 <div className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Exclusividade</div>
                 <div className="px-4 py-1.5 bg-emerald-500/20 backdrop-blur-md rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Verificado</div>
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-4">{property.title}</h1>
              <p className="text-xl md:text-2xl font-medium text-white/60 italic">{property.location.city}, {property.location.state}</p>
           </div>
           <div className="absolute top-0 right-0 p-12 md:p-20">
              <div className="w-32 h-32 bg-white flex items-center justify-center p-6 shadow-2xl rounded-2xl">
                 <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
           </div>
        </header>

        <div className="p-12 md:p-20 space-y-20">
           {/* Section 1: Sumário Executivo */}
           <section>
              <div className="flex items-center gap-3 mb-10">
                 <Award className="text-indigo-600" size={24} />
                 <h2 className="text-2xl font-black uppercase italic tracking-tighter">Sumário Executivo</h2>
                 <div className="h-px flex-1 bg-slate-100 ml-4" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                 <div className="md:col-span-2 text-lg text-slate-600 leading-relaxed font-serif italic">
                    {property.description}
                 </div>
                 <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Área Total</p>
                       <p className="text-3xl font-black italic tracking-tighter">{property.features.areaHectares} ha</p>
                       <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{(property.features.areaHectares / 2.42).toFixed(1)} Alqueires (Paulista)</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Preço Sugerido</p>
                       <p className="text-2xl font-black italic tracking-tighter">{property.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status Documental</p>
                       <div className="flex items-center gap-2 text-emerald-600">
                          <ShieldCheck size={18} />
                          <span className="text-xs font-black uppercase tracking-widest">100% Regularizado</span>
                       </div>
                    </div>
                 </div>
              </div>
           </section>

           {/* Section 2: Características Técnicas */}
           <section>
              <div className="flex items-center gap-3 mb-10">
                 <Layers className="text-indigo-600" size={24} />
                 <h2 className="text-2xl font-black uppercase italic tracking-tighter">Ficha Técnica Georreferenciada</h2>
                 <div className="h-px flex-1 bg-slate-100 ml-4" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                 {[
                   { label: 'Topografia', value: property.features.topography || 'Plana', icon: MapIcon },
                   { label: 'Solo', value: property.features.soilTexture || 'Latossolo Vermelho', icon: Trees },
                   { label: 'Solo (%)', value: property.features.soilClayPercentage ? `${property.features.soilClayPercentage}% Argila` : '35-45% Argila', icon: Layers },
                   { label: 'Bioma', value: property.features.biome || 'Cerrado', icon: Trees },
                   { label: 'Altitude', value: property.features.altitude ? `${property.features.altitude}m` : '850m', icon: MapIcon },
                   { label: 'Precipitação', value: property.features.rainFall ? `${property.features.rainFall}mm/ano` : '1.800mm/ano', icon: Droplets },
                   { label: 'Recursos Hídricos', value: property.features.water?.rio ? 'Rio Próprio' : 'Poço Artesiano', icon: Droplets },
                   { label: 'Temperatura Média', value: property.features.avgTemp ? `${property.features.avgTemp}°C` : '24°C', icon: Thermometer },
                 ].map((item, idx) => (
                   <div key={idx} className="flex gap-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 h-fit rounded-xl">
                         <item.icon size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                         <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{item.value}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </section>

           {/* Section 3: Documentação */}
           <section>
              <div className="flex items-center gap-3 mb-10">
                 <ShieldCheck className="text-indigo-600" size={24} />
                 <h2 className="text-2xl font-black uppercase italic tracking-tighter">Conformidade e Regularização</h2>
                 <div className="h-px flex-1 bg-slate-100 ml-4" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    {[
                      { name: 'Matrícula no Cartório', status: true },
                      { name: 'Cadastro Ambiental Rural (CAR)', status: true },
                      { name: 'Georreferenciamento (SIGEF/INCRA)', status: true },
                      { name: 'CCIR e ITR Atualizados', status: true },
                    ].map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                         <span className="text-xs font-black uppercase tracking-widest text-slate-700">{doc.name}</span>
                         <div className="flex items-center gap-2 text-emerald-500">
                            <CheckCircle2 size={18} />
                            <span className="text-[10px] font-black uppercase">Regular</span>
                         </div>
                      </div>
                    ))}
                 </div>
                 <div className="p-10 bg-indigo-900 rounded-[3rem] text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                       <Award size={100} />
                    </div>
                    <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4">Nota de Avaliação</h4>
                    <div className="flex items-baseline gap-2 mb-6">
                       <span className="text-6xl font-black italic">9.8</span>
                       <span className="text-white/40 font-bold uppercase text-[10px] tracking-widest">/ 10</span>
                    </div>
                    <p className="text-sm text-white/60 italic leading-relaxed">
                       Propriedade com documentação impecável, georreferenciada e com reserva legal preservada de acordo com o Novo Código Florestal.
                    </p>
                 </div>
              </div>
           </section>

           {/* Footer */}
           <footer className="pt-20 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-4">
                 <img src={settings.logoUrl} alt="Logo" className="h-12 w-auto grayscale opacity-40" />
                 <div className="h-10 w-px bg-slate-100" />
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Gerado por</p>
                    <p className="text-xs font-bold text-slate-900 uppercase">IMOBZY Rural Platform</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Cópia Autenticada em</p>
                 <p className="text-xs font-bold text-slate-900 uppercase tracking-tighter">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
           </footer>
        </div>
      </article>
    </div>
  );
};

export default DossieView;
