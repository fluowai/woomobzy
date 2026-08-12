import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bot,
  Home,
  Plus,
  Loader2,
  Search,
  Save,
  Rocket,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  aiAgentService,
  type AIAgent,
  type AIAgentPayload,
  type AgentMetrics,
} from '../services/aiAgents';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';
import { AgentSidebar } from '../components/agents/AgentSidebar';
import {
  AgentPresetGrid,
  type PresetAgent,
} from '../components/agents/AgentPresetGrid';
import { AgentForm } from '../components/agents/AgentForm';
import { AgentDashboard } from '../components/agents/AgentDashboard';
import { AgentChatTest } from '../components/agents/AgentChatTest';
import { AgentFlowSteps } from '../components/agents/AgentFlowSteps';
import { AgentStatusBadge } from '../components/agents/AgentStatusBadge';
import { SwarmBuilder } from '../components/agents/SwarmBuilder';

type BuilderState = {
  name: string;
  role: string;
  personality: string;
  instructions: string;
  response_style: string;
  status: string;
  channels: string[];
  capabilities: string[];
  tools: string[];
  autonomy_level: number;
  operation_mode: string;
  handoff_rules: Record<string, boolean>;
  agent_type: 'orchestrator' | 'specialist';
  sub_agents: string[];
  share_prompt_with_subagents: boolean;
};

const STATUS_ACTIVE = ['Ativo', 'Em teste'];

const defaultHandoff: Record<string, boolean> = {
  visit_requested: true,
  price_negotiation: true,
  sensitive_document: true,
  high_intent: true,
  angry_lead: true,
  low_confidence: true,
  property_unavailable: true,
};

const DEFAULTS: BuilderState = {
  name: '',
  role: 'Atendimento e Qualificação de Leads',
  personality: '',
  instructions: '',
  response_style: 'consultivo',
  status: 'Ativo',
  channels: ['whatsapp'],
  capabilities: ['Atendimento inicial', 'Kanban comercial', 'Follow-up'],
  tools: ['whatsapp', 'kanban', 'crm', 'follow-up', 'notificar-corretor'],
  autonomy_level: 2,
  operation_mode: 'Semiautônomo',
  handoff_rules: { ...defaultHandoff },
  agent_type: 'orchestrator',
  sub_agents: [],
  share_prompt_with_subagents: false,
};

const presets: PresetAgent[] = [
  {
    name: 'Zya',
    role: 'Atendimento e Qualificação',
    description:
      'A porta de entrada do funil. Atende 24/7 no WhatsApp, qualifica leads, simula financiamentos e agenda visitas.',
    tags: ['Atendimento', 'WhatsApp', 'Qualificação'],
    avatar: 'Z',
  },
  {
    name: 'Otto',
    role: 'Copiloto do Corretor',
    description:
      'Fica dentro do CRM. Lê o histórico do cliente, sugere a próxima mensagem de follow-up e ajuda o corretor a não esquecer de retornar.',
    tags: ['Follow-up', 'Copiloto', 'CRM'],
    avatar: 'O',
  },
  {
    name: 'Nexus',
    role: 'Especialista em Integrações',
    description:
      'Hub invisível que conecta e importa automaticamente leads de portais (ZAP, VivaReal, OLX) e Meta Ads direto para o CRM.',
    tags: ['Integração', 'Portais', 'Ads'],
    avatar: 'N',
  },
  {
    name: 'Max',
    role: 'Gestor de Tráfego',
    description:
      'Otimiza campanhas de Meta Ads baseado na conversão real capturada no CRM (Storage Intelligence).',
    tags: ['Ads', 'Tráfego', 'Performance'],
    avatar: 'M',
  },
  {
    name: 'Íris',
    role: 'Analista de Dados',
    description:
      'Dashboard inteligente. Calcula ROI das campanhas, CPL e compila relatórios gerenciais.',
    tags: ['Dados', 'BI', 'Relatórios'],
    avatar: 'Í',
  },
  {
    name: 'Eco',
    role: 'Especialista em Retenção',
    description:
      'Dispara cadências de e-mail e mensagens automáticas para base de leads frios para tentar reativá-los.',
    tags: ['Reengajamento', 'E-mail', 'Retenção'],
    avatar: 'E',
  },
];

