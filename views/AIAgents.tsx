import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  Home,
  Loader2,
  Plus,
  Rocket,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  aiAgentService,
  type AIAgent,
  type AIAgentPayload,
  type AgentMetrics,
} from '../services/aiAgents';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';
import { AgentChatTest } from '../components/agents/AgentChatTest';
import { AgentDashboard } from '../components/agents/AgentDashboard';
import { AgentFlowSteps } from '../components/agents/AgentFlowSteps';
import { AgentForm } from '../components/agents/AgentForm';
import {
  AgentPresetGrid,
  type PresetAgent,
} from '../components/agents/AgentPresetGrid';
import { AgentSidebar } from '../components/agents/AgentSidebar';
import { AgentStatusBadge } from '../components/agents/AgentStatusBadge';
import { SwarmBuilder } from '../components/agents/SwarmBuilder';

type AgentType = 'orchestrator' | 'specialist';

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
  handoff_rules: Record<string, any>;
  agent_type: AgentType;
  sub_agents: string[];
  share_prompt_with_subagents: boolean;
};

type ReadinessItem = {
  id: string;
  label: string;
  detail: string;
  ready: boolean;
};

type ReadinessReport = {
  items: ReadinessItem[];
  blockers: string[];
  connectedTools: ToolCatalogItem[];
  availableTools: ToolCatalogItem[];
  connectedSpecialists: AIAgent[];
  availableSpecialists: AIAgent[];
};

type ToolCatalogItem = {
  id: string;
  label: string;
};

const STATUS_ACTIVE = ['Ativo', 'Em teste'];

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  site: 'Site',
  crm: 'CRM',
  instagram: 'Instagram',
  email: 'E-mail',
};

const TOOL_CATALOG: ToolCatalogItem[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'crm', label: 'CRM' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'pdf-reader', label: 'Leitor de PDF' },
  { id: 'audio-stt', label: 'Transcrição de áudio' },
  { id: 'matchmaking', label: 'Match de imóveis' },
  { id: 'follow-up', label: 'Follow-up' },
  { id: 'notificar-corretor', label: 'Notificar corretor' },
  { id: 'criar-tarefa', label: 'Criar tarefa' },
  { id: 'mover-etapa-funil', label: 'Mover etapa do funil' },
  { id: 'simulador-financiamento', label: 'Simulador financeiro' },
  { id: 'neural-sales', label: 'Neural Sales' },
  { id: 'voice-ai', label: 'Voice AI' },
];

const FIELD_ALIASES: Record<string, keyof BuilderState> = {
  responseStyle: 'response_style',
  agentType: 'agent_type',
  autonomyLevel: 'autonomy_level',
  sharePromptWithSubAgents: 'share_prompt_with_subagents',
};

const defaultHandoff: Record<string, any> = {
  visit_requested: true,
  price_negotiation: true,
  sensitive_document: true,
  high_intent: true,
  angry_lead: true,
  low_confidence: true,
  property_unavailable: true,
  audio_enabled: false,
  audio_voice: 'pt-BR-FranciscaNeural',
};

const DEFAULTS: BuilderState = {
  name: '',
  role: 'Atendimento e qualificação de leads',
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
    role: 'Atendimento e qualificação',
    description:
      'Recebe o lead 24/7, entende contexto, faz triagem comercial e agenda o próximo passo.',
    tags: ['Atendimento', 'WhatsApp', 'Qualificação'],
    avatar: 'Z',
  },
  {
    name: 'Otto',
    role: 'Copiloto do corretor',
    description:
      'Lê o histórico do cliente, sugere a próxima mensagem e organiza retornos no CRM.',
    tags: ['Follow-up', 'Copiloto', 'CRM'],
    avatar: 'O',
  },
  {
    name: 'Nexus',
    role: 'Especialista em integrações',
    description:
      'Centraliza entradas de portais e mídia paga para abastecer o funil automaticamente.',
    tags: ['Integração', 'Portais', 'Ads'],
    avatar: 'N',
  },
  {
    name: 'Max',
    role: 'Gestor de tráfego',
    description:
      'Retroalimenta campanhas com sinais do CRM para otimizar investimento e qualidade dos leads.',
    tags: ['Ads', 'Tráfego', 'Performance'],
    avatar: 'M',
  },
  {
    name: 'Íris',
    role: 'Analista de dados',
    description:
      'Consolida ROI, CPL e relatórios para apoiar decisões comerciais e de marketing.',
    tags: ['Dados', 'BI', 'Relatórios'],
    avatar: 'Í',
  },
  {
    name: 'Eco',
    role: 'Especialista em reativação',
    description:
      'Recupera leads frios com cadências automáticas de mensagem e contexto comercial.',
    tags: ['Reengajamento', 'E-mail', 'Retenção'],
    avatar: 'E',
  },
];

