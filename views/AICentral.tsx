import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  Plus,
  Users,
  MessageSquare,
  Target,
  CalendarClock,
  TrendingUp,
  AlertTriangle,
  Brain,
  Zap,
  ArrowRight,
  Settings,
  Play,
  BarChart2,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  ShieldCheck,
  LayoutDashboard,
  GitBranch,
  TestTube2,
  Database,
  Terminal,
  History,
  Logs,
  Sparkles,
  Search
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { COMMERCIAL_PRODUCT_NAME } from '@/utils/branding';
import { toast } from 'sonner';
import { useAIPath } from '@/src/hooks/usePanelBase';
import {
  listOperations,
  getOperation,
  getOperationMetrics,
  type AIAgent,
} from '../services/aiWorkforce';

// ============================================================
// TYPES
// ============================================================

interface AIOperation {
  id: string;
  name: string;
  segment: string;
  status: string;
  health_score: number;
  last_tested_at: string | null;
  published_at: string | null;
  created_at: string;
  agents_count: number;
  active_agents_count: number;
}

interface AgentSummary {
  id: string;
  name: string;
  role: string;
  type: string;
  status: string;
  health_status: string;
  channels: string[];
  metrics: {
    conversations: number;
    qualification_rate: number;
    resolution_rate: number;
    handoffs: number;
    score: number;
  };
}

interface OperationMetrics {
  agents_active: number;
  conversations_today: number;
  leads_qualified: number;
  visits_scheduled: number;
  handoffs: number;
  resolution_rate: number;
  issues_detected: number;
  avg_score: number;
}

interface AIInsight {
  type: 'optimization' | 'warning' | 'info';
  title: string;
  description: string;
  action?: { label: string; href: string };
}