function presetToBuilder(p: PresetAgent): BuilderState {
  const map: Record<string, Partial<BuilderState>> = {
    Zya: {
      personality: 'Consultiva, objetiva e acolhedora.',
      instructions:
        'Descubra objetivo, cidade, faixa de valor, prazo. Atualize o lead e acione corretor quando houver intenção forte.',
      capabilities: [
        'Atendimento inicial',
        'Kanban comercial',
        'Match de imóveis',
        'Agenda',
      ],
      tools: [
        'whatsapp',
        'kanban',
        'crm',
        'matchmaking',
        'notificar-corretor',
        'agenda',
        'simulador-financiamento',
      ],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
    },
    Otto: {
      personality: 'Persistente, organizado e direto.',
      instructions:
        'Detecte promessas de retorno, visitas e horários. Crie follow-ups e sugira mensagens curtas.',
      capabilities: ['Follow-up', 'Agenda', 'Kanban comercial'],
      tools: [
        'crm',
        'follow-up',
        'agenda',
        'criar-tarefa',
        'notificar-corretor',
      ],
      autonomy_level: 2,
      operation_mode: 'Semiautônomo',
    },
    Nexus: {
      personality: 'Técnico, silencioso e preciso.',
      instructions:
        'Monitore origens de leads (Meta Ads, ZAP, VivaReal) e crie cards no Kanban imediatamente.',
      capabilities: ['Kanban comercial', 'Atendimento inicial'],
      tools: ['crm', 'kanban', 'notificar-corretor', 'mover-etapa-funil'],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
    },
    Max: {
      personality: 'Analítico e focado em ROI.',
      instructions:
        'Analise leads marcados como "Venda Perdida" ou "Venda Ganha" e envie feedback para Meta Ads.',
      capabilities: ['Documentação', 'Match de imóveis'],
      tools: ['crm', 'neural-sales'],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
    },
    Íris: {
      personality: 'Clara, visual e estratégica.',
      instructions:
        'Cruze investimento em marketing com vendas do mês. Destaque corretores mais produtivos.',
      capabilities: ['Documentação', 'Follow-up'],
      tools: ['crm'],
      autonomy_level: 2,
      operation_mode: 'Semiautônomo',
    },
    Eco: {
      personality: 'Persistente, empático e focado em reativar.',
      instructions:
        'Se lead não responde há 30 dias, dispare campanha de nutrição.',
      capabilities: ['Follow-up', 'Kanban comercial'],
      tools: ['crm', 'follow-up', 'whatsapp', 'notificar-corretor'],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
    },
  };
  return { ...DEFAULTS, name: p.name, role: p.role, ...(map[p.name] || {}) };
}