function presetToBuilder(preset: PresetAgent): BuilderState {
  const map: Record<string, Partial<BuilderState>> = {
    Zya: {
      personality: 'Consultiva, objetiva e acolhedora.',
      instructions:
        'Descubra objetivo, cidade, faixa de valor e prazo. Atualize o lead e acione um especialista quando houver intenção forte.',
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
        'Detecte promessas de retorno, visitas e horários. Proponha follow-ups e mensagens curtas para o corretor.',
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
      agent_type: 'specialist',
    },
    Nexus: {
      personality: 'Técnico, silencioso e preciso.',
      instructions:
        'Monitore origens de leads e crie cards no Kanban imediatamente, com contexto de origem e campanha.',
      capabilities: ['Kanban comercial', 'Atendimento inicial'],
      tools: ['crm', 'kanban', 'notificar-corretor', 'mover-etapa-funil'],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
      agent_type: 'specialist',
    },
    Max: {
      personality: 'Analítico e focado em ROI.',
      instructions:
        'Analise leads ganhos e perdidos e transforme isso em feedback acionável para mídia paga.',
      capabilities: ['Documentação', 'Match de imóveis'],
      tools: ['crm', 'neural-sales'],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
      agent_type: 'specialist',
    },
    Íris: {
      personality: 'Clara, visual e estratégica.',
      instructions:
        'Cruze investimento, vendas e produtividade do time. Destaque desvios e oportunidades.',
      capabilities: ['Documentação', 'Follow-up'],
      tools: ['crm'],
      autonomy_level: 2,
      operation_mode: 'Semiautônomo',
      agent_type: 'specialist',
    },
    Eco: {
      personality: 'Persistente, empática e focada em reativar.',
      instructions:
        'Se o lead não responde há 30 dias, acione uma cadência de reengajamento adequada ao histórico.',
      capabilities: ['Follow-up', 'Kanban comercial'],
      tools: ['crm', 'follow-up', 'whatsapp', 'notificar-corretor'],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
      agent_type: 'specialist',
    },
  };

  return {
    ...DEFAULTS,
    name: preset.name,
    role: preset.role,
    ...(map[preset.name] || {}),
  };
}

function formatChannels(channels: string[]) {
  return channels
    .map((channel) => CHANNEL_LABELS[channel] || channel)
    .join(', ');
}