// ============================================================
// COMPONENT: Metric Card
// ============================================================

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendLabel?: string;
  color?: string;
}> = ({ label, value, icon, trend, trendLabel, color = 'emerald' }) => {
  const colors = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', iconBg: 'bg-slate-100' }
  };
  
  const c = colors[color as keyof typeof colors] || colors.emerald;
  const Icon = icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">
            {label}
          </div>
          <div className="text-3xl font-bold text-slate-950 mb-1">
            {value}
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              <span>{trend}</span>
              {trendLabel && <span className="text-slate-500">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className={`shrink-0 h-12 w-12 rounded-lg ${c.iconBg} flex items-center justify-center`}>
          <Icon className={`${c.text}`} size={24} />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENT: Status Badge
// ============================================================

const StatusBadge: React.FC<{ status: string; segment?: string }> = ({ status }) => {
  const statusConfig: Record<string, { bg: string; text: string; Icon: React.ElementType; label: string }> = {
    PUBLISHED: { bg: 'bg-emerald-100', text: 'text-emerald-700', Icon: CheckCircle2, label: 'Publicado' },
    ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', Icon: CheckCircle2, label: 'Ativo' },
    TESTING: { bg: 'bg-blue-100', text: 'text-blue-700', Icon: TestTube2, label: 'Em Teste' },
    APPROVED: { bg: 'bg-purple-100', text: 'text-purple-700', Icon: ShieldCheck, label: 'Aprovado' },
    CONFIGURING: { bg: 'bg-amber-100', text: 'text-amber-700', Icon: Settings, label: 'Configurando' },
    ARCHITECTURE_DESIGN: { bg: 'bg-purple-100', text: 'text-purple-700', Icon: Brain, label: 'Arquitetura' },
    DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', Icon: Bot, label: 'Rascunho' },
    PAUSED: { bg: 'bg-amber-100', text: 'text-amber-700', Icon: Clock, label: 'Pausado' },
    ARCHIVED: { bg: 'bg-slate-100', text: 'text-slate-500', Icon: Database, label: 'Arquivado' },
    ERROR: { bg: 'bg-red-100', text: 'text-red-700', Icon: XCircle, label: 'Erro' }
  };
  
  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${config.bg} ${config.text} text-xs font-bold`}>
      <config.Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
};

// ============================================================
// COMPONENT: Agent Card
// ============================================================

interface AgentCardProps {
  agent: AgentSummary;
  onClick?: () => void;
  onTest?: () => void;
  onView?: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick, onTest, onView }) => {
  const healthConfig: Record<string, { bg: string; text: string; border: string }> = {
    EXCELLENT: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    GOOD: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    ATTENTION: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    UNKNOWN: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' }
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    PUBLISHED: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    TESTING: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    APPROVED: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
    PAUSED: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    ARCHIVED: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
    ERROR: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
  };

  const channelIcons: Record<string, React.ElementType> = {
    whatsapp: MessageSquare,
    instagram: Sparkles,
    webchat: Database,
    crm: Users
  };

  const hConfig = healthConfig[agent.health_status] || healthConfig.UNKNOWN;
  const sConfig = statusConfig[agent.status] || statusConfig.DRAFT;

  return (
    <div 
      className={`relative rounded-xl border ${hConfig.border} ${hConfig.bg} p-5 hover:shadow-lg transition-all cursor-pointer group`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/50 border border-slate-200 flex items-center justify-center shadow-sm">
            <Bot className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">{agent.name}</h3>
            <p className="text-sm font-medium text-slate-500">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${sConfig.bg} ${sConfig.text} text-[10px] font-bold`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
            {agent.status}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {agent.channels?.map((channel, i) => {
          const Icon = channelIcons[channel] || Database;
          return (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/50 border border-slate-100 text-[10px] font-bold text-slate-600">
              <Icon className="h-3 w-3" />
              {channel}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-white/30 rounded-lg">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Conversas</div>
          <div className="text-lg font-bold text-slate-950">{agent.metrics.conversations.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Qualificação</div>
          <div className="text-lg font-bold text-slate-950">{agent.metrics.qualification_rate}%</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Resolução IA</div>
          <div className="text-lg font-bold text-slate-950">{agent.metrics.resolution_rate}%</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Score</div>
          <div className="text-lg font-bold text-slate-950">{agent.metrics.score}/100</div>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-slate-200/50">
        <button
          onClick={(e) => { e.stopPropagation(); onTest?.(); }}
          className="flex-1 h-9 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
        >
          <Play className="h-4 w-4" />
          Testar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onView?.(); }}
          className="flex-1 h-9 rounded-lg bg-slate-950 text-white text-sm font-bold hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
        >
          <ArrowRight className="h-4 w-4" />
          Ver
        </button>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENT: Insight Card
// ============================================================

const InsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => {
  const configs = {
    optimization: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Lightbulb, color: 'text-emerald-700' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, color: 'text-amber-700' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: HelpCircle, color: 'text-blue-700' }
  };
  
  const config = configs[insight.type];

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex gap-3">
        <div className={`shrink-0 h-9 w-9 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center`}>
          <config.icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-950 mb-1">{insight.title}</h4>
          <p className="text-sm text-slate-600 mb-2">{insight.description}</p>
          {insight.action && (
            <a href={insight.action.href} className="text-sm font-bold text-emerald-600 hover:underline flex items-center gap-1">
              {insight.action.label}
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT: AICentral
// ============================================================

const AICentral: React.FC = () => {
  const navigate = useNavigate();
  const aiPath = useAIPath();
  const [operations, setOperations] = useState<AIOperation[]>([]);
  const [rawAgents, setRawAgents] = useState<AIAgent[]>([]);
  const [metrics, setMetrics] = useState<OperationMetrics | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'operations' | 'tests' | 'knowledge' | 'channels' | 'history' | 'logs'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'team', label: 'Minha equipe', icon: Users },
    { id: 'operations', label: 'Operações', icon: GitBranch },
    { id: 'tests', label: 'Testes', icon: TestTube2 },
    { id: 'knowledge', label: 'Conhecimento', icon: Database },
    { id: 'channels', label: 'Canais', icon: MessageSquare },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'logs', label: 'Logs', icon: Terminal }
  ];

  const segmentLabels: Record<string, string> = {
    URBAN_REAL_ESTATE: 'Imobiliária Urbana',
    RURAL_REAL_ESTATE: 'Imobiliária Rural',
    DEVELOPER: 'Incorporadora',
    BUILDER: 'Construtora',
    LAND_DEVELOPER: 'Loteadora'
  };

  const healthColors: Record<string, string> = {
    EXCELLENT: 'text-emerald-600',
    GOOD: 'text-blue-600',
    ATTENTION: 'text-amber-600',
    CRITICAL: 'text-red-600',
    UNKNOWN: 'text-slate-500'
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const apiOperations = await listOperations();

      const mapped: AIOperation[] = apiOperations.map(op => ({
        id: op.id,
        name: op.name,
        segment: op.segment,
        status: op.status,
        health_score: op.health_score ?? 0,
        last_tested_at: op.last_tested_at,
        published_at: op.published_at,
        created_at: op.created_at,
        agents_count: op.agents_count ?? 0,
        active_agents_count: op.active_agents_count ?? 0
      }));

      setOperations(mapped);

      if (mapped.length > 0) {
        const primary = mapped.find(o => o.status === 'PUBLISHED' || o.status === 'ACTIVE') || mapped[0];
        const m = await getOperationMetrics(primary.id, '30d');
        setMetrics({
          agents_active: m.totals.published,
          conversations_today: m.totals.conversations,
          leads_qualified: m.totals.handoffs,
          visits_scheduled: Math.round(m.totals.conversations * 0.05),
          handoffs: m.totals.handoffs,
          resolution_rate: Math.round(
            m.agents.length > 0
              ? m.agents.reduce((sum, a) => sum + Number(a.successRate), 0) / m.agents.length
              : 0
          ),
          issues_detected: m.agents.filter(a => ['CRITICAL', 'ATTENTION'].includes(a.health)).length,
          avg_score: mapped[0]?.health_score ?? 0
        });

        try {
          const detail = await getOperation(primary.id);
          setRawAgents(detail.agents || []);
        } catch (e) {
          logger.warn('[AICentral] Detail load failed', { error: e });
        }
      }

      setInsights([
        {
          type: 'info',
          title: 'Agent Architect ativo',
          description: 'Crie uma nova operação e a IA desenha sua equipe, gera prompts, ferramentas e planos de teste automaticamente.',
          action: { label: 'Criar operação', href: aiPath('operations/new') }
        }
      ]);
    } catch (error) {
      logger.error('[AICentral] Load error', { error });
      toast.error('Erro ao carregar Central de IA');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperation = () => {
    navigate(aiPath('operations/new'));
  };

  const handleViewOperation = (operationId: string) => {
    navigate(aiPath(`operations/${operationId}`));
  };

  const handleViewAgent = (operationId: string, agentId: string) => {
    navigate(aiPath(`operations/${operationId}/agents/${agentId}`));
  };

  const handleTestAgent = (operationId: string, agentId: string) => {
    navigate(aiPath(`operations/${operationId}/agents/${agentId}/test`));
  };

  const primaryOperation = useMemo(() => 
    operations.find(o => o.status === 'PUBLISHED' || o.status === 'ACTIVE') || operations[0],
    [operations]
  );

  const teamAgents: AgentSummary[] = useMemo(() => {
    if (!primaryOperation) return [];
    return rawAgents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role || '',
      type: a.type || 'SPECIALIST',
      status: a.status || 'DRAFT',
      health_status: a.health_status || 'UNKNOWN',
      channels: Object.keys(a.channel_config || {}),
      metrics: {
        conversations: Number((a.metrics as any)?.conversations || 0),
        qualification_rate: Math.round(Number((a.metrics as any)?.qualification_rate || 0)),
        resolution_rate: Math.round(Number((a.metrics as any)?.resolution_rate || 0)),
        handoffs: Number((a.metrics as any)?.handoffs || 0),
        score: Number((a.metrics as any)?.score || 0)
      }
    }));
  }, [primaryOperation, rawAgents]);

  if (loading) {
    return (
      <div className="min-h-[600px] bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Bot className="h-12 w-12 text-emerald-600 animate-pulse" />
          <div className="font-bold text-lg">Carregando Central de IA...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-auto min-h-16 px-4 py-3 lg:px-7 flex flex-col gap-3 xl:h-20 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-slate-950 flex items-center justify-center shadow-sm">
              <Bot className="text-emerald-400" size={21} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tracking-tight leading-none">
                {COMMERCIAL_PRODUCT_NAME}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mt-1 truncate">
                Central de Inteligência Artificial
              </div>
            </div>
          </div>

          <div className="relative flex-1 max-w-2xl xl:mx-8 hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full h-11 rounded-lg border border-slate-200 bg-[#F8FAFD] pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Buscar operações, agentes, conversas..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCreateOperation}
              className="h-11 px-5 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <Plus size={18} />
              Criar operação com IA
            </button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden border-t border-slate-100 px-3 py-2">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`shrink-0 h-9 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === tab.id
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <tab.icon size={14} className="shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-7">
        <div className="mx-auto max-w-[1500px] space-y-6">
          {/* Navigation Tabs (Desktop) */}
          <div className="hidden lg:flex gap-2 border-b border-slate-100 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`h-10 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === tab.id
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <tab.icon size={16} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Hero Section */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 lg:p-7 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                      <Sparkles size={15} />
                      IA e automação
                    </div>
                    <h1 className="mt-4 text-3xl lg:text-4xl font-bold tracking-tight text-slate-950 mb-0">
                      Central de Inteligência Artificial
                    </h1>
                    <p className="mt-3 max-w-2xl text-base lg:text-lg font-medium leading-relaxed text-slate-600 mb-0">
                      Crie, teste e gerencie sua equipe de IA para automatizar atendimento, qualificação, vendas, locação e operações da sua empresa.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateOperation}
                    className="h-12 px-6 rounded-xl bg-slate-950 text-white text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-slate-800 shrink-0"
                  >
                    <Plus size={20} />
                    Criar operação com IA
                  </button>
                </div>
              </section>

              {/* Key Metrics */}
              {metrics && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
                  <MetricCard label="Agentes ativos" value={metrics.agents_active} icon={Bot} color="emerald" />
                  <MetricCard label="Conversas hoje" value={metrics.conversations_today} icon={MessageSquare} color="blue" trend="+12%" trendLabel="vs ontem" />
                  <MetricCard label="Leads qualificados" value={metrics.leads_qualified} icon={Target} color="purple" trend="+8%" trendLabel="vs ontem" />
                  <MetricCard label="Visitas agendadas" value={metrics.visits_scheduled} icon={CalendarClock} color="amber" trend="+3" trendLabel="vs ontem" />
                  <MetricCard label="Handoffs realizados" value={metrics.handoffs} icon={GitBranch} color="slate" />
                  <MetricCard label="Taxa resolução IA" value={`${metrics.resolution_rate}%`} icon={TrendingUp} color="emerald" />
                  <MetricCard label="Problemas detectados" value={metrics.issues_detected} icon={AlertTriangle} color={metrics.issues_detected > 0 ? 'red' : 'emerald'} />
                  <MetricCard label="Score médio" value={`${metrics.avg_score}/100`} icon={ShieldCheck} color="purple" />
                </div>
              )}

              {/* Primary Operation */}
              {primaryOperation && (
                <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-5 lg:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <GitBranch className="text-emerald-600" size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-xl font-bold text-slate-950">{primaryOperation.name}</h2>
                              <StatusBadge status={primaryOperation.status} />
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                              <span className="font-medium">Segmento:</span>
                              <span className="font-bold text-slate-700">{segmentLabels[primaryOperation.segment] || primaryOperation.segment}</span>
                              <span className="font-medium">Saúde:</span>
                              <span className={`font-bold ${healthColors[primaryOperation.health_score >= 90 ? 'EXCELLENT' : primaryOperation.health_score >= 70 ? 'GOOD' : 'ATTENTION']}`}>
                                {primaryOperation.health_score}/100
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-600 max-w-2xl">
                          {primaryOperation.active_agents_count} de {primaryOperation.agents_count} agentes trabalhando integrados ao CRM e canais de atendimento.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 shrink-0">
                        <button
                          onClick={() => handleViewOperation(primaryOperation.id)}
                          className="h-11 px-5 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <LayoutDashboard size={18} />
                          Ver operação
                        </button>
                        <button
                          onClick={() => navigate(aiPath(`operations/${primaryOperation.id}/architecture`))}
                          className="h-11 px-5 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <GitBranch size={18} />
                          Ver arquitetura
                        </button>
                        <button
                          className="h-11 px-5 rounded-lg bg-slate-950 text-white text-sm font-bold hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Lightbulb size={18} />
                          Otimizar com IA
                        </button>
                      </div>
                    </div>

                    {/* Agents Grid */}
                    <div className="border-t border-slate-100 px-5 lg:px-6 py-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-950">Sua equipe de IA</h3>
                        <span className="text-sm text-slate-500">{teamAgents.length} agentes ativos</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {teamAgents.map(agent => (
                          <AgentCard
                            key={agent.id}
                            agent={agent}
                            onClick={() => handleViewAgent(primaryOperation.id, agent.id)}
                            onTest={() => handleTestAgent(primaryOperation.id, agent.id)}
                            onView={() => handleViewAgent(primaryOperation.id, agent.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Insights */}
              {insights.length > 0 && (
                <section className="rounded-xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Lightbulb className="text-emerald-600" size={18} />
                      </div>
                      <h2 className="text-lg font-bold text-slate-950">Insights da IA</h2>
                    </div>
                    <span className="text-sm text-slate-500">{insights.length} oportunidades</span>
                  </div>
                  <div className="space-y-3">
                    {insights.map((insight, i) => (
                      <InsightCard key={i} insight={insight} />
                    ))}
                  </div>
                </section>
              )}

              {/* Quick Actions */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950 mb-4">Ações rápidas</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Link
                    to={aiPath('operations/new')}
                    className="group rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-emerald-200 transition"
                  >
                    <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition">
                      <Plus className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-slate-950 mb-1">Nova operação com IA</h3>
                    <p className="text-sm text-slate-500">Descreva seu negócio e a IA cria sua equipe</p>
                  </Link>
                  <Link
                    to={aiPath('knowledge')}
                    className="group rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-blue-200 transition"
                  >
                    <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-950 mb-1">Base de Conhecimento</h3>
                    <p className="text-sm text-slate-500">Gerencie documentos, FAQs e políticas</p>
                  </Link>
                  <Link
                    to={aiPath('history')}
                    className="group rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-purple-200 transition"
                  >
                    <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center mb-3 group-hover:bg-purple-100 transition">
                      <History className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-slate-950 mb-1">Histórico de Conversas</h3>
                    <p className="text-sm text-slate-500">Revise atendimentos e métricas detalhadas</p>
                  </Link>
                  <Link
                    to={aiPath('logs')}
                    className="group rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-slate-200 transition"
                  >
                    <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-slate-200 transition">
                      <Terminal className="h-6 w-6 text-slate-600" />
                    </div>
                    <h3 className="font-bold text-slate-950 mb-1">Logs & Auditoria</h3>
                    <p className="text-sm text-slate-500">Rastreamento técnico completo</p>
                  </Link>
                </div>
              </section>
            </>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-950">Minha equipe de IA</h2>
                <button
                  onClick={handleCreateOperation}
                  className="h-10 px-4 rounded-lg bg-slate-950 text-white text-sm font-bold flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nova operação
                </button>
              </div>
              {operations.length > 0 ? (
                <div className="space-y-4">
                  {operations.map(op => (
                    <div key={op.id} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                              <GitBranch className="text-emerald-600" size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-950">{op.name}</h3>
                                <StatusBadge status={op.status} />
                              </div>
                              <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                                <span>{segmentLabels[op.segment] || op.segment}</span>
                                <span>{op.active_agents_count}/{op.agents_count} agentes ativos</span>
                                <span>Score: {op.health_score}/100</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleViewOperation(op.id)}
                            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <LayoutDashboard size={16} />
                            Ver
                          </button>
                          <button
                            onClick={() => navigate(aiPath(`operations/${op.id}/architecture`))}
                            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <GitBranch size={16} />
                            Arquitetura
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <GitBranch className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950 mb-2">Nenhuma operação criada</h3>
                  <p className="text-slate-500 mb-4 max-w-md mx-auto">
                    Comece criando sua primeira operação com IA. A WooTech IA vai entender seu negócio e montar a equipe ideal.
                  </p>
                  <button
                    onClick={handleCreateOperation}
                    className="h-11 px-6 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 mx-auto shadow-sm hover:bg-emerald-700"
                  >
                    <Plus size={18} />
                    Criar operação com IA
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Operations Tab */}
          {activeTab === 'operations' && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-950">Todas as operações</h2>
                <button
                  onClick={handleCreateOperation}
                  className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nova operação
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-[0.1em]">Operação</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-[0.1em]">Segmento</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-[0.1em]">Status</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-[0.1em]">Agentes</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-[0.1em]">Saúde</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-[0.1em]">Publicado</th>
                      <th className="text-right py-3 px-4 font-bold text-slate-500 uppercase tracking-[0.1em]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map(op => (
                      <tr key={op.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-950">{op.name}</div>
                          <div className="text-[11px] text-slate-500">Criada em {new Date(op.created_at).toLocaleDateString('pt-BR')}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                            {segmentLabels[op.segment] || op.segment}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={op.status} />
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-slate-950">{op.active_agents_count}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-500">{op.agents_count}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-bold ${healthColors[op.health_score >= 90 ? 'EXCELLENT' : op.health_score >= 70 ? 'GOOD' : 'ATTENTION']}`}>
                            {op.health_score}/100
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500">
                          {op.published_at ? new Date(op.published_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewOperation(op.id)}
                              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => navigate(aiPath(`operations/${op.id}/architecture`))}
                              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Arquitetura
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {operations.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">Nenhuma operação encontrada</p>
                  <button
                    onClick={handleCreateOperation}
                    className="mt-4 h-11 px-6 rounded-lg bg-emerald-600 text-white text-sm font-bold"
                  >
                    Criar primeira operação
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Placeholder tabs */}
          {['tests', 'knowledge', 'channels', 'history', 'logs'].includes(activeTab) && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm text-center py-12">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 mb-2">
                {tabs.find(t => t.id === activeTab)?.label} - Em desenvolvimento
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Esta seção está sendo implementada. Volte em breve para testar, gerenciar conhecimento, configurar canais, ver histórico ou logs.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default AICentral;