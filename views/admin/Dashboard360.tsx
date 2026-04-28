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
    chats: 0,
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
      const { count: chatsCount } = await supabase
        .from('whatsapp_chats')
        .select('*', { count: 'exact', head: true });

      setStats({
        leads: leadsCount || 0,
        properties: propsCount || 0,
        chats: chatsCount || 0,
        activeContracts: 12,
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <WelcomeTour />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-bg-card p-8 rounded-2xl border border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-primary">
              Sistema Operacional 360
            </span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Bem-vindo à sua{' '}
            <span className="text-brand">Máquina 360</span>,{' '}
            {profile?.name?.split(' ')[0]}
          </h1>
          <p className="text-secondary font-medium mt-2">
            Toda a sua operação imobiliária consolidada em um único painel de
            comando.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">
              Status da Operação
            </p>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span className="text-sm font-bold text-text-primary">
                100% Online
              </span>
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
          variant="primary"
        />
        <StatCard
          icon={MessageSquare}
          label="Conversas WhatsApp"
          value={stats.chats}
          change="+5%"
          variant="primary"
        />
        <StatCard
          icon={FileCheck}
          label="Contratos Pendentes"
          value={stats.activeContracts}
          change="-2"
          variant="accent"
        />
        <StatCard
          icon={DollarSign}
          label="VGV Provisionado"
          value="R$ 1.2M"
          change="+R$ 250k"
          variant="support"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Slot: COMUNICAÇÃO (WhatsApp Hub) */}
        <div className="lg:col-span-2">
          <div className="h-full bg-bg-card p-8 rounded-2xl border border-subtle">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-alpha-10 text-brand rounded-xl">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    Hub de Comunicação
                  </h3>
                  <p className="text-sm text-secondary font-medium">
                    As últimas interações dos seus leads.
                  </p>
                </div>
              </div>
              <Link
                to="../chat"
                className="text-xs font-bold uppercase text-brand hover:text-primary-light transition-colors"
              >
                Ver todas →
              </Link>
            </div>

            <div className="space-y-4">
              {[
                { name: 'Ricardo Santos', time: 'Há 5 min', msg: 'Interessado na Fazenda Sol Nascente (MT)' },
                { name: 'Ana Carolina', time: 'Há 15 min', msg: 'Solicitou vídeo do Haras Tatuí' },
                { name: 'Grupo InvestAgro', time: 'Há 1 hora', msg: 'Nova proposta para a Gleba A' },
              ].map((chat, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-5 bg-bg-hover rounded-2xl hover:bg-bg-hover/80 transition-all border border-subtle group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20 flex items-center justify-center text-brand font-bold text-lg shadow-inner">
                      {chat.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-text-primary text-sm">
                          {chat.name}
                        </p>
                        <span className="text-[10px] text-tertiary bg-bg-primary px-2 py-0.5 rounded-full border border-subtle">
                          {chat.time}
                        </span>
                      </div>
                      <p className="text-xs text-secondary font-medium truncate max-w-[250px]">
                        {chat.msg}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-brand uppercase tracking-widest">Responder</span>
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