function evaluateReadiness(
  draft: BuilderState,
  agents: AIAgent[],
  targetStatus = draft.status
): ReadinessReport {
  const specialists = agents.filter(
    (agent) => agent.agent_type === 'specialist'
  );
  const connectedSpecialists = specialists.filter((agent) =>
    draft.sub_agents.includes(agent.id)
  );
  const availableSpecialists = specialists.filter(
    (agent) => !draft.sub_agents.includes(agent.id)
  );
  const connectedTools = TOOL_CATALOG.filter((tool) =>
    draft.tools.includes(tool.id)
  );
  const availableTools = TOOL_CATALOG.filter(
    (tool) => !draft.tools.includes(tool.id)
  );
  const trimmedPrompt = draft.instructions.trim();
  const uniqueIdentityReady = Boolean(draft.name.trim() && draft.role.trim());
  const promptReady = trimmedPrompt.length >= 40;
  const channelsReady = draft.channels.length > 0;
  const toolsReady = draft.tools.length > 0;
  const autonomyReady = draft.autonomy_level > 0;
  const specialistsReady =
    draft.agent_type === 'specialist' || connectedSpecialists.length > 0;
  const activeReady = STATUS_ACTIVE.includes(targetStatus);

  const items: ReadinessItem[] = [
    {
      id: 'identity',
      label:
        draft.agent_type === 'orchestrator'
          ? 'Agente principal'
          : 'Identidade do especialista',
      detail: uniqueIdentityReady
        ? `${draft.name.trim()} • ${draft.role.trim()}`
        : 'Defina nome e função para diferenciar este agente.',
      ready: uniqueIdentityReady,
    },
    {
      id: 'status',
      label: 'Status operacional',
      detail: activeReady
        ? `Pronto para operar como ${targetStatus.toLowerCase()}.`
        : 'Ainda está em modo de rascunho ou pausado.',
      ready: activeReady,
    },
    {
      id: 'prompt',
      label: 'Prompt e contexto',
      detail: promptReady
        ? 'Prompt definido com instruções suficientes para operar.'
        : 'Descreva contexto, limites e critérios de decisão do agente.',
      ready: promptReady,
    },
    {
      id: 'channels',
      label: 'Canal de atuação',
      detail: channelsReady
        ? formatChannels(draft.channels)
        : 'Selecione ao menos um canal de atendimento.',
      ready: channelsReady,
    },
    {
      id: 'tools',
      label: 'Ferramentas conectadas',
      detail: toolsReady
        ? `${connectedTools.length} ferramenta(s) habilitada(s).`
        : 'Selecione ao menos uma ferramenta para este agente operar.',
      ready: toolsReady,
    },
    {
      id: 'autonomy',
      label: 'Autonomia definida',
      detail: autonomyReady
        ? `Nível ${draft.autonomy_level} configurado para a operação.`
        : 'Defina um nível de autonomia antes de publicar.',
      ready: autonomyReady,
    },
  ];

  if (draft.agent_type === 'orchestrator') {
    items.splice(2, 0, {
      id: 'specialists',
      label: 'Especialistas conectados',
      detail: specialistsReady
        ? `${connectedSpecialists.length} especialista(s) disponível(is) para apoio.`
        : 'Conecte pelo menos um especialista para publicar o orquestrador.',
      ready: specialistsReady,
    });
  }

  const blockers = activeReady
    ? items.filter((item) => !item.ready).map((item) => item.detail)
    : [];

  return {
    items,
    blockers,
    connectedTools,
    availableTools,
    connectedSpecialists,
    availableSpecialists,
  };
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
    () => agents.find((agent) => agent.id === selectedId),
    [agents, selectedId]
  );

  const propertyPath = pathname.startsWith('/rural')
    ? '/rural/properties/new'
    : '/urban/properties/new';

  const readiness = useMemo(
    () => evaluateReadiness(draft, agents, draft.status),
    [agents, draft]
  );

  const publishReadiness = useMemo(
    () => evaluateReadiness(draft, agents, 'Ativo'),
    [agents, draft]
  );

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const loaded = await aiAgentService.list();
      setAgents(loaded);
    } catch (err: any) {
      toast.error(`Erro ao carregar agentes: ${err.message}`);
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
    if (!selectedAgent) {
      return;
    }

    setDraft({
      name: selectedAgent.name,
      role: selectedAgent.role,
      personality: selectedAgent.personality || '',
      instructions: selectedAgent.instructions || '',
      response_style: selectedAgent.response_style || 'consultivo',
      status:
        selectedAgent.status || (selectedAgent.is_active ? 'Ativo' : 'Pausado'),
      channels: selectedAgent.channels?.length
        ? selectedAgent.channels
        : [selectedAgent.channel || 'whatsapp'],
      capabilities: selectedAgent.capabilities?.length
        ? selectedAgent.capabilities
        : DEFAULTS.capabilities,
      tools: selectedAgent.tools?.length ? selectedAgent.tools : DEFAULTS.tools,
      autonomy_level: selectedAgent.autonomy_level || 2,
      operation_mode: selectedAgent.operation_mode || 'Semiautônomo',
      handoff_rules: {
        ...defaultHandoff,
        ...(selectedAgent.handoff_rules || {}),
      },
      agent_type: selectedAgent.agent_type || 'specialist',
      sub_agents: selectedAgent.sub_agents || [],
      share_prompt_with_subagents: Boolean(
        selectedAgent.share_prompt_with_subagents
      ),
    });
  }, [selectedAgent]);

  useEffect(() => {
    if (selectedAgent) {
      loadMetrics(selectedAgent.id);
      return;
    }

    setMetrics(null);
  }, [loadMetrics, selectedAgent]);

  const selectAgent = (id: string) => {
    setSelectedId(id);
    setView(
      id !== 'new' && agents.some((agent) => agent.id === id)
        ? 'dashboard'
        : 'builder'
    );
  };

  const editAgent = (id: string) => {
    setSelectedId(id);
    setView('builder');
    setMainTab('specialists');
  };

  const startNew = (type: AgentType = 'orchestrator') => {
    setMainTab('specialists');
    setSelectedId('new');
    setDraft({ ...DEFAULTS, agent_type: type, sub_agents: [] });
    setView('builder');
  };

  const applyPreset = (preset: PresetAgent) => {
    setMainTab('specialists');
    setSelectedId('new');
    setDraft(presetToBuilder(preset));
    setView('builder');
    toast.success(`${preset.name} carregado como modelo.`);
  };

  const updateDraft = (field: string, value: any) => {
    const normalizedField =
      FIELD_ALIASES[field] || (field as keyof BuilderState);
    setDraft((current) => ({ ...current, [normalizedField]: value }));
  };

  const toggleArray = (
    field: 'capabilities' | 'tools' | 'sub_agents',
    value: string
  ) => {
    setDraft((current) => {
      const currentValues = current[field] || [];
      return {
        ...current,
        [field]: currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      };
    });
  };

  const toggleChannel = (value: string) => {
    setDraft((current) => {
      const currentChannels = current.channels || [];
      const nextChannels = currentChannels.includes(value)
        ? currentChannels.filter((channel) => channel !== value)
        : [...currentChannels, value];

      return {
        ...current,
        channels: nextChannels.length ? nextChannels : ['whatsapp'],
      };
    });
  };

  const toggleHandoff = (ruleId: string) => {
    setDraft((current) => ({
      ...current,
      handoff_rules: {
        ...current.handoff_rules,
        [ruleId]: !current.handoff_rules[ruleId],
      },
    }));
  };

  const saveAgent = async (finalStatus?: string) => {
    const status = finalStatus || draft.status;
    const validation = evaluateReadiness(draft, agents, status);

    if (!draft.name.trim() || !draft.role.trim()) {
      toast.error('Informe nome e função do agente.');
      return;
    }

    if (STATUS_ACTIVE.includes(status) && validation.blockers.length > 0) {
      toast.error(
        'Complete os itens obrigatórios antes de publicar este agente.'
      );
      return;
    }

    const payload: AIAgentPayload = {
      name: draft.name.trim(),
      role: draft.role.trim(),
      channel: draft.channels[0] || 'whatsapp',
      channels: draft.channels,
      personality: draft.personality,
      instructions: draft.instructions,
      response_style: draft.response_style,
      status,
      is_active: STATUS_ACTIVE.includes(status),
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
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async () => {
    if (!selectedAgent || !confirm(`Excluir "${selectedAgent.name}"?`)) {
      return;
    }

    try {
      await aiAgentService.remove(selectedAgent.id);
      setSelectedId('new');
      setView('builder');
      setDraft(DEFAULTS);
      await loadAgents();
      toast.success('Agente removido.');
    } catch (err: any) {
      toast.error(`Erro ao remover: ${err.message}`);
    }
  };

  const toggleStatus = async () => {
    if (!selectedAgent) {
      return;
    }

    if (!selectedAgent.is_active) {
      const validation = evaluateReadiness(draft, agents, 'Ativo');
      if (validation.blockers.length > 0) {
        setView('builder');
        toast.error('Complete a configuração antes de ativar este agente.');
        return;
      }
    }

    try {
      await aiAgentService.update(selectedAgent.id, {
        is_active: !selectedAgent.is_active,
      });
      await loadAgents();
      toast.success(
        selectedAgent.is_active ? 'Agente pausado.' : 'Agente ativado.'
      );
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
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
    <div className="min-h-full bg-[#F5F7FB] -m-3 text-slate-950 sm:-m-4 md:-m-6">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:px-7 xl:h-20 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 shadow-sm">
              <Home className="text-emerald-400" size={21} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold leading-none tracking-tight">
                {COMMERCIAL_PRODUCT_NAME}
              </div>
              <div className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Central de agentes imobiliários
              </div>
            </div>
          </div>

          <div className="relative max-w-xl flex-1 xl:mx-6">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-[#F8FAFD] pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Buscar agentes por nome, função, canal ou ferramenta"
            />
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={propertyPath}
              className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <Plus size={17} />
              Novo imóvel
            </Link>
            <button
              onClick={() => startNew('orchestrator')}
              className="flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Bot size={17} />
              Novo orquestrador
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-7">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-6 flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setMainTab('swarms')}
              className={`px-4 pb-3 text-sm font-bold transition ${
                mainTab === 'swarms'
                  ? 'border-b-2 border-emerald-500 text-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Orquestradores
            </button>
            <button
              onClick={() => setMainTab('specialists')}
              className={`px-4 pb-3 text-sm font-bold transition ${
                mainTab === 'specialists'
                  ? 'border-b-2 border-emerald-500 text-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Biblioteca de agentes
            </button>
          </div>

          {mainTab === 'swarms' ? (
            <SwarmBuilder
              agents={agents}
              onSelectAgent={(id) => {
                setMainTab('specialists');
                editAgent(id);
              }}
              onCreateNew={() => startNew('orchestrator')}
              onCreateSpecialist={() => startNew('specialist')}
            />
          ) : selectedId === 'new' && !selectedAgent && agents.length === 0 ? (
            <div className="space-y-5">
              <AgentOnboardingCard onCreate={startNew} />
              <AgentPresetGrid presets={presets} onSelect={applyPreset} />
              <AgentFlowSteps />
              <BuilderView
                draft={draft}
                readiness={readiness}
                publishReadiness={publishReadiness}
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
                    allAgents={agents}
                    metrics={metrics}
                    metricsLoading={metricsLoading}
                    onEdit={() => setView('builder')}
                    onToggleStatus={toggleStatus}
                    onTest={() => setView('builder')}
                  />
                ) : (
                  <>
                    <AgentPresetGrid presets={presets} onSelect={applyPreset} />
                    <BuilderView
                      draft={draft}
                      readiness={readiness}
                      publishReadiness={publishReadiness}
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
  readiness: ReadinessReport;
  publishReadiness: ReadinessReport;
  saving: boolean;
  agents: AIAgent[];
  onChange: (field: string, value: any) => void;
  onToggleArray: (
    field: 'capabilities' | 'tools' | 'sub_agents',
    value: string
  ) => void;
  onToggleChannel: (value: string) => void;
  onToggleHandoff: (ruleId: string) => void;
  onSave: (status?: string) => void;
  onNew: (type?: AgentType) => void;
  selectedAgent?: AIAgent;
  onDelete?: () => void;
  onViewDashboard?: () => void;
}

const BuilderView: React.FC<BuilderViewProps> = ({
  draft,
  readiness,
  publishReadiness,
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
}) => {
  const canPublish = publishReadiness.blockers.length === 0;

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
              <Bot size={15} />
              IA e automação comercial
            </div>
            <h1 className="mb-0 mt-4 text-3xl font-bold tracking-tight text-slate-950">
              {selectedAgent
                ? `Editando: ${selectedAgent.name}`
                : draft.agent_type === 'orchestrator'
                  ? 'Novo orquestrador'
                  : 'Novo especialista'}
            </h1>
            <p className="mb-0 mt-2 text-sm font-medium text-slate-500">
              Monte um agente com identidade clara, canais definidos e operação
              pronta para o time comercial.
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
                <Trash2 size={15} />
                Excluir
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              {draft.agent_type === 'orchestrator' ? (
                <Users size={20} />
              ) : (
                <Settings2 size={20} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                  {draft.agent_type === 'orchestrator'
                    ? 'Agente principal'
                    : 'Especialista de apoio'}
                </span>
                {canPublish ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                    <BadgeCheck size={12} />
                    Pronto para publicar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                    <AlertTriangle size={12} />
                    Ajustes pendentes
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-950">
                {draft.name.trim() || 'Defina a identidade do agente'}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {draft.role.trim() ||
                  'Escolha a função operacional antes de publicar.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {draft.channels.map((channel) => (
                  <span
                    key={channel}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
                  >
                    {CHANNEL_LABELS[channel] || channel}
                  </span>
                ))}
                {draft.channels.length === 0 && (
                  <span className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                    Nenhum canal ativo
                  </span>
                )}
              </div>
            </div>
          </div>

          {draft.personality.trim() && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Identidade verbal
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                {draft.personality}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Prontidão operacional
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            {readiness.items.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 ${
                  item.ready
                    ? 'border-emerald-100 bg-emerald-50/70'
                    : 'border-amber-100 bg-amber-50/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      item.ready
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {item.ready ? (
                      <BadgeCheck size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {item.label}
                    </div>
                    <div className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                      {item.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!canPublish && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <AlertTriangle size={16} />
                Publicação bloqueada até concluir os itens abaixo
              </div>
              <ul className="mt-3 space-y-2 text-xs font-medium text-amber-800">
                {publishReadiness.blockers.map((blocker) => (
                  <li key={blocker}>• {blocker}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Ferramentas conectadas
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {readiness.connectedTools.map((tool) => (
              <span
                key={tool.id}
                className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
              >
                {tool.label}
              </span>
            ))}
            {readiness.connectedTools.length === 0 && (
              <span className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                Nenhuma ferramenta conectada
              </span>
            )}
          </div>

          <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Disponíveis para ativar
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {readiness.availableTools.map((tool) => (
              <span
                key={tool.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500"
              >
                {tool.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Especialistas conectados
          </div>
          <div className="mt-3 space-y-3">
            {readiness.connectedSpecialists.map((specialist) => (
              <div
                key={specialist.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="text-sm font-bold text-slate-900">
                  {specialist.name}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  {specialist.role}
                </div>
              </div>
            ))}
            {readiness.connectedSpecialists.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                {draft.agent_type === 'orchestrator'
                  ? 'Conecte pelo menos um especialista para cobrir tarefas de apoio e liberar a publicação.'
                  : 'Especialistas não precisam conectar outros agentes para operar.'}
              </div>
            )}
          </div>

          {draft.agent_type === 'orchestrator' &&
            readiness.availableSpecialists.length > 0 && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Disponíveis para conexão
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {readiness.availableSpecialists.map((specialist) => (
                    <button
                      key={specialist.id}
                      type="button"
                      onClick={() => onToggleArray('sub_agents', specialist.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {specialist.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => onNew('orchestrator')}
              className="flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Novo orquestrador
            </button>
            <button
              onClick={() => onNew('specialist')}
              className="flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Novo especialista
            </button>
          </div>

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
              disabled={saving || !canPublish}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
};

const AgentOnboardingCard: React.FC<{
  onCreate: (type?: AgentType) => void;
}> = ({ onCreate }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,.14),transparent_30%),#0f172a] p-6 text-white lg:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200">
          <Sparkles size={14} />
          Onboarding guiado
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Estruture primeiro o agente principal, depois a equipe de apoio
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-200">
          Esta área foi organizada para evitar agentes genéricos ou publicados
          sem contexto. Comece por um orquestrador e conecte especialistas só
          onde houver operação real.
        </p>
      </div>

      <div className="space-y-4 p-6 lg:p-8">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Como começar
          </div>
          <div className="mt-3 space-y-3 text-sm font-medium text-slate-700">
            <div>1. Defina nome, função e prompt do agente principal.</div>
            <div>2. Conecte canais, ferramentas e autonomia de operação.</div>
            <div>
              3. Vincule especialistas antes de publicar o orquestrador.
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => onCreate('orchestrator')}
            className="flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
          >
            Criar orquestrador
          </button>
          <button
            onClick={() => onCreate('specialist')}
            className="flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Criar especialista
          </button>
        </div>
      </div>
    </div>
  </section>
);

export default AIAgents;
