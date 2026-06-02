import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BellRing,
  BookOpen,
  Bot,
  CalendarClock,
  ChevronLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Database,
  FileSearch,
  FileText,
  Gauge,
  Headphones,
  Home,
  LayoutGrid,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Mic,
  MoveRight,
  PhoneCall,
  Play,
  Plus,
  Radio,
  Repeat2,
  Rocket,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
  UserPlus,
  WandSparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { aiAgentService, type AIAgent, type AIAgentPayload } from '../services/aiAgents';

type BuilderDraft = AIAgentPayload & {
  status?: string;
  autonomy_level?: number;
  channels?: string[];
  instances?: string[];
  description?: string;
  operation_mode?: string;
  channel_scope?: string;
  handoff?: Record<string, unknown>;
};

type TemplatePreset = {
  name: string;
  role: string;
  description: string;
  tags: string[];
  accent: string;
  avatar: string;
  payload: BuilderDraft;
};

type Option = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
};

const channels = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'site', label: 'Site' },
  { id: 'crm', label: 'CRM' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'email', label: 'E-mail' },
];

const wooInstances = ['WooAPI Principal', 'WooAPI Vendas', 'WooAPI Locação', 'WooAPI Pós-venda'];

const workspaces: Option[] = [
  {
    id: 'Atendimento inicial',
    label: 'Atendimento inicial',
    description: 'Recebe leads, responde dúvidas e inicia qualificação.',
    icon: MessageSquareText,
  },
  {
    id: 'Kanban comercial',
    label: 'Kanban comercial',
    description: 'Cria cards, atualiza etapas e registra próximos passos.',
    icon: LayoutGrid,
  },
  {
    id: 'Documentação',
    label: 'Documentação',
    description: 'Classifica documentos, PDFs e pendências do processo.',
    icon: FileSearch,
  },
  {
    id: 'Follow-up',
    label: 'Follow-up',
    description: 'Mantém retorno comercial com timing e contexto.',
    icon: Repeat2,
  },
  {
    id: 'Agenda',
    label: 'Agenda',
    description: 'Sugere horários e organiza visitas com o time.',
    icon: CalendarClock,
  },
  {
    id: 'Match de imóveis',
    label: 'Match de imóveis',
    description: 'Cruza perfil do lead com oportunidades da carteira.',
    icon: Home,
  },
  {
    id: 'Pós-venda',
    label: 'Pós-venda',
    description: 'Acompanha satisfação, tarefas e novas oportunidades.',
    icon: BadgeCheck,
  },
];

const autonomyLevels = [
  {
    id: 1,
    label: 'Assistido',
    description: 'Sugere ações, mas precisa de aprovação humana.',
    icon: ShieldCheck,
  },
  {
    id: 2,
    label: 'Semiautônomo',
    description: 'Executa ações simples e pede aprovação em casos críticos.',
    icon: Gauge,
  },
  {
    id: 3,
    label: 'Autônomo',
    description: 'Responde, movimenta Kanban, agenda follow-ups e aciona humanos quando necessário.',
    icon: Zap,
  },
];

const toolOptions = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'agenda', label: 'Agenda', icon: CalendarClock },
  { id: 'crm', label: 'CRM', icon: Database },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'pdf-reader', label: 'PDF Reader', icon: FileSearch },
  { id: 'audio-stt', label: 'Audio STT', icon: Mic },
  { id: 'matchmaking', label: 'Matchmaking', icon: Sparkles },
  { id: 'follow-up', label: 'Follow-up', icon: Repeat2 },
  { id: 'notificar-corretor', label: 'Notificação ao corretor', icon: BellRing },
  { id: 'criar-tarefa', label: 'Criar tarefa', icon: ClipboardCheck },
  { id: 'mover-etapa-funil', label: 'Mover etapa do funil', icon: MoveRight },
];

const handoffRules = [
  { id: 'visit_requested', label: 'Lead pediu visita' },
  { id: 'price_negotiation', label: 'Lead quer negociar valor' },
  { id: 'sensitive_document', label: 'Lead enviou documento sensível' },
  { id: 'high_intent', label: 'Lead demonstrou alta intenção' },
  { id: 'angry_lead', label: 'Lead ficou irritado' },
  { id: 'low_confidence', label: 'IA não tem certeza' },
  { id: 'property_unavailable', label: 'Imóvel não está disponível' },
];

const tabs = [
  { id: 'identity', label: 'Identidade', icon: UserCheck },
  { id: 'channels', label: 'Canais', icon: Radio },
  { id: 'operation', label: 'Operação', icon: Workflow },
  { id: 'tools', label: 'Ferramentas', icon: Settings2 },
  { id: 'rules', label: 'Regras', icon: ShieldCheck },
  { id: 'test', label: 'Teste', icon: Play },
];

