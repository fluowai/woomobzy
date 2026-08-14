import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Users,
  DollarSign,
  FileCheck,
  TrendingUp,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { cobrancaService } from '../../services/cobrancaService';
import WelcomeTour from '../../components/WelcomeTour';
import AgroMarketWidget from '../../components/AgroMarketWidget';

const Dashboard360: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    leads: 0,
    properties: 0,
    activeContracts: 0,
    matches: 0,
    vgv: 0,
    commission: 0,
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [fintech, setFintech] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;

    const fetchStats = async () => {
      try {
        const organizationId = profile.organization_id;
        const [leadsRes, propsRes, contractsRes, dashboard] = await Promise.all(
          [
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', organizationId),
            supabase
              .from('properties')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', organizationId),
            supabase
              .from('contracts')
              .select('*', { count: 'exact', head: true })
              .in('status', ['draft', 'signed', 'active'])
              .eq('organization_id', organizationId),
            cobrancaService.getDashboard(),
          ]
        );

        const leadRows = await supabase
          .from('leads')
          .select(
            'id, name, phone, status, created_at, lead_score, classification, property:property_id(title)'
          )
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(5);

        const { count: matchedCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .not('matched_properties', 'is', null)
          .neq('matched_properties', '[]')
          .eq('organization_id', organizationId);

        setStats({
          leads: leadsRes.count || 0,
          properties: propsRes.count || 0,
          activeContracts: contractsRes.count || 0,
          matches: matchedCount || 0,
          vgv: dashboard?.totais?.receita_mensal_projetada || 0,
          commission: dashboard?.totais?.total_recebido_ano || 0,
        });
        setRecentLeads(leadRows.data || []);
        setFintech(dashboard?.totais || null);
      } catch (err) {
        console.error('Erro ao carregar Dashboard360:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [profile?.organization_id]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  const formatLeadTime = (createdAt?: string) => {
    if (!createdAt) return '';
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `há ${days} dia${days > 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <WelcomeTour />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-widest rounded-full border border-brand/20">
              Motor Operacional 360 v2.0
            </span>
            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              Sincronizado
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white italic tracking-tighter leading-tight">
            Sua <span className="text-brand">Máquina de Vendas</span> <br />
            está em alta performance.
          </h1>
          <p className="text-white/40 font-medium italic mt-4 max-w-xl">
            Bem-vindo de volta, {profile?.full_name?.split(' ')[0]}.
            {stats.matches > 0
              ? ` Identificamos ${stats.matches} ${
                  stats.matches === 1
                    ? 'oportunidade de match'
                    : 'oportunidades de match'
                } para sua carteira hoje.`
              : ' Seu pipeline está pronto para novos matches.'}
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <Link
            to="/admin/matchmaking"
            className="p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-brand/10 hover:border-brand/20 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand/10 text-brand rounded-xl">
                <Target size={24} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                  Inteligência Match
                </p>
                <p className="text-lg font-bold text-white">
                  Ver Oportunidades →
                </p>
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
          value={loadingStats ? '—' : stats.leads}
          change="CRM"
          variant="primary"
        />
        <StatCard
          icon={Sparkles}
          label="Matches Sugeridos"
          value={loadingStats ? '—' : String(stats.matches)}
          change="IA Ativa"
          variant="primary"
        />
        <StatCard
          icon={FileCheck}
          label="Contratos Ativos"
          value={loadingStats ? '—' : String(stats.activeContracts)}
          change="Legal"
          variant="accent"
        />
        <StatCard
          icon={DollarSign}
          label="Receita Mensal Projetada"
          value={loadingStats ? '—' : formatCurrency(stats.vgv)}
          change="Financeiro"
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
              {recentLeads.length === 0 && (
                <p className="text-sm text-secondary">
                  Nenhum lead recente ainda. Crie seu primeiro lead no Kanban.
                </p>
              )}
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-5 bg-bg-hover rounded-2xl hover:bg-bg-hover/80 transition-all border border-subtle group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20 flex items-center justify-center text-brand font-bold text-lg shadow-inner">
                      {(lead.name || 'L').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-text-primary text-sm">
                          {lead.name || 'Lead sem nome'}
                        </p>
                        <span className="text-[10px] text-tertiary bg-bg-primary px-2 py-0.5 rounded-full border border-subtle">
                          {formatLeadTime(lead.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-secondary font-medium truncate max-w-[250px]">
                        {lead.property?.title || 'Sem imóvel vinculado'} •{' '}
                        <span className="text-brand font-bold">
                          {lead.status || 'Novo'}
                        </span>
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
                {fintech
                  ? formatCurrency(fintech.receita_mensal_projetada || 0)
                  : '—'}
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium border-b border-subtle pb-2">
                  <span className="text-secondary">Inadimplência</span>
                  <span className="text-accent font-bold">
                    {fintech
                      ? formatCurrency(fintech.valor_inadimplencia || 0)
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium border-b border-subtle pb-2">
                  <span className="text-secondary">Total Recebido (Ano)</span>
                  <span className="text-brand font-bold">
                    {fintech
                      ? formatCurrency(fintech.total_recebido_ano || 0)
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium border-b border-subtle pb-2">
                  <span className="text-secondary">Contratos Ativos</span>
                  <span className="text-brand font-bold">
                    {fintech?.contratos_ativos ?? '—'}
                  </span>
                </div>
              </div>

              <Link
                to="/urban/fintech"
                className="btn-primary w-full mt-6 text-xs"
              >
                Ir para Financeiro
              </Link>
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
          onClick={() => toast.info('Funcionalidade de Dossiês em breve')}
        />
        <ActionCard
          icon={AlertCircle}
          label="Vistorias Pendentes"
          desc="Checklists e fotos de check-in"
          accent
          onClick={() => toast.info('Módulo de vistorias em breve')}
        />
        <ActionCard
          icon={TrendingUp}
          label="Marketing & Portais"
          desc="Exportar para Zap/VivaReal"
          onClick={() => toast.info('Integração com portais em breve')}
        />
        <ActionCard
          icon={CheckCircle2}
          label="Garantias Locatícias"
          desc="Análise de crédito CredPago"
          onClick={() => toast.info('Análise de crédito CredPago em breve')}
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
        <div
          className={`p-3 rounded-xl ${iconColors[variant] || iconColors.primary}`}
        >
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

const ActionCard = ({ icon: Icon, label, desc, accent, onClick }: any) => (
  <div onClick={onClick} className="card card-hover cursor-pointer group">
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