const AIAgents: React.FC = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string>('new');
  const [draft, setDraft] = useState<BuilderState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [view, setView] = useState<'builder' | 'dashboard'>('builder');
  const [mainTab, setMainTab] = useState<'swarms' | 'specialists'>('swarms');
  const { pathname } = useLocation();

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedId),
    [agents, selectedId]
  );

  const propertyPath = pathname.startsWith('/rural')
    ? '/rural/properties/new'
    : '/urban/properties/new';

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const loaded = await aiAgentService.list();
      setAgents(loaded);
    } catch (err: any) {
      toast.error('Erro ao carregar agentes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetrics = useCallback(async (id: string) => {
    try {
      setMetricsLoading(true);
      setMetrics(await aiAgentService.metrics(id));
    } catch {
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (selectedAgent) {
      const a = selectedAgent;
      setDraft({
        name: a.name,
        role: a.role,
        personality: a.personality || '',
        instructions: a.instructions || '',
        response_style: a.response_style || 'consultivo',
        status: a.status || (a.is_active ? 'Ativo' : 'Pausado'),
        channels: a.channels?.length ? a.channels : [a.channel || 'whatsapp'],
        capabilities: a.capabilities?.length
          ? a.capabilities
          : DEFAULTS.capabilities,
        tools: a.tools?.length ? a.tools : DEFAULTS.tools,
        autonomy_level: a.autonomy_level || 2,
        operation_mode: a.operation_mode || 'Semiautônomo',
        handoff_rules: {
          ...defaultHandoff,
          ...(a.handoff_rules || {}),
        } as Record<string, boolean>,
        agent_type: a.agent_type || 'specialist',
        sub_agents: a.sub_agents || [],
        share_prompt_with_subagents: !!a.share_prompt_with_subagents,
      });
    }
  }, [selectedAgent]);

  useEffect(() => {
    if (selectedAgent) {
      loadMetrics(selectedAgent.id);
    } else {
      setMetrics(null);
    }
  }, [selectedId, selectedAgent, loadMetrics]);

  const selectAgent = (id: string) => {
    setSelectedId(id);
    if (id !== 'new' && agents.find((a) => a.id === id)) {
      setView('dashboard');
    } else {
      setView('builder');
    }
  };

  const startNew = () => {
    setSelectedId('new');
    setDraft(DEFAULTS);
    setView('builder');
  };

  const applyPreset = (preset: PresetAgent) => {
    setSelectedId('new');
    setDraft(presetToBuilder(preset));
    setView('builder');
    toast.success(`${preset.name} carregado como modelo.`);
  };

  const updateDraft = (field: string, value: any) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArray = (field: 'capabilities' | 'tools' | 'sub_agents', value: string) => {
    setDraft((prev) => {
      const current = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const toggleChannel = (value: string) => {
    setDraft((prev) => {
      const current = prev.channels || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, channels: next.length ? next : ['whatsapp'] };
    });
  };

  const toggleHandoff = (ruleId: string) => {
    setDraft((prev) => ({
      ...prev,
      handoff_rules: {
        ...prev.handoff_rules,
        [ruleId]: !prev.handoff_rules[ruleId],
      },
    }));
  };

  const saveAgent = async (finalStatus?: string) => {
    const s = finalStatus || draft.status;
    if (!draft.name || !draft.role) {
      toast.error('Informe nome e função do agente.');
      return;
    }

    const payload: AIAgentPayload = {
      name: draft.name,
      role: draft.role,
      channel: draft.channels[0] || 'whatsapp',
      channels: draft.channels,
      personality: draft.personality,
      instructions: draft.instructions,
      response_style: draft.response_style,
      status: s,
      is_active: STATUS_ACTIVE.includes(s),
      capabilities: draft.capabilities,
      tools: draft.tools,
      autonomy_level: draft.autonomy_level,
      operation_mode: draft.operation_mode,
      handoff_rules: draft.handoff_rules,
      agent_type: draft.agent_type,
      sub_agents: draft.sub_agents,
      share_prompt_with_subagents: draft.share_prompt_with_subagents,
    };

    try {
      setSaving(true);
      if (selectedAgent) {
        await aiAgentService.update(selectedAgent.id, payload);
        toast.success(
          finalStatus === 'Rascunho' ? 'Rascunho salvo.' : 'Agente atualizado.'
        );
      } else {
        const created = await aiAgentService.create(payload);
        setSelectedId(created.id);
        toast.success(
          finalStatus === 'Rascunho' ? 'Rascunho criado.' : 'Agente publicado.'
        );
      }
      await loadAgents();
      setView('dashboard');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async () => {
    if (!selectedAgent || !confirm(`Excluir "${selectedAgent.name}"?`)) return;
    await aiAgentService.remove(selectedAgent.id);
    setSelectedId('new');
    setView('builder');
    setDraft(DEFAULTS);
    await loadAgents();
    toast.success('Agente removido.');
  };

  const toggleStatus = async () => {
    if (!selectedAgent) return;
    try {
      await aiAgentService.update(selectedAgent.id, {
        is_active: !selectedAgent.is_active,
      });
      await loadAgents();
      toast.success(
        selectedAgent.is_active ? 'Agente pausado.' : 'Agente ativado!'
      );
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[540px] items-center justify-center bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6">
        <div className="flex items-center gap-3 font-bold text-slate-500">
          <Loader2 className="animate-spin text-emerald-600" size={22} />
          Carregando Central de Agentes
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:px-7 xl:h-20 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 shadow-sm">
              <Home className="text-emerald-400" size={21} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tracking-tight leading-none">
                {COMMERCIAL_PRODUCT_NAME}
              </div>
              <div className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Imobiliária Tradicional
              </div>
            </div>
          </div>
          <div className="relative flex-1 max-w-xl xl:mx-6">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-[#F8FAFD] pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Buscar agentes, imóveis, leads..."
            />
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={propertyPath}
              className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <Plus size={17} /> Novo imóvel
            </Link>
            <button
              onClick={startNew}
              className="flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Bot size={17} /> Novo agente
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-7">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-6 flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setMainTab('swarms')}
              className={`pb-3 px-4 text-sm font-bold transition ${mainTab === 'swarms' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Swarms Autônomos
            </button>
            <button
              onClick={() => setMainTab('specialists')}
              className={`pb-3 px-4 text-sm font-bold transition ${mainTab === 'specialists' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Agentes Especialistas
            </button>
          </div>

          {mainTab === 'swarms' ? (
            <SwarmBuilder
              agents={agents}
              onSelectAgent={(id) => {
                setMainTab('specialists');
                selectAgent(id);
              }}
              onCreateNew={() => {
                setMainTab('specialists');
                startNew();
                setDraft({ ...DEFAULTS, agent_type: 'orchestrator' });
              }}
              onCreateSpecialist={() => {
                setMainTab('specialists');
                startNew();
                setDraft({ ...DEFAULTS, agent_type: 'specialist' });
              }}
            />
          ) : selectedId === 'new' && !selectedAgent && agents.length === 0 ? (
            <div className="space-y-5">
              <AgentPresetGrid presets={presets} onSelect={applyPreset} />
              <AgentFlowSteps />
              <BuilderView
                draft={draft}
                saving={saving}
                agents={agents}
                onChange={updateDraft}
                onToggleArray={toggleArray}
                onToggleChannel={toggleChannel}
                onToggleHandoff={toggleHandoff}
                onSave={saveAgent}
                onNew={startNew}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-5 lg:flex-row">
              <AgentSidebar
                agents={agents}
                selectedId={selectedId}
                onSelect={selectAgent}
                onNew={startNew}
                search={search}
                onSearchChange={setSearch}
              />
              <div className="min-w-0 flex-1 space-y-5">
                {view === 'dashboard' && selectedAgent ? (
                  <AgentDashboard
                    agent={selectedAgent}
                    metrics={metrics}
                    metricsLoading={metricsLoading}
                    onEdit={() => setView('builder')}
                    onToggleStatus={toggleStatus}
                    onTest={() => setView('builder')}
                  />
                ) : (
                  <>
                    {agents.length > 0 && (
                      <AgentPresetGrid
                        presets={presets}
                        onSelect={applyPreset}
                      />
                    )}
                    <BuilderView
                      draft={draft}
                      saving={saving}
                      agents={agents}
                      onChange={updateDraft}
                      onToggleArray={toggleArray}
                      onToggleChannel={toggleChannel}
                      onToggleHandoff={toggleHandoff}
                      onSave={saveAgent}
                      onNew={startNew}
                      selectedAgent={selectedAgent}
                      onDelete={deleteAgent}
                      onViewDashboard={
                        selectedAgent ? () => setView('dashboard') : undefined
                      }
                    />
                  </>
                )}
                <AgentChatTest agent={selectedAgent} draft={draft} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface BuilderViewProps {
  draft: BuilderState;
  saving: boolean;
  agents: AIAgent[];
  onChange: (field: string, value: any) => void;
  onToggleArray: (field: 'capabilities' | 'tools' | 'sub_agents', value: string) => void;
  onToggleChannel: (value: string) => void;
  onToggleHandoff: (ruleId: string) => void;
  onSave: (status?: string) => void;
  onNew: () => void;
  selectedAgent?: AIAgent;
  onDelete?: () => void;
  onViewDashboard?: () => void;
}

const BuilderView: React.FC<BuilderViewProps> = ({
  draft,
  saving,
  agents,
  onChange,
  onToggleArray,
  onToggleChannel,
  onToggleHandoff,
  onSave,
  onNew,
  selectedAgent,
  onDelete,
  onViewDashboard,
}) => (
  <>
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
            <Bot size={15} /> IA e automação
          </div>
          <h1 className="mb-0 mt-4 text-3xl font-bold tracking-tight text-slate-950">
            {selectedAgent
              ? `Editando: ${selectedAgent.name}`
              : 'Construtor de Agente'}
          </h1>
          <p className="mb-0 mt-2 text-sm font-medium text-slate-500">
            Configure agentes que atendem, qualificam, analisam e executam
            follow-ups automaticamente.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <AgentStatusBadge status={draft.status} />
          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </button>
          )}
          {selectedAgent && onDelete && (
            <button
              onClick={onDelete}
              className="flex h-10 items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 text-xs font-bold text-red-600 hover:bg-red-100"
            >
              <Trash2 size={15} /> Excluir
            </button>
          )}
        </div>
      </div>
    </section>

    <AgentForm
      name={draft.name}
      role={draft.role}
      personality={draft.personality}
      instructions={draft.instructions}
      responseStyle={draft.response_style}
      status={draft.status}
      agentType={draft.agent_type}
      subAgents={draft.sub_agents}
      sharePromptWithSubAgents={draft.share_prompt_with_subagents}
      allAgents={agents}
      channels={draft.channels}
      capabilities={draft.capabilities}
      tools={draft.tools}
      autonomyLevel={draft.autonomy_level}
      handoffRules={draft.handoff_rules}
      onChange={onChange}
      onToggleArray={onToggleArray}
      onToggleChannel={onToggleChannel}
      onToggleHandoff={onToggleHandoff}
    />

    <footer className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={onNew}
          className="flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Novo
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => onSave('Rascunho')}
            disabled={saving}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            Salvar rascunho
          </button>
          <button
            onClick={() => onSave('Ativo')}
            disabled={saving}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Rocket size={17} />
            )}
            Publicar agente
          </button>
        </div>
      </div>
    </footer>
  </>
);

export default AIAgents;
