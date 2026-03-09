
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Eye, 
  MessageSquare, 
  ArrowUpRight, 
  MapPin, 
  Award,
  Calendar,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const OwnerPortal: React.FC = () => {
  const { settings } = useSettings();
  
  const stats = [
    { label: 'Visualizações', value: '1.284', icon: Eye, trend: '+12%', color: '#6366f1' },
    { label: 'Leads Interessados', value: '24', icon: Users, trend: '+5%', color: '#10b981' },
    { label: 'Visitas Agendadas', value: '4', icon: Calendar, trend: 'Estável', color: '#f59e0b' },
    { label: 'Propostas Recebidas', value: '2', icon: DollarSign, trend: '+1', color: settings.primaryColor },
  ];

  const chartData = [
    { name: 'Seg', views: 120, leads: 2 },
    { name: 'Ter', views: 150, leads: 3 },
    { name: 'Qua', views: 180, leads: 1 },
    { name: 'Qui', views: 220, leads: 5 },
    { name: 'Sex', views: 190, leads: 4 },
    { name: 'Sab', views: 250, leads: 6 },
    { name: 'Dom', views: 210, leads: 3 },
  ];

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
            Portal do <span style={{ color: settings.primaryColor }}>Proprietário</span>
          </h1>
          <p className="text-slate-500 font-medium italic">Acompanhe a performance comercial do seu ativo rural.</p>
        </div>
        
        <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
           <div className="flex items-center gap-3 px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200" />
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-400">Proprietário</p>
                 <p className="text-xs font-bold text-slate-900">João da Silva Costa</p>
              </div>
           </div>
        </div>
      </div>

      {/* Property Selector Simple */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden">
               <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=200&h=200" alt="Fazenda" className="w-full h-full object-cover" />
            </div>
            <div>
               <h2 className="font-black text-slate-900 uppercase italic">Fazenda Vale do Ouro</h2>
               <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <MapPin size={12} /> Sorriso, Mato Grosso • 1.250 ha
               </p>
            </div>
         </div>
         <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-6 py-3 rounded-xl hover:bg-indigo-100 transition-all">
            Ver Anúncio Público <ArrowUpRight size={14} />
         </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-6">
               <div className="p-3 rounded-2xl" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                  <stat.icon size={24} />
               </div>
               <span className="text-[10px] font-black px-3 py-1 bg-slate-50 text-slate-400 rounded-full">{stat.trend}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900">Atividade Semanal</h3>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Últimos 7 dias</div>
           </div>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <defs>
                       <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={settings.primaryColor} stopOpacity={0.1}/>
                          <stop offset="95%" stopColor={settings.primaryColor} stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 900, marginBottom: '5px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stroke={settings.primaryColor} 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorViews)" 
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Lead Activity Feed */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
           <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 mb-8">Interações Recentes</h3>
           <div className="flex-1 space-y-6">
              {[
                { type: 'LEAD', text: 'Novo interessado de Curitiba/PR', time: 'Há 2h' },
                { type: 'VIEW', text: 'Property compartilhada no WhatsApp', time: 'Há 5h' },
                { type: 'PROPOSTA', text: 'Proposta registrada pelo corretor', time: 'Ontem' },
                { type: 'VISITA', text: 'Visita técnica agendada para 12/06', time: 'Ontem' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                   <div className="w-1.5 h-auto rounded-full bg-slate-100" />
                   <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1">{item.type}</p>
                      <p className="text-xs font-bold text-slate-700">{item.text}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{item.time}</p>
                   </div>
                </div>
              ))}
           </div>
           <button className="w-full mt-10 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:text-indigo-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
              Ver Relatório Detalhado <ChevronRight size={14} />
           </button>
        </div>
      </div>

      {/* Achievement / Status Banner */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-10 opacity-5">
            <Award size={160} />
         </div>
         <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center shrink-0">
            <TrendingUp size={40} className="text-emerald-400" />
         </div>
         <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Seu imóvel está em alta!</h3>
            <p className="text-sm text-white/60 font-medium italic">
               O interesse médio nesta semana superou em 35% as propriedades similares na região de Sorriso/MT.
            </p>
         </div>
         <button className="px-10 py-4 bg-emerald-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all shadow-lg active:scale-95">
            Falar com meu Corretor
         </button>
      </div>
    </div>
  );
};

export default OwnerPortal;