const flowSteps = [
  { title: 'Lead entrou', subtitle: 'Novo contato captado', icon: PhoneCall },
  { title: 'IA atende', subtitle: 'Resposta instantânea', icon: Bot },
  { title: 'IA qualifica', subtitle: 'Entende necessidade', icon: ClipboardCheck },
  { title: 'Sugere imóvel', subtitle: 'Opções personalizadas', icon: Home },
  { title: 'Agenda visita', subtitle: 'Sincroniza agenda', icon: CalendarClock },
  { title: 'Corretor assume', subtitle: 'Recebe contexto', icon: UserPlus },
  { title: 'Follow-up automático', subtitle: 'Acompanha interesse', icon: Repeat2 },
];

const defaultHandoff = {
  visit_requested: true,
  price_negotiation: true,
  sensitive_document: true,
  high_intent: true,
  angry_lead: true,
  low_confidence: true,
  property_unavailable: true,
};

const emptyAgent: BuilderDraft = {
  name: '',
  role: 'Atendimento e Qualificação de Leads',
  channel: 'whatsapp',
  channels: ['whatsapp'],
  instances: ['WooAPI Principal'],
  is_active: true,
  status: 'Ativo',
  personality: '',
  instructions: '',
  capabilities: ['Atendimento inicial', 'Kanban comercial', 'Follow-up'],
  tools: ['whatsapp', 'kanban', 'crm', 'follow-up', 'notificar-corretor'],
  response_style: 'consultivo',
  autonomy_level: 2,
  operation_mode: 'Semiautônomo',
  channel_scope: 'Omnichannel CRM',
  handoff_rules: defaultHandoff,
};

const presets: TemplatePreset[] = [
  {
    name: 'Lia Qualificação',
    role: 'SDR Imobiliário',
    description: 'Atende leads, identifica perfil de compra e cria oportunidades qualificadas.',
    tags: ['Qualificação', 'Atendimento'],
    accent: 'from-slate-700 to-slate-950',
    avatar: 'L',
    payload: {
      ...emptyAgent,
      name: 'Lia Qualificação',
      role: 'SDR Imobiliário',
      personality: 'Consultiva, objetiva e acolhedora. Faz perguntas curtas, humanas e orientadas à conversão.',
      instructions:
        'Descubra objetivo, cidade, faixa de valor, prazo, forma de pagamento e tipo de imóvel. Atualize o lead sem parecer robótico e acione corretor quando houver intenção forte.',
      capabilities: ['Atendimento inicial', 'Kanban comercial', 'Match de imóveis', 'Follow-up'],
      tools: ['whatsapp', 'kanban', 'crm', 'matchmaking', 'follow-up', 'notificar-corretor', 'mover-etapa-funil'],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
    },
  },
  {
    name: 'Nina Documentos',
    role: 'Analista documental',
    description: 'Confere documentos, aponta pendências e sinaliza riscos para o time.',
    tags: ['Documentos', 'Checklists'],
    accent: 'from-slate-700 to-slate-950',
    avatar: 'N',
    payload: {
      ...emptyAgent,
      name: 'Nina Documentos',
      role: 'Analista documental',
      personality: 'Precisa, calma e cuidadosa. Explica pendências com linguagem simples e segura.',
      instructions:
        'Classifique RG, CPF, matrícula, comprovantes, contratos e documentos urbanos ou rurais. Marque pendências e mova o card para Documentação.',
      capabilities: ['Documentação', 'Kanban comercial', 'Pós-venda'],
      tools: ['documentos', 'pdf-reader', 'kanban', 'crm', 'notificar-corretor', 'criar-tarefa'],
      autonomy_level: 2,
      operation_mode: 'Semiautônomo',
    },
  },
  {
    name: 'Theo Retorno',
    role: 'Follow-up comercial',
    description: 'Retoma conversas, agenda retornos e reduz perda de oportunidades.',
    tags: ['Follow-up', 'Reengajamento'],
    accent: 'from-amber-500 to-orange-500',
    avatar: 'T',
    payload: {
      ...emptyAgent,
      name: 'Theo Retorno',
      role: 'Follow-up comercial',
      response_style: 'curto',
      personality: 'Persistente sem ser invasivo. Direto, cordial e sempre orientado ao próximo passo.',
      instructions:
        'Detecte promessas de retorno, visitas e horários. Crie follow-ups e sugira mensagens curtas para retomar contato.',
      capabilities: ['Follow-up', 'Agenda', 'Kanban comercial'],
      tools: ['agenda', 'follow-up', 'whatsapp', 'crm', 'criar-tarefa', 'notificar-corretor'],
      autonomy_level: 2,
      operation_mode: 'Semiautônomo',
    },
  },
  {
    name: 'Maya Match',
    role: 'Recomendação de imóveis',
    description: 'Cruza orçamento, cidade e preferências com imóveis disponíveis.',
    tags: ['Match', 'Recomendação'],
    accent: 'from-slate-700 to-slate-950',
    avatar: 'M',
    payload: {
      ...emptyAgent,
      name: 'Maya Match',
      role: 'Recomendação de imóveis',
      personality: 'Analítica e elegante. Recomenda com base em critérios claros e contexto comercial.',
      instructions:
        'Compare perfil do lead com imóveis ativos. Priorize aderência de preço, localização, finalidade e urgência. Explique a recomendação em poucas linhas.',
      capabilities: ['Match de imóveis', 'Atendimento inicial', 'Kanban comercial'],
      tools: ['matchmaking', 'crm', 'kanban', 'whatsapp', 'mover-etapa-funil'],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
    },
  },
  {
    name: 'Bruno Visitas',
    role: 'Agendamento de visitas',
    description: 'Organiza agenda, confirma disponibilidade e prepara o corretor.',
    tags: ['Agenda', 'Visitas'],
    accent: 'from-emerald-500 to-teal-500',
    avatar: 'B',
    payload: {
      ...emptyAgent,
      name: 'Bruno Visitas',
      role: 'Agendamento de visitas',
      personality: 'Organizado, claro e prático. Confirma dados essenciais antes de acionar o corretor.',
      instructions:
        'Quando o lead pedir visita, confirme imóvel, dia, horário, participantes e canal de confirmação. Acione o corretor com resumo completo.',
      capabilities: ['Agenda', 'Atendimento inicial', 'Follow-up'],
      tools: ['agenda', 'whatsapp', 'crm', 'notificar-corretor', 'criar-tarefa'],
      autonomy_level: 2,
      operation_mode: 'Semiautônomo',
    },
  },
];

