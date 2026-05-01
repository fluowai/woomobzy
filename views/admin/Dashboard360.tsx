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
  AlertCircle,
  Zap,
  Sparkles,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import WelcomeTour from '../../components/WelcomeTour';
import AgroMarketWidget from '../../components/AgroMarketWidget';

const Dashboard360: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    leads: 0,
    properties: 0,
    activeContracts: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });
      const { count: propsCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });
      setStats({
        leads: leadsCount || 0,
        properties: propsCount || 0,
        activeContracts: 12,
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <WelcomeTour />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-brand/10 text-brand text-[10px] font-black uppercase tracking-widest rounded-full border border-brand/20">
              Motor Operacional 360 v2.0
            </span>
            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              Sincronizado
            </span>
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter leading-tight">
            Sua <span className="text-brand">Máquina de Vendas</span> <br />
            está em alta performance.
          </h1>
          <p className="text-white/40 font-medium italic mt-4 max-w-xl">
            Bem-vindo de volta, {profile?.name?.split(' ')[0]}. Identificamos 12 novas oportunidades de match para sua carteira rural hoje.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <Link to="/admin/matchmaking" className="p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-brand/10 hover:border-brand/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand/10 text-brand rounded-xl">
                <Target size={24} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Inteligência Match</p>
                <p className="text-lg font-black text-white">Ver Oportunidades →</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Grid Principal - Big Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard
          icon={Users}
          label="Total de Leads"
          value={stats.leads}
          change="+18%"
          variant="primary"
        />
        <StatCard
          icon={Sparkles}
          label="Matches Sugeridos"
          value="12"
          change="IA Ativa"
          variant="primary"
        />
        <StatCard
          icon={FileCheck}
          label="VGV Negociado"
          value="R$ 1.8M"
          change="+12%"
          variant="accent"
        />
        <StatCard
          icon={DollarSign}
          label="Comissão Prevista"
          value="R$ 108k"
          change="+R$ 15k"
          variant="support"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Slot: LEADS RECENTES */}
        <div className="lg:col-span-2">
          <div className="h-full bg-bg-card p-8 rounded-2xl border border-subtle">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-alpha-10 text-brand rounded-xl">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    Leads Recentes
                  </h3>
                  <p className="text-sm text-secondary font-medium">
                    Acompanhe os últimos contatos interessados.
                  </p>
                </div>
              </div>
              <Link
                to="../crm"
                className="text-xs font-bold uppercase text-brand hover:text-primary-light transition-colors"
              >
                Ver Kanban →
              </Link>
            </div>

            <div className="space-y-4">
              {[
                { name: 'Ricardo Santos', time: 'Há 5 min', status: 'Novo Lead', location: 'Fazenda Sol Nascente (MT)' },
                { name: 'Ana Carolina', time: 'Há 15 min', status: 'Em Qualificação', location: 'Haras Tatuí' },
                { name: 'Carlos Eduardo', time: 'Há 1 hora', status: 'Proposta Enviada', location: 'Gleba A' },
              ].map((lead, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-5 bg-bg-hover rounded-2xl hover:bg-bg-hover/80 transition-all border border-subtle group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20 flex items-center justify-center text-brand font-bold text-lg shadow-inner">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-text-primary text-sm">
                          {lead.name}
                        </p>
                        <span className="text-[10px] text-tertiary bg-bg-primary px-2 py-0.5 rounded-full border border-subtle">
                          {lead.time}
                        </span>
                      </div>
                      <p className="text-xs text-secondary font-medium truncate max-w-[250px]">
                        Interesse: {lead.location} • <span className="text-brand font-bold">{lead.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUpRight
                      className="text-tertiary group-hover:text-brand transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1"
                      size={20}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Slot: FINTECH Widget */}
        <div className="space-y-6">
          <div className="bg-bg-card p-8 rounded-2xl border border-brand/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand/5 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <DollarSign className="text-brand" size={26} />
                <span className="badge badge-primary text-[9px]">
                  Asaas Integrado
                </span>
              </div>
              <p className="text-tertiary text-[10px] font-bold uppercase tracking-widest mb-1">
                Cobrabilidade este mês
              </p>
              <h4 className="text-3xl font-bold text-text-primary tracking-tight mb-6">
                R$ 48.250,00
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium border-b border-subtle pb-2">
                  <span className="text-secondary">Contas Pendentes</span>
                  <span className="text-accent font-bold">R$ 4.100,00</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium border-b border-subtle pb-2">
                  <span className="text-secondary">Repasse Imobiliária</span>
                  <span className="text-brand font-bold">R$ 5.800,00</span>
                </div>
              </div>

              <button className="btn-primary w-full mt-6 text-xs">
                Ir para Financeiro
              </button>
            </div>
          </div>

          <AgroMarketWidget />
        </div>
      </div>

      {/* Bottom Row - Operational Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard
          icon={Briefcase}
          label="Dossiês de Venda"
          desc="Organize documentos do imóvel"
        />
        <ActionCard
          icon={AlertCircle}
          label="Vistorias Pendentes"
          desc="Checklists e fotos de check-in"
          accent
        />
        <ActionCard
          icon={TrendingUp}
          label="Marketing & Portais"
          desc="Exportar para Zap/VivaReal"
        />
        <ActionCard
          icon={CheckCircle2}
          label="Garantias Locatícias"
          desc="Análise de crédito CredPago"
        />
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, change, variant }: any) => {
  const iconColors: any = {
    primary: 'bg-primary-alpha-10 text-brand',
    accent: 'bg-accent-alpha-10 text-accent',
    support: 'bg-bg-hover text-support',
  };
  return (
    <div className="card card-hover group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconColors[variant] || iconColors.primary}`}>
          <Icon size={22} />
        </div>
        <span className="badge badge-primary text-[10px]">{change}</span>
      </div>
      <h3 className="text-tertiary text-[10px] font-bold uppercase tracking-widest mb-1">
        {label}
      </h3>
      <p className="text-3xl font-bold text-text-primary tracking-tight group-hover:text-brand transition-colors">
        {value}
      </p>
    </div>
  );
};

const ActionCard = ({ icon: Icon, label, desc, accent }: any) => (
  <div className="card card-hover cursor-pointer group">
    <div
      className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${
        accent ? 'bg-accent-alpha-10 text-accent' : 'bg-brand/10 text-brand'
      }`}
    >
      <Icon size={20} />
    </div>
    <h4 className="text-sm font-bold text-text-primary mb-1">{label}</h4>
    <p className="text-[11px] text-secondary font-medium">{desc}</p>
  </div>
);

export default Dashboard360;
