import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  DollarSign,
  FileCheck,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Briefcase,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

const Dashboard360: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    leads: 0,
    properties: 0,
    chats: 0,
    activeContracts: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
      const { count: propsCount } = await supabase.from('properties').select('*', { count: 'exact', head: true });
      const { count: chatsCount } = await supabase.from('whatsapp_chats').select('*', { count: 'exact', head: true });
      
      setStats({
        leads: leadsCount || 0,
        properties: propsCount || 0,
        chats: chatsCount || 0,
        activeContracts: 12 // Mocked for now until Finance module is ready
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-full space-y-10 animate-in fade-in duration-700">
      {/* Header Centralizado - 360 Machine Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">
              Sistema Operacional 360
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
            Bem-vindo à sua <span className="text-blue-600">Máquina 360</span>, {profile?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Toda a sua operação imobiliária consolidada em um único painel de comando.
          </p>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status da Operação</p>
              <div className="flex items-center gap-2 justify-end">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-sm font-bold text-slate-700">100% Online</span>
              </div>
           </div>
        </div>
      </div>

      {/* Grid Principal - Big Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
           icon={Users} 
           label="Total de Leads" 
           value={stats.leads} 
           change="+18%" 
           color="blue" 
        />
        <StatCard 
           icon={MessageSquare} 
           label="Conversas WhatsApp" 
           value={stats.chats} 
           change="+5%" 
           color="emerald" 
        />
        <StatCard 
           icon={FileCheck} 
           label="Contratos Pendentes" 
           value={stats.activeContracts} 
           change="-2" 
           color="amber" 
        />
        <StatCard 
           icon={DollarSign} 
           label="VGV Provisionado" 
           value="R$ 1.2M" 
           change="+R$ 250k" 
           color="indigo" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Slot: COMUNICAÇÃO (WhatsApp Hub) */}
        <div className="lg:col-span-2 space-y-6">
           <div className="h-full bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                       <Smartphone size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-slate-900">Hub de Comunicação</h3>
                       <p className="text-sm text-slate-500 font-medium">As últimas interações dos seus leads.</p>
                    </div>
                 </div>
                 <Link to="../chat" className="text-xs font-black uppercase text-emerald-600 hover:underline">Ver todas as conversas</Link>
              </div>
              
              <div className="space-y-4">
                 {[1,2,3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-[24px] hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 group">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-200" />
                          <div>
                             <p className="font-bold text-slate-800">Interessado no Apt. {i}01</p>
                             <p className="text-xs text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">Lead enviou uma nova foto de comprovante...</p>
                          </div>
                       </div>
                       <ArrowUpRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={20} />
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Slot: FINTECH (Asaas / Iugu Widget) */}
        <div className="space-y-6">
           <div className="bg-slate-900 p-8 rounded-[32px] text-white overflow-hidden relative border-none">
              <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-blue-600/20 blur-[80px] rounded-full" />
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-8">
                    <DollarSign className="text-blue-400" size={28} />
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-widest rounded">Asaas Integrado</span>
                 </div>
                 <p className="text-blue-200/60 text-[10px] font-black uppercase tracking-widest mb-1">Cobrabilidade este mês</p>
                 <h4 className="text-3xl font-black italic tracking-tighter mb-6">R$ 48.250,00</h4>
                 
                 <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-white/10 pb-2">
                       <span className="text-white/60">Contas Pendentes</span>
                       <span className="text-amber-400 font-black">R$ 4.100,00</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold border-b border-white/10 pb-2">
                       <span className="text-white/60">Repasse Imobiliária</span>
                       <span className="text-emerald-400 font-black">R$ 5.800,00</span>
                    </div>
                 </div>
                 
                 <button className="w-full mt-8 py-3 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg active:scale-95">
                    Ir para Financeiro
                 </button>
              </div>
           </div>

           {/* Slot: JURÍDICO (ZapSign Widget) */}
           <div className="p-8 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 shadow-none hover:border-blue-300 transition-all cursor-pointer group">
              <div className="flex flex-col items-center justify-center py-4 text-center">
                 <div className="p-4 bg-white rounded-3xl shadow-sm mb-4 group-hover:scale-110 transition-transform text-blue-600">
                    <ShieldCheck size={32} />
                 </div>
                 <h3 className="font-bold text-slate-800">Painel Jurídico</h3>
                 <p className="text-xs text-slate-500 font-medium px-4">Envie contratos para assinatura digital com ZapSign sem sair do IMOBZY.</p>
              </div>
           </div>
        </div>
      </div>

      {/* Bottom Row - Operational Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <ActionCard icon={Briefcase} label="Dossiês de Venda" desc="Organize documentos do imóvel" color="emerald" />
         <ActionCard icon={AlertCircle} label="Vistorias Pendentes" desc="Checklists e fotos de check-in" color="amber" />
         <ActionCard icon={TrendingUp} label="Marketing & Portais" desc="Exportar para Zap/VivaReal" color="indigo" />
         <ActionCard icon={CheckCircle2} label="Garantias Locatícias" desc="Análise de crédito CrepPago" color="blue" />
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, change, color }: any) => {
   const colors: any = {
      blue: 'text-blue-600 bg-blue-50',
      emerald: 'text-emerald-600 bg-emerald-50',
      amber: 'text-amber-600 bg-amber-50',
      indigo: 'text-indigo-600 bg-indigo-50'
   };
   return (
      <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
         <div className="flex items-center justify-between mb-4">
            <div className={`p-3.5 rounded-2xl ${colors[color]}`}>
               <Icon size={24} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full">{change}</span>
         </div>
         <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</h3>
         <p className="text-3xl font-black text-slate-900 italic tracking-tighter group-hover:scale-105 transition-transform origin-left">{value}</p>
      </div>
   );
};

const ActionCard = ({ icon: Icon, label, desc, color }: any) => {
   const colors: any = {
      blue: 'text-blue-600 bg-blue-50',
      emerald: 'text-emerald-600 bg-emerald-50',
      amber: 'text-amber-600 bg-amber-50',
      indigo: 'text-indigo-600 bg-indigo-50'
   };
   return (
      <div className="flex flex-col p-6 bg-white rounded-3xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all cursor-pointer group">
         <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${colors[color]}`}>
            <Icon size={20} />
         </div>
         <h4 className="text-sm font-bold text-slate-900 mb-1">{label}</h4>
         <p className="text-[10px] text-slate-500 font-medium">{desc}</p>
      </div>
   );
};

export default Dashboard360;