const AIAgents: React.FC = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string>('new');
  const [draft, setDraft] = useState<BuilderDraft>(emptyAgent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const [testPrompt, setTestPrompt] = useState('Oi, procuro um apartamento até R$350 mil em São José.');
  const [testRan, setTestRan] = useState(false);
  const { pathname } = useLocation();

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedId),
    [agents, selectedId]
  );

  const activeAgents = useMemo(() => agents.filter((agent) => agent.is_active).length, [agents]);
  const pausedAgents = useMemo(() => agents.length - activeAgents, [agents, activeAgents]);
  const propertyPath = pathname.startsWith('/rural') ? '/rural/properties/new' : '/urban/properties/new';
  const activeStepIndex = Math.max(tabs.findIndex((tab) => tab.id === activeTab), 0);
  const activeStep = tabs[activeStepIndex] || tabs[0];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === tabs.length - 1;

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      const agent = selectedAgent as AIAgent & BuilderDraft;
      setDraft({
        name: agent.name,
        role: agent.role,
        channel: agent.channel || 'whatsapp',
        channels: agent.channels?.length ? agent.channels : [agent.channel || 'whatsapp'],
        instances: agent.instances?.length ? agent.instances : ['WooAPI Principal'],
        is_active: agent.is_active,
        status: agent.status || (agent.is_active ? 'Ativo' : 'Pausado'),
        personality: agent.personality || '',
        instructions: agent.instructions || '',
        capabilities: agent.capabilities?.length ? agent.capabilities : emptyAgent.capabilities,
        tools: agent.tools?.length ? agent.tools : emptyAgent.tools,
        response_style: agent.response_style || 'consultivo',
        autonomy_level: agent.autonomy_level || 2,
        operation_mode: agent.operation_mode || 'Semiautônomo',
        channel_scope: agent.channel_scope || 'Omnichannel CRM',
        handoff_rules: {
          ...defaultHandoff,
          ...(agent.handoff_rules || {}),
        },
      });
      return;
    }

    setDraft(emptyAgent);
  }, [selectedAgent]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setAgents(await aiAgentService.list());
    } catch (error: any) {
      toast.error('Erro ao carregar agentes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (id: string) => {
    setActiveTab(id);
  };

  const goToPreviousStep = () => {
    if (isFirstStep) return;
    setActiveTab(tabs[activeStepIndex - 1].id);
  };

  const goToNextStep = () => {
    if (isLastStep) return;
    setActiveTab(tabs[activeStepIndex + 1].id);
  };

  const startBlankAgent = () => {
    setSelectedId('new');
    setDraft({
      ...emptyAgent,
      name: '',
      personality: '',
      instructions: '',
    });
    setActiveTab('identity');
  };

  const usePreset = (preset: TemplatePreset) => {
    setSelectedId('new');
    setDraft({
      ...emptyAgent,
      ...preset.payload,
      handoff_rules: {
        ...defaultHandoff,
        ...(preset.payload.handoff_rules || {}),
      },
    });
    setActiveTab('identity');
    toast.success(`${preset.name} carregado como modelo.`);
  };

  const toggleListValue = (field: 'capabilities' | 'tools', value: string) => {
    const current = draft[field] || [];
    setDraft({
      ...draft,
      [field]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  };

  const toggleChannel = (value: string) => {
    const current = draft.channels || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    const safeNext = next.length ? next : ['whatsapp'];
    setDraft({
      ...draft,
      channels: safeNext,
      channel: safeNext[0],
    });
  };

  const toggleHandoffRule = (ruleId: string) => {
    setDraft({
      ...draft,
      handoff_rules: {
        ...(draft.handoff_rules || {}),
        [ruleId]: !(draft.handoff_rules || {})[ruleId],
      },
    });
  };

  const resetDraft = () => {
    if (selectedAgent) {
      const agent = selectedAgent as AIAgent & BuilderDraft;
      setDraft({
        ...emptyAgent,
        ...agent,
        channels: agent.channels?.length ? agent.channels : [agent.channel || 'whatsapp'],
        instances: agent.instances?.length ? agent.instances : ['WooAPI Principal'],
        handoff_rules: {
          ...defaultHandoff,
          ...(agent.handoff_rules || {}),
        },
      });
      return;
    }
    startBlankAgent();
  };

  const saveAgent = async (statusOverride?: string) => {
    const nextStatus = statusOverride || draft.status || 'Ativo';

    if (!draft.name || !draft.role) {
      toast.error('Informe nome e função do agente.');
      return;
    }

    const payload: BuilderDraft = {
      ...draft,
      status: nextStatus,
      is_active: nextStatus === 'Ativo' || nextStatus === 'Em teste',
      channel: draft.channels?.[0] || draft.channel || 'whatsapp',
      operation_mode:
        autonomyLevels.find((level) => level.id === Number(draft.autonomy_level || 2))?.label ||
        draft.operation_mode,
      handoff: {
        triggers: Object.entries(draft.handoff_rules || {})
          .filter(([, enabled]) => Boolean(enabled))
          .map(([key]) => key),
      },
    };

    try {
      setSaving(true);
      if (selectedAgent) {
        await aiAgentService.update(selectedAgent.id, payload);
        toast.success(statusOverride === 'Rascunho' ? 'Rascunho salvo.' : 'Agente atualizado.');
      } else {
        const created = await aiAgentService.create(payload);
        setSelectedId(created.id);
        toast.success(statusOverride === 'Rascunho' ? 'Rascunho criado.' : 'Agente publicado.');
      }
      await loadAgents();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeAgent = async () => {
    if (!selectedAgent || !confirm(`Excluir o agente "${selectedAgent.name}"?`)) return;
    await aiAgentService.remove(selectedAgent.id);
    setSelectedId('new');
    await loadAgents();
    toast.success('Agente removido.');
  };

  const runTest = () => {
    setTestRan(true);
    toast.success('Teste executado no simulador.');
  };

  if (loading) {
    return (
      <div className="min-h-[540px] bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-bold">
          <Loader2 className="animate-spin text-emerald-600" size={22} />
          Carregando Central de Agentes
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-auto min-h-16 px-4 py-3 lg:px-7 flex flex-col gap-3 xl:h-20 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-slate-950 flex items-center justify-center shadow-sm">
              <Home className="text-emerald-400" size={21} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black tracking-tight leading-none">IMOBZY</div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mt-1 truncate">
                Imobiliária Tradicional
              </div>
            </div>
          </div>

          <div className="relative flex-1 max-w-2xl xl:mx-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full h-11 rounded-lg border border-slate-200 bg-[#F8FAFD] pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Buscar imóveis, leads, agentes..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={propertyPath}
              className="h-11 px-4 rounded-lg bg-emerald-600 text-white text-sm font-black flex items-center gap-2 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <Plus size={18} />
              Novo imóvel
            </Link>
            <button
              onClick={startBlankAgent}
              className="h-11 px-4 rounded-lg bg-slate-950 text-white text-sm font-black flex items-center gap-2 shadow-sm hover:bg-slate-800"
            >
              <Bot size={18} />
              Novo agente
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-7">
        <div className="mx-auto max-w-[1680px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
          <aside className="xl:col-span-2 rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Central de Agentes</div>
                  <h2 className="mt-2 text-xl font-black tracking-tight mb-0">Modelos e operação</h2>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <WandSparkles size={20} />
                </div>
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3">
              <SidebarItem icon={Sparkles} label="Templates prontos" count={presets.length} active />
              <SidebarItem icon={Activity} label="Agentes ativos" count={activeAgents} />
              <SidebarItem icon={Circle} label="Agentes pausados" count={pausedAgents} />
              <SidebarItem icon={BookOpen} label="Biblioteca de prompts" />
              <SidebarItem icon={ShieldCheck} label="Regras globais" />
              <SidebarItem icon={FileText} label="Logs de execução" />
            </nav>

            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
              {presets.map((preset) => (
                <article key={preset.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start gap-3">
                    <Avatar label={preset.avatar} gradient={preset.accent} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-slate-950 mb-0 truncate">{preset.name}</h3>
                      <p className="text-[11px] font-bold text-slate-500 mb-0">{preset.role}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 mb-0">{preset.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {preset.tags.map((tag) => (
                      <span key={tag} className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => usePreset(preset)}
                    className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-700 hover:bg-slate-100"
                  >
                    Usar modelo
                  </button>
                </article>
              ))}
            </div>

            {agents.length > 0 && (
              <div className="border-t border-slate-100 p-4 pt-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-3">Agentes salvos</div>
                  <div className="flex gap-2 overflow-x-auto">
                    {agents.slice(0, 5).map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedId(agent.id)}
                        className={`min-w-52 rounded-lg border px-3 py-2 text-left transition ${
                          selectedId === agent.id ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-black">{agent.name}</span>
                          <span className={`h-2 w-2 rounded-full ${agent.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 truncate">{agent.role}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 lg:p-7 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700">
                    <Sparkles size={15} />
                    IA e automação
                  </div>
                  <h1 className="mt-4 text-3xl lg:text-4xl font-black tracking-tight text-slate-950 mb-0">
                    Construtor de Agente Autônomo
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm lg:text-base font-medium leading-relaxed text-slate-600 mb-0">
                    Configure agentes que atendem, qualificam, analisam documentos, movimentam leads no Kanban e executam follow-ups automaticamente.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <StatusPill status={draft.status || (draft.is_active ? 'Ativo' : 'Pausado')} />
                  {selectedAgent && (
                    <button
                      onClick={removeAgent}
                      className="h-10 px-3 rounded-lg border border-red-100 bg-red-50 text-red-600 font-black text-xs flex items-center gap-2 hover:bg-red-100"
                    >
                      <Trash2 size={15} />
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-7">
                {flowSteps.map((step, index) => (
                  <div key={step.title} className="relative rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <step.icon size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-950 mb-0 truncate">{step.title}</p>
                        <p className="text-[10px] font-bold text-slate-500 mb-0 truncate">{step.subtitle}</p>
                      </div>
                    </div>
                    {index < flowSteps.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-300 bg-white rounded-full" size={18} />
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-white p-3">
                <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Etapa {activeStepIndex + 1} de {tabs.length}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-black text-slate-950">
                      <activeStep.icon size={16} />
                      {activeStep.label}
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 lg:w-56">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${((activeStepIndex + 1) / tabs.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => goToStep(tab.id)}
                      aria-selected={activeTab === tab.id}
                      className={`h-11 min-w-0 rounded-lg px-3 text-xs font-black flex items-center justify-center gap-2 transition ${
                        activeTab === tab.id
                          ? 'bg-slate-100 text-slate-950'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <tab.icon size={15} className="shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 lg:p-6 min-h-[520px]">
                <section id="agent-identity" className={activeTab === 'identity' ? 'block' : 'hidden'}>
                  <SectionHeading
                    eyebrow="Identidade"
                    title="Perfil operacional do agente"
                    description="Defina nome, função, estilo de atendimento, status e instruções operacionais."
                  />
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Field label="Nome do agente">
                      <input
                        value={draft.name || ''}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="agent-input"
                        placeholder="Ex.: Lia Qualificação"
                      />
                    </Field>
                    <Field label="Função operacional">
                      <input
                        value={draft.role || ''}
                        onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                        className="agent-input"
                        placeholder="Ex.: Atendimento e Qualificação de Leads"
                      />
                    </Field>
                    <Field label="Estilo de atendimento">
                      <select
                        value={draft.response_style || 'consultivo'}
                        onChange={(e) => setDraft({ ...draft, response_style: e.target.value })}
                        className="agent-input"
                      >
                        <option value="consultivo">Consultivo</option>
                        <option value="curto">Curto e direto</option>
                        <option value="tecnico">Técnico</option>
                        <option value="premium">Premium</option>
                      </select>
                    </Field>
                    <Field label="Status">
                      <div className="relative">
                        <select
                          value={draft.status || 'Ativo'}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              status: e.target.value,
                              is_active: e.target.value === 'Ativo' || e.target.value === 'Em teste',
                            })
                          }
                          className="agent-input appearance-none pr-10"
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Em teste">Em teste</option>
                          <option value="Rascunho">Rascunho</option>
                          <option value="Pausado">Pausado</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      </div>
                    </Field>
                    <Field label="Personalidade">
                      <textarea
                        value={draft.personality || ''}
                        onChange={(e) => setDraft({ ...draft, personality: e.target.value })}
                        className="agent-input min-h-28 resize-none"
                        placeholder="Como o agente deve se apresentar, tom de voz, empatia e postura comercial."
                      />
                    </Field>
                    <Field label="Instruções operacionais">
                      <textarea
                        value={draft.instructions || ''}
                        onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                        className="agent-input min-h-28 resize-none"
                        placeholder="Regras, boas práticas, limites e contexto da imobiliária."
                      />
                    </Field>
                  </div>
                </section>

                <section id="agent-channels" className={activeTab === 'channels' ? 'block' : 'hidden'}>
                  <SectionHeading
                    eyebrow="Canais"
                    title="Canais de atuação e instância WooAPI"
                    description="Escolha onde o agente pode conversar e vincule a operação a uma instância de atendimento."
                  />
                  <div className="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {channels.map((channel) => (
                          <button
                            key={channel.id}
                            onClick={() => toggleChannel(channel.id)}
                            className={`h-12 rounded-lg border px-3 text-sm font-black transition ${
                              (draft.channels || []).includes(channel.id)
                                ? 'border-slate-300 bg-slate-100 text-slate-950'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {channel.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Field label="Instância WooAPI">
                      <select
                        value={draft.instances?.[0] || 'WooAPI Principal'}
                        onChange={(e) => setDraft({ ...draft, instances: [e.target.value] })}
                        className="agent-input"
                      >
                        {wooInstances.map((instance) => (
                          <option key={instance} value={instance}>
                            {instance}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </section>

                <section id="agent-operation" className={activeTab === 'operation' ? 'block' : 'hidden'}>
                  <SectionHeading
                    eyebrow="Operação"
                    title="Onde este agente atua?"
                    description="Selecione os processos em que o agente poderá agir dentro da operação imobiliária."
                  />
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => toggleListValue('capabilities', workspace.id)}
                        className={`rounded-lg border p-4 text-left transition ${
                          (draft.capabilities || []).includes(workspace.id)
                            ? 'border-slate-300 bg-slate-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            (draft.capabilities || []).includes(workspace.id)
                              ? 'bg-slate-950 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            <workspace.icon size={18} />
                          </div>
                          {(draft.capabilities || []).includes(workspace.id) && <CheckCircle2 size={18} className="text-slate-900" />}
                        </div>
                        <h3 className="mt-3 text-sm font-black text-slate-950 mb-0">{workspace.label}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 mb-0">{workspace.description}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-7">
                    <SectionHeading
                      eyebrow="Nível de autonomia"
                      title="Defina até onde a IA pode executar"
                      description="O nível controla se o agente apenas sugere, executa tarefas simples ou opera com autonomia."
                    />
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {autonomyLevels.map((level) => (
                        <button
                          key={level.id}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              autonomy_level: level.id,
                              operation_mode: level.label,
                            })
                          }
                          className={`rounded-lg border p-4 text-left transition ${
                            Number(draft.autonomy_level || 2) === level.id
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              Number(draft.autonomy_level || 2) === level.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              <level.icon size={18} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-950 mb-0">{level.label}</h3>
                              <p className="text-[11px] font-bold text-slate-500 mb-0">Nível {level.id}</p>
                            </div>
                          </div>
                          <p className="mt-3 text-xs leading-relaxed text-slate-600 mb-0">{level.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section id="agent-tools" className={activeTab === 'tools' ? 'block' : 'hidden'}>
                  <SectionHeading
                    eyebrow="Ferramentas"
                    title="Ferramentas permitidas"
                    description="Ative os recursos que o agente pode consultar ou executar durante o atendimento."
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {toolOptions.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => toggleListValue('tools', tool.id)}
                        className={`h-10 rounded-lg border px-3 text-xs font-black flex items-center gap-2 transition ${
                          (draft.tools || []).includes(tool.id)
                            ? 'border-slate-300 bg-slate-100 text-slate-950'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <tool.icon size={15} />
                        {tool.label}
                        {(draft.tools || []).includes(tool.id) && <CheckCircle2 size={14} />}
                      </button>
                    ))}
                  </div>
                </section>

                <section id="agent-rules" className={activeTab === 'rules' ? 'block' : 'hidden'}>
                  <SectionHeading
                    eyebrow="Regras"
                    title="Quando acionar humano?"
                    description="Determine os sinais de risco, negociação ou alta intenção que devem transbordar para um corretor."
                  />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {handoffRules.map((rule) => (
                      <label
                        key={rule.id}
                        className={`rounded-lg border p-4 flex items-center gap-3 cursor-pointer transition ${
                          (draft.handoff_rules || {})[rule.id]
                            ? 'border-amber-200 bg-amber-50 text-amber-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-amber-500"
                          checked={Boolean((draft.handoff_rules || {})[rule.id])}
                          onChange={() => toggleHandoffRule(rule.id)}
                        />
                        <span className="text-sm font-black">{rule.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section id="agent-test" className={activeTab === 'test' ? 'block' : 'hidden'}>
                  <SectionHeading
                    eyebrow="Teste"
                    title="Simule uma conversa antes de publicar"
                    description="Envie uma mensagem de exemplo e confira diagnóstico, intenção e próxima ação."
                  />
                  <div className="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px] gap-3">
                    <textarea
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      className="agent-input min-h-20 resize-none"
                      placeholder="Digite uma mensagem de lead para testar."
                    />
                    <button
                      onClick={runTest}
                      className="h-full min-h-20 rounded-lg bg-slate-950 px-4 text-sm font-black text-white flex items-center justify-center gap-2 hover:bg-slate-800"
                    >
                      <Play size={17} />
                      Executar teste
                    </button>
                  </div>
                  {testRan && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                      Simulação pronta no painel de Preview & Teste.
                    </div>
                  )}
                </section>
              </div>
            </section>

            <footer className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  onClick={resetDraft}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    onClick={goToPreviousStep}
                    disabled={isFirstStep}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ChevronLeft size={17} />
                    Voltar
                  </button>
                  {!isLastStep && (
                    <button
                      onClick={goToNextStep}
                      className="h-11 rounded-lg bg-slate-950 px-5 text-sm font-black text-white flex items-center justify-center gap-2 hover:bg-slate-800"
                    >
                      Próxima etapa
                      <ArrowRight size={17} />
                    </button>
                  )}
                  <button
                    onClick={() => saveAgent('Rascunho')}
                    disabled={saving}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                    Salvar rascunho
                  </button>
                  <button
                    onClick={() => saveAgent('Ativo')}
                    disabled={saving}
                    className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-black text-white flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="animate-spin" size={17} /> : <Rocket size={17} />}
                    Publicar agente
                  </button>
                </div>
              </div>
            </footer>
          </main>

          <aside className="2xl:sticky 2xl:top-28 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950 mb-0">Preview & Teste</h2>
                <p className="text-xs font-bold text-slate-500 mb-0 mt-1">Validação antes da publicação</p>
              </div>
              <StatusPill status={draft.status || 'Ativo'} compact />
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-white p-4 flex items-center gap-3">
                <Avatar label={(draft.name || 'A').charAt(0)} gradient="from-slate-700 to-slate-950" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-slate-950 mb-0 truncate">{draft.name || 'Lia Qualificação'}</h3>
                  <p className="text-xs font-bold text-slate-500 mb-0 truncate">{draft.role || 'SDR Imobiliário'}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-black text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Online
                  </div>
                </div>
              </div>

              <div className="agent-whatsapp-bg p-4 space-y-3">
                <div className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-400 shadow-sm">
                  Hoje
                </div>
                <ChatBubble side="lead">
                  {testPrompt || 'Oi, procuro um apartamento até R$350 mil em São José.'}
                </ChatBubble>
                <ChatBubble side="agent">
                  Perfeito. Você procura para morar ou investir? Tem preferência por bairro?
                </ChatBubble>
                <div className="w-fit rounded-lg bg-white px-3 py-2 text-slate-400 shadow-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-slate-950 mb-0">Diagnóstico automático</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Diagnostic label="Intenção" value="Compra" tone="green" />
                <Diagnostic label="Orçamento" value="R$350 mil" tone="slate" />
                <Diagnostic label="Cidade" value="São José" tone="slate" />
                <Diagnostic label="Temperatura" value="Quente" tone="orange" />
              </div>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Próxima ação</div>
                <div className="mt-1 flex items-center gap-2 text-sm font-black text-slate-950">
                  <LayoutGrid size={16} />
                  Criar card no Kanban
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <PreviewMetric icon={Headphones} label="Leads atendidos" value="1.248" change="+18%" />
              <PreviewMetric icon={CalendarClock} label="Visitas" value="312" change="+22%" />
              <PreviewMetric icon={Target} label="Qualificação" value="68%" change="+9%" />
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-950 text-slate-100 flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 mb-0">Resumo de publicação</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 mb-0">
                    {draft.channels?.length || 1} canal(is), {draft.tools?.length || 0} ferramenta(s) e autonomia nível {draft.autonomy_level || 2}.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .agent-input {
          width: 100%;
          border: 1px solid #e2e8f0;
          background: #f8fafd;
          border-radius: 8px;
          padding: 11px 13px;
          min-height: 44px;
          font-size: 14px;
          font-weight: 650;
          color: #0f172a;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .agent-input::placeholder {
          color: #94a3b8;
          font-weight: 600;
        }

        .agent-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12);
          background: #ffffff;
        }

        .agent-whatsapp-bg {
          background:
            radial-gradient(circle at 20% 10%, rgba(16, 185, 129, .08), transparent 24%),
            radial-gradient(circle at 84% 20%, rgba(139, 92, 246, .08), transparent 26%),
            #f6f3ee;
        }
      `}</style>
    </div>
  );
};

const SidebarItem: React.FC<{
  icon: React.ElementType;
  label: string;
  count?: number;
  active?: boolean;
}> = ({ icon: Icon, label, count, active }) => (
  <button
    className={`h-10 min-w-max rounded-lg border px-3 flex items-center justify-between gap-3 text-left transition ${
      active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950'
    }`}
  >
    <span className="min-w-0 flex items-center gap-3">
      <Icon size={16} className={active ? 'text-emerald-600' : 'text-slate-400'} />
      <span className="truncate text-xs font-black">{label}</span>
    </span>
    {typeof count === 'number' && (
      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{count}</span>
    )}
  </button>
);

const Avatar: React.FC<{ label: string; gradient: string }> = ({ label, gradient }) => (
  <div className={`h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br ${gradient} p-[2px] shadow-sm`}>
    <div className="h-full w-full rounded-[6px] bg-white/10 flex items-center justify-center text-sm font-black text-white">
      {label}
    </div>
  </div>
);

const SectionHeading: React.FC<{ eyebrow: string; title: string; description: string }> = ({
  eyebrow,
  title,
  description,
}) => (
  <div>
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>
    <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 mb-0">{title}</h2>
    <p className="mt-1 text-sm font-medium text-slate-500 mb-0">{description}</p>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
    {children}
  </label>
);

const StatusPill: React.FC<{ status: string; compact?: boolean }> = ({ status, compact }) => {
  const active = status === 'Ativo' || status === 'Em teste';
  const draft = status === 'Rascunho';
  const className = active
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
    : draft
      ? 'border-amber-100 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-50 text-slate-500';

  return (
    <span className={`h-9 rounded-lg border px-3 text-xs font-black inline-flex items-center gap-2 ${className}`}>
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : draft ? 'bg-amber-500' : 'bg-slate-400'}`} />
      {compact ? status : `Agente ${status.toLowerCase()}`}
    </span>
  );
};

const ChatBubble: React.FC<{ side: 'lead' | 'agent'; children: React.ReactNode }> = ({ side, children }) => (
  <div className={`flex ${side === 'agent' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-[86%] rounded-lg px-3 py-2 text-xs font-semibold leading-relaxed shadow-sm ${
        side === 'agent' ? 'bg-[#D9FDD3] text-slate-800' : 'bg-white text-slate-800'
      }`}
    >
      <p className="mb-0">{children}</p>
      <div className="mt-1 text-right text-[9px] font-bold text-slate-400">{side === 'agent' ? '10:31' : '10:30'}</div>
    </div>
  </div>
);

const Diagnostic: React.FC<{ label: string; value: string; tone: 'green' | 'orange' | 'slate' }> = ({
  label,
  value,
  tone,
}) => {
  const colors = {
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    orange: 'border-orange-100 bg-orange-50 text-orange-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <div className={`rounded-lg border p-3 ${colors[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-1 text-xs font-black">{value}</div>
    </div>
  );
};

const PreviewMetric: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  change: string;
}> = ({ icon: Icon, label, value, change }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center">
      <Icon size={16} />
    </div>
    <div className="mt-3 text-base font-black text-slate-950">{value}</div>
    <div className="text-[10px] font-black text-emerald-600">{change}</div>
    <div className="mt-1 text-[10px] font-bold leading-snug text-slate-500">{label}</div>
  </div>
);

export default AIAgents;
