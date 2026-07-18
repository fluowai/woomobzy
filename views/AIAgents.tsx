import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BellRing,
  BookOpen,
  Bot,
  Brain,
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
  Key,
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
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Smartphone,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  WandSparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { aiAgentService, type AIAgent, type AIAgentPayload, type AgentMetrics } from '../services/aiAgents';
import { callApi } from '../src/lib/api';
import { instanceApi, type Instance as WhatsAppInstance } from './WhatsApp/hooks/api';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';

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

type TestMessage = {
  id: string;
  side: 'lead' | 'agent';
  content: string;
};

type TestMode = 'lead-simulator' | 'agent-reply';

const channels = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'site', label: 'Site' },
  { id: 'crm', label: 'CRM' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'email', label: 'E-mail' },
];

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
  { id: 'brain', label: 'Cérebro Neural', icon: Brain },
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
  instances: [],
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
  {
    name: 'Zara Vendas',
    role: 'Fechamento e negociação',
    description: 'Conduz propostas, negocia valores e fecha contratos com segurança.',
    tags: ['Vendas', 'Negociação'],
    accent: 'from-violet-600 to-purple-700',
    avatar: 'Z',
    payload: {
      ...emptyAgent,
      name: 'Zara Vendas',
      role: 'Fechamento e negociação',
      response_style: 'premium',
      personality: 'Segura, persuasiva e profissional. Conduz negociações com elegância e senso de urgência.',
      instructions:
        'Identifique sinais de compra, apresente propostas, lide com objeções de preço e condicione o fechamento. Acione corretor humano para assinatura de contrato.',
      capabilities: ['Kanban comercial', 'Follow-up', 'Match de imóveis'],
      tools: ['whatsapp', 'kanban', 'crm', 'matchmaking', 'follow-up', 'notificar-corretor', 'mover-etapa-funil'],
      autonomy_level: 3,
      operation_mode: 'Autônomo',
    },
  },
  {
    name: 'Léo Locação',
    role: 'Locação de imóveis',
    description: 'Especialista em aluguel, locação temporária e contratos de locação.',
    tags: ['Locação', 'Aluguel'],
    accent: 'from-blue-600 to-cyan-600',
    avatar: 'L',
    payload: {
      ...emptyAgent,
      name: 'Léo Locação',
      role: 'Locação de imóveis',
      personality: 'Paciente, explicativo e focado em encontrar o imóvel ideal para moradia.',
      instructions:
        'Entenda prazo, orçamento mensal, tipo de imóvel para locação, documentação necessária e disponibilidade para vistoria. Acione corretor para contratos.',
      capabilities: ['Atendimento inicial', 'Kanban comercial', 'Agenda', 'Follow-up'],
      tools: ['whatsapp', 'kanban', 'crm', 'agenda', 'follow-up', 'notificar-corretor'],
      autonomy_level: 2,
      operation_mode: 'Semiautônomo',
    },
  },
  {
    name: 'Sofia Pós-Venda',
    role: 'Pós-venda e satisfação',
    description: 'Acompanha clientes após fechamento, mede satisfação e gera novas indicações.',
    tags: ['Pós-venda', 'Indicação'],
    accent: 'from-pink-500 to-rose-500',
    avatar: 'S',
    payload: {
      ...emptyAgent,
      name: 'Sofia Pós-Venda',
      role: 'Pós-venda e satisfação',
      personality: 'Acolhedora, grata e atenta. Mantém relacionamento duradouro com clientes.',
      instructions:
        'Após fechamento, agende contato para avaliar satisfação, resolva pendencias burocraticas, peça indicacao e mantenha o relacionamento aquecido para futuras oportunidades.',
      capabilities: ['Pós-venda', 'Follow-up', 'Agenda'],
      tools: ['whatsapp', 'crm', 'follow-up', 'agenda', 'criar-tarefa'],
      autonomy_level: 2,
      operation_mode: 'Semiautônomo',
    },
  },
  {
    name: 'Igor Documentos',
    role: 'Análise documental avançada',
    description: 'Confere documentos jurídicos, contratos e matriculas com precisão.',
    tags: ['Documentos', 'Jurídico'],
    accent: 'from-stone-700 to-stone-950',
    avatar: 'I',
    payload: {
      ...emptyAgent,
      name: 'Igor Documentos',
      role: 'Análise documental avançada',
      response_style: 'tecnico',
      personality: 'Analítico, preciso e criterioso. Verifica cada detalhe documental.',
      instructions:
        'Analise documentos como RG, CPF, comprovante de residencia, matricula, ITR, CCIR, CAR e contratos. Aponte inconsistencias, pendencias e prazos. Acione juridico em caso de irregularidades.',
      capabilities: ['Documentação', 'Kanban comercial'],
      tools: ['documentos', 'pdf-reader', 'kanban', 'crm', 'notificar-corretor', 'criar-tarefa'],
      autonomy_level: 2,
      operation_mode: 'Semiautônomo',
    },
  },
];

function normalizePreviewText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function buildPreviewDiagnostics(message: string) {
  const text = normalizePreviewText(message);
  const budget = message.match(/(?:r\$\s*)?(\d{2,3}(?:[.,]\d{3})*|\d+)\s*(milhao|milhoes|mi|m|mil)?/i);
  const city = message.match(/\bem\s+([^,.!?]{2,32})(?:[,.!?]|$)/i);
  const isVisit = /\b(visita|visitar|conhecer|agendar|horario)\b/.test(text);
  const isFinance = /\b(financiamento|entrada|parcela|proposta|r\$|orcamento)\b/.test(text);
  const isRent = /\b(alugar|aluguel|locacao|locar)\b/.test(text);
  const isSale = /\b(comprar|compra|procuro|busco|quero)\b/.test(text);

  return {
    intent: isVisit ? 'Visita' : isRent ? 'Locacao' : isSale ? 'Compra' : 'Qualificacao',
    budget: budget ? `${budget[1]} ${budget[2] || ''}`.trim() : 'A confirmar',
    city: city?.[1]?.trim() || 'A confirmar',
    temperature: isVisit || isFinance ? 'Quente' : isSale || isRent ? 'Morno' : 'Inicial',
    nextAction: isVisit ? 'Agendar visita' : isFinance ? 'Acionar corretor' : 'Qualificar perfil',
  };
}

function buildDraftAgentReply(draft: BuilderDraft, message: string) {
  const diagnostics = buildPreviewDiagnostics(message);
  const agentName = draft.name || 'Agente';
  const style = draft.response_style || 'consultivo';
  const intro = style === 'curto'
    ? 'Perfeito.'
    : `Perfeito, aqui e ${agentName}.`;

  if (diagnostics.intent === 'Visita') {
    return `${intro} Para agendar a visita, me confirme o imovel desejado, melhor dia/horario e se voce prefere atendimento por WhatsApp ou ligacao.`;
  }

  if (diagnostics.intent === 'Locacao') {
    return `${intro} Vou te ajudar com a locacao. Qual cidade/bairro, faixa de aluguel e data desejada para mudanca?`;
  }

  return `${intro} Entendi seu interesse. Voce procura para morar ou investir? Tem preferencia de bairro, tipo de imovel e forma de pagamento?`;
}

function buildLeadSimulatorReply(draft: BuilderDraft, message: string, history: TestMessage[]) {
  const text = normalizePreviewText(message);
  const diagnostics = buildPreviewDiagnostics(message);
  const leadTurns = history.filter((item) => item.side === 'lead').length;
  const agentName = draft.name || 'corretor';

  if (/\b(visita|visitar|conhecer|horario|agenda)\b/.test(text)) {
    return 'Pode ser. Tenho disponibilidade no fim da tarde ou sabado de manha. Esse imovel ainda esta disponivel?';
  }

  if (/\b(entrada|financia|parcela|simular|credito)\b/.test(text)) {
    return 'Eu consigo dar uma entrada, mas queria entender melhor as parcelas e se aceita financiamento. Voce consegue simular?';
  }

  if (/\b(bairro|regiao|cidade|localizacao)\b/.test(text)) {
    return diagnostics.city !== 'A confirmar'
      ? `Tenho preferencia por ${diagnostics.city}, mas posso ver bairros proximos se forem seguros e com boa estrutura.`
      : 'Prefiro uma regiao segura, com mercado perto e acesso facil. Ainda estou aberto a bairros parecidos.';
  }

  if (/\b(valor|orcamento|preco|r\$|mil)\b/.test(text)) {
    return diagnostics.budget !== 'A confirmar'
      ? `Meu teto hoje fica perto de R$ ${diagnostics.budget}. Se passar muito disso preciso ver se a negociacao compensa.`
      : 'Ainda estou ajustando o orcamento, mas queria algo com bom custo-beneficio e possibilidade de negociar.';
  }

  if (leadTurns === 0) {
    return `Oi, ${agentName}. Estou procurando um imovel e queria entender quais opcoes fazem sentido para meu perfil.`;
  }

  return 'Entendi. Pode me mandar uma opcao com valor, bairro e principais diferenciais? Quero comparar antes de marcar visita.';
}

async function simulateLeadReply(draft: BuilderDraft, brokerMessage: string, history: TestMessage[]) {
  const systemInstruction = [
    'Voce simula um lead imobiliario brasileiro real em um chat de validacao de CRM.',
    'Responda sempre como cliente/lead, nunca como assistente ou corretor.',
    'Use mensagens naturais, curtas e com variacoes de interesse, duvidas, objecoes e informacoes de perfil.',
    'Nao use markdown, nao explique o teste e nao ofereca recursos do sistema.',
  ].join(' ');

  const prompt = JSON.stringify({
    agent_under_test: {
      name: draft.name || 'Agente',
      role: draft.role || 'Atendimento imobiliario',
      style: draft.response_style || 'consultivo',
      channels: draft.channels || [draft.channel || 'whatsapp'],
      instructions: draft.instructions || '',
    },
    conversation: history.slice(-10).map((item) => ({
      role: item.side === 'agent' ? 'broker' : 'lead',
      content: item.content,
    })),
    broker_message: brokerMessage,
    task: 'Continue a conversa respondendo apenas como o lead.',
  });

  try {
    const data = await callApi('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, systemInstruction, temperature: 0.85 }),
    });
    const text = String(data?.text || '').trim();
    return text || buildLeadSimulatorReply(draft, brokerMessage, history);
  } catch {
    return buildLeadSimulatorReply(draft, brokerMessage, history);
  }
}

const AIAgents: React.FC = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [whatsAppInstances, setWhatsAppInstances] = useState<WhatsAppInstance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('new');
  const [draft, setDraft] = useState<BuilderDraft>(emptyAgent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const [testMode, setTestMode] = useState<TestMode>('lead-simulator');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<TestMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(() => `agent-preview-${Date.now()}`);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [ratingInput, setRatingInput] = useState(0);
  const [feedbackInput, setFeedbackInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { pathname } = useLocation();

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedId),
    [agents, selectedId]
  );

  const activeAgents = useMemo(() => agents.filter((agent) => agent.is_active).length, [agents]);
  const pausedAgents = useMemo(() => agents.length - activeAgents, [agents, activeAgents]);
  const connectedWhatsAppInstances = useMemo(
    () => whatsAppInstances.filter((instance) => instance.status === 'connected').length,
    [whatsAppInstances]
  );
  const selectedWhatsAppInstance = useMemo(
    () => whatsAppInstances.find((instance) => instance.id === draft.instances?.[0]),
    [draft.instances, whatsAppInstances]
  );
  const propertyPath = pathname.startsWith('/rural') ? '/rural/properties/new' : '/urban/properties/new';
  const brainTabIndex = 5;
  const activeStepIndex = Math.max(tabs.findIndex((tab) => tab.id === activeTab), 0);
  const activeStep = tabs[activeStepIndex] || tabs[0];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === tabs.length - 1;
  const lastLeadMessage =
    [...chatMessages].reverse().find((message) => message.side === 'lead')?.content ||
    chatMessages[chatMessages.length - 1]?.content ||
    '';
  const previewDiagnostics = useMemo(() => buildPreviewDiagnostics(lastLeadMessage), [lastLeadMessage]);

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
        instances: agent.instances?.length ? agent.instances : [],
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

  useEffect(() => {
    if (selectedAgent) {
      loadMetrics(selectedAgent.id);
    } else {
      setMetrics(null);
    }
  }, [selectedId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages, chatLoading]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const [loadedAgents] = await Promise.all([
        aiAgentService.list(),
        loadWhatsAppInstances(),
      ]);
      setAgents(loadedAgents);
    } catch (error: any) {
      toast.error('Erro ao carregar agentes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsAppInstances = async () => {
    try {
      setInstancesLoading(true);
      const instances = await instanceApi.list();
      setWhatsAppInstances(instances);
      return instances;
    } catch {
      setWhatsAppInstances([]);
      toast.error('Nao foi possivel carregar as instancias do WhatsApp.');
      return [];
    } finally {
      setInstancesLoading(false);
    }
  };

  const loadMetrics = async (agentId: string) => {
    try {
      setMetricsLoading(true);
      const data = await aiAgentService.metrics(agentId);
      setMetrics(data);
    } catch {
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleQualify = async () => {
    if (!selectedAgent || ratingInput === 0) {
      toast.error('Selecione uma nota (1-5) para qualificar.');
      return;
    }
    try {
      await aiAgentService.qualify(selectedAgent.id, {
        rating: ratingInput,
        feedback: feedbackInput,
      });
      toast.success('Qualificação registrada! Isso ajuda o cerebro neural do agente.');
      setRatingInput(0);
      setFeedbackInput('');
      await loadMetrics(selectedAgent.id);
    } catch (error: any) {
      toast.error('Erro ao qualificar: ' + error.message);
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

  const applyPreset = (preset: TemplatePreset) => {
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
        instances: agent.instances?.length ? agent.instances : [],
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

  const runTest = async (messageOverride?: string) => {
    const message = (messageOverride || chatInput).trim();
    if (!message) {
      toast.error('Digite uma mensagem para iniciar a conversa.');
      return;
    }

    const outgoingMessage: TestMessage = {
      id: `${testMode === 'lead-simulator' ? 'agent' : 'lead'}-${Date.now()}`,
      side: testMode === 'lead-simulator' ? 'agent' : 'lead',
      content: message,
    };
    const nextHistory = [...chatMessages, outgoingMessage];

    setChatMessages(nextHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      let reply = '';
      let replySide: TestMessage['side'] = 'agent';
      let successMessage = 'Resposta gerada.';

      if (testMode === 'lead-simulator') {
        replySide = 'lead';
        reply = await simulateLeadReply(draft, message, nextHistory);
        successMessage = 'Lead simulado respondeu.';
      } else if (selectedAgent) {
        const response = await aiAgentService.chat(selectedAgent.id, message, chatSessionId);
        reply = response.reply;
        successMessage = 'Resposta real do agente recebida.';
      } else {
        reply = buildDraftAgentReply(draft, message);
        successMessage = 'Resposta simulada do rascunho gerada.';
      }

      setChatMessages((current) => [
        ...current,
        {
          id: `${replySide}-${Date.now()}`,
          side: replySide,
          content: reply || 'Nao consegui responder agora. Ajuste a mensagem e tente novamente.',
        },
      ]);

      toast.success(successMessage);
    } catch (error: any) {
      toast.error('Erro ao conversar no teste: ' + error.message);
      setChatMessages((current) => [
        ...current,
        {
          id: `${testMode === 'lead-simulator' ? 'lead' : 'agent'}-error-${Date.now()}`,
          side: testMode === 'lead-simulator' ? 'lead' : 'agent',
          content: 'Nao consegui conectar a IA agora. Ajuste a mensagem ou tente novamente em instantes.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const resetChat = () => {
    setChatSessionId(`agent-preview-${Date.now()}`);
    setChatInput('');
    setChatMessages([]);
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
              <div className="text-lg font-bold tracking-tight leading-none">{COMMERCIAL_PRODUCT_NAME}</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mt-1 truncate">
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
              className="h-11 px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <Plus size={18} />
              Novo imóvel
            </Link>
            <button
              onClick={startBlankAgent}
              className="h-11 px-4 rounded-lg bg-slate-950 text-white text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-slate-800"
            >
              <Bot size={18} />
              Novo agente
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-7">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <aside className="rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Central de Agentes</div>
                  <h2 className="mt-2 text-xl font-bold tracking-tight mb-0">Modelos e operação</h2>
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

            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
              {presets.map((preset) => (
                <article key={preset.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start gap-3">
                    <Avatar label={preset.avatar} gradient={preset.accent} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-950 mb-0 truncate">{preset.name}</h3>
                      <p className="text-[11px] font-bold text-slate-500 mb-0">{preset.role}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 mb-0">{preset.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {preset.tags.map((tag) => (
                      <span key={tag} className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => applyPreset(preset)}
                    className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Usar modelo
                  </button>
                </article>
              ))}
            </div>

            {agents.length > 0 && (
              <div className="border-t border-slate-100 p-4 pt-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">Agentes salvos</div>
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
                          <span className="truncate text-xs font-bold">{agent.name}</span>
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

          <div className="grid grid-cols-1 gap-5 items-start">
          <main className="min-w-0 space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 lg:p-7 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
                    <Sparkles size={15} />
                    IA e automação
                  </div>
                  <h1 className="mt-4 text-3xl lg:text-4xl font-bold tracking-tight text-slate-950 mb-0">
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
                      className="h-10 px-3 rounded-lg border border-red-100 bg-red-50 text-red-600 font-bold text-xs flex items-center gap-2 hover:bg-red-100"
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
                        <p className="text-xs font-bold text-slate-950 mb-0 truncate">{step.title}</p>
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
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Etapa {activeStepIndex + 1} de {tabs.length}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-950">
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
                      className={`h-11 min-w-0 rounded-lg px-3 text-xs font-bold flex items-center justify-center gap-2 transition ${
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
                    title="Canais de atuação e WhatsApp conectado"
                    description="Escolha onde o agente pode conversar e vincule a operação a uma instância real do WhatsApp."
                  />
                  <div className="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {channels.map((channel) => (
                          <button
                            key={channel.id}
                            onClick={() => toggleChannel(channel.id)}
                            className={`h-12 rounded-lg border px-3 text-sm font-bold transition ${
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
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Instancia WhatsApp
                        </label>
                        <button
                          type="button"
                          onClick={loadWhatsAppInstances}
                          disabled={instancesLoading}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {instancesLoading ? 'Atualizando...' : 'Atualizar'}
                        </button>
                      </div>
                      <select
                        value={draft.instances?.[0] || ''}
                        onChange={(e) => setDraft({ ...draft, instances: e.target.value ? [e.target.value] : [] })}
                        className="agent-input"
                      >
                        <option value="">Todas as instancias conectadas</option>
                        {whatsAppInstances.map((instance) => (
                          <option key={instance.id} value={instance.id}>
                            {instance.name} - {instance.status === 'connected' ? 'conectada' : 'desconectada'}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <Smartphone size={15} className={connectedWhatsAppInstances ? 'text-emerald-600' : 'text-amber-600'} />
                          {connectedWhatsAppInstances} de {whatsAppInstances.length} conectada(s)
                        </div>
                        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500 mb-0">
                          {selectedWhatsAppInstance
                            ? `Este agente atende pela instancia ${selectedWhatsAppInstance.name}.`
                            : 'Sem instancia fixa: o agente pode atender qualquer WhatsApp conectado da organizacao.'}
                        </p>
                      </div>
                    </div>
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
                        <h3 className="mt-3 text-sm font-bold text-slate-950 mb-0">{workspace.label}</h3>
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
                              <h3 className="text-sm font-bold text-slate-950 mb-0">{level.label}</h3>
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
                        className={`h-10 rounded-lg border px-3 text-xs font-bold flex items-center gap-2 transition ${
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
                        <span className="text-sm font-bold">{rule.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section id="agent-brain" className={activeTab === 'brain' ? 'block' : 'hidden'}>
                  <SectionHeading
                    eyebrow="Cerebro Neural"
                    title="Qualificação e aprendizado do agente"
                    description="Acompanhe metricas, avalie respostas e treine o agente para melhorar continuamente."
                  />

                  {selectedAgent ? (
                    <>
                      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <Brain size={18} className="text-slate-700" />
                          <div className="mt-2 text-2xl font-bold text-slate-950">
                            {metricsLoading ? '-' : metrics?.total_conversations || 0}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Conversas</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <Star size={18} className="text-amber-500" />
                          <div className="mt-2 text-2xl font-bold text-slate-950">
                            {metricsLoading ? '-' : metrics?.average_rating ? metrics.average_rating.toFixed(1) : '-'}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Media avaliações</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <Target size={18} className="text-emerald-600" />
                          <div className="mt-2 text-2xl font-bold text-slate-950">
                            {metricsLoading ? '-' : metrics?.total_qualifications || 0}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Qualificações</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <TrendingUp size={18} className="text-blue-600" />
                          <div className="mt-2 text-2xl font-bold text-slate-950">
                            {metricsLoading ? '-' : metrics?.rating_distribution?.[5] || 0}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Notas 5</div>
                        </div>
                      </div>

                      {metrics && metrics.total_qualifications > 0 && (
                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">
                            Distribuição de notas
                          </div>
                          <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const count = metrics.rating_distribution?.[star] || 0;
                              const total = metrics.total_qualifications || 1;
                              const pct = (count / total) * 100;
                              return (
                                <div key={star} className="flex items-center gap-3">
                                  <span className="w-4 text-xs font-bold text-slate-600">{star}</span>
                                  <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-amber-500 transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-8 text-xs font-bold text-slate-500 text-right">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-4">
                        <div className="flex items-center gap-2 text-amber-800">
                          <Star size={16} />
                          <span className="text-xs font-bold uppercase tracking-[0.14em]">Qualificar este agente</span>
                        </div>
                        <p className="mt-1 text-xs text-amber-700">
                          Sua avaliação ajuda o cerebro neural do agente a aprender e melhorar.
                        </p>
                        <div className="mt-3 flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRatingInput(star)}
                              className={`h-10 w-10 rounded-lg border flex items-center justify-center transition ${
                                star <= ratingInput
                                  ? 'border-amber-300 bg-amber-200 text-amber-800'
                                  : 'border-slate-200 bg-white text-slate-400 hover:bg-amber-50'
                              }`}
                            >
                              <Star size={18} fill={star <= ratingInput ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          className="mt-3 w-full rounded-lg border border-amber-200 bg-white p-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 resize-none"
                          placeholder="Feedback opcional - o que o agente fez bem ou poderia melhorar?"
                          rows={2}
                        />
                        <button
                          onClick={handleQualify}
                          disabled={ratingInput === 0}
                          className="mt-3 h-10 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white flex items-center gap-2 hover:bg-amber-700 disabled:opacity-50"
                        >
                          <Star size={15} />
                          Registrar qualificação
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                      <Brain size={32} className="mx-auto text-slate-400" />
                      <p className="mt-3 text-sm font-bold text-slate-500">
                        Selecione ou crie um agente para ver as metricas do cerebro neural.
                      </p>
                    </div>
                  )}
                </section>

                <section id="agent-test" className={activeTab === 'test' ? 'block' : 'hidden'}>
                  <SectionHeading
                    eyebrow="Teste"
                    title="Converse e valide o agente"
                    description="Teste respostas reais do agente salvo ou simule o comportamento enquanto ele ainda esta em rascunho."
                  />

                  <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      <div className="border-b border-slate-200 bg-white p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <Avatar label={(draft.name || 'A').charAt(0)} gradient="from-slate-700 to-slate-950" />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-950 mb-0 truncate">{draft.name || 'Agente em teste'}</h3>
                          <p className="text-xs font-bold text-slate-500 mb-0 truncate">{draft.role || 'Atendimento e Qualificacao'}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {testMode === 'lead-simulator'
                              ? 'Voce fala como corretor'
                              : selectedAgent
                                ? 'Resposta real do agente'
                                : 'Simulacao de rascunho'}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button
                              type="button"
                              onClick={() => setTestMode('lead-simulator')}
                              className={`h-8 rounded-md px-3 text-[11px] font-bold transition ${
                                testMode === 'lead-simulator' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              Eu sou corretor
                            </button>
                            <button
                              type="button"
                              onClick={() => setTestMode('agent-reply')}
                              className={`h-8 rounded-md px-3 text-[11px] font-bold transition ${
                                testMode === 'agent-reply' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              Eu sou lead
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={resetChat}
                            className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                            title="Limpar conversa"
                          >
                            <Repeat2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="agent-whatsapp-bg p-4">
                        <div className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-400 shadow-sm">
                          Hoje
                        </div>
                        <div className="mt-3 max-h-[520px] min-h-[420px] space-y-3 overflow-y-auto pr-1">
                          {chatMessages.length === 0 && (
                            <div className="flex h-[320px] items-center justify-center text-center">
                              <div className="max-w-sm rounded-lg border border-white/70 bg-white/80 px-5 py-4 shadow-sm">
                                <MessageCircle className="mx-auto text-emerald-600" size={22} />
                                <p className="mt-2 text-sm font-bold text-slate-800 mb-0">
                                  Escreva a primeira mensagem livre.
                                </p>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 mb-0">
                                  {testMode === 'lead-simulator'
                                    ? 'Voce manda como corretor e o lead responde com comportamento realista.'
                                    : 'Voce manda como lead e valida a resposta do agente.'}
                                </p>
                              </div>
                            </div>
                          )}
                          {chatMessages.map((message) => (
                            <ChatBubble key={message.id} side={message.side}>
                              {message.content}
                            </ChatBubble>
                          ))}
                          {chatLoading && (
                            <div className="w-fit rounded-lg bg-white px-3 py-2 text-slate-400 shadow-sm">
                              <span className="inline-flex gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              </span>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>
                      </div>

                      <form
                        className="border-t border-slate-200 bg-white p-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          runTest(chatInput);
                        }}
                      >
                        {testMode === 'lead-simulator' ? (
                          <div className="mb-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
                            Modo livre: voce escreve como corretor e a IA responde como lead simulado.
                          </div>
                        ) : !selectedAgent && (
                          <div className="mb-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
                            Salve ou publique o agente para testar a resposta real da IA.
                          </div>
                        )}
                        <div className="flex items-end gap-2">
                          <textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            className="min-h-11 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                            placeholder={testMode === 'lead-simulator' ? 'Digite sua mensagem para o lead...' : 'Digite como se fosse o lead...'}
                            rows={2}
                          />
                          <button
                            type="submit"
                            disabled={chatLoading || !chatInput.trim()}
                            className="h-11 w-11 shrink-0 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50"
                            title="Enviar mensagem"
                          >
                            {chatLoading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h3 className="text-sm font-bold text-slate-950 mb-0">Diagnostico do teste</h3>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Diagnostic label="Intencao" value={previewDiagnostics.intent} tone="green" />
                          <Diagnostic label="Orcamento" value={previewDiagnostics.budget} tone="slate" />
                          <Diagnostic label="Cidade" value={previewDiagnostics.city} tone="slate" />
                          <Diagnostic label="Temperatura" value={previewDiagnostics.temperature} tone="orange" />
                        </div>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Proxima acao</div>
                          <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-950">
                            <LayoutGrid size={16} />
                            {previewDiagnostics.nextAction}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-slate-950 text-slate-100 flex items-center justify-center">
                            <Bot size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-950 mb-0">Resumo de publicacao</h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500 mb-0">
                              {draft.channels?.length || 1} canal(is), {draft.tools?.length || 0} ferramenta(s) e autonomia nivel {draft.autonomy_level || 2}.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </section>

            <footer className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  onClick={resetDraft}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    onClick={goToPreviousStep}
                    disabled={isFirstStep}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ChevronLeft size={17} />
                    Voltar
                  </button>
                  {!isLastStep && (
                    <button
                      onClick={goToNextStep}
                      className="h-11 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white flex items-center justify-center gap-2 hover:bg-slate-800"
                    >
                      Próxima etapa
                      <ArrowRight size={17} />
                    </button>
                  )}
                  <button
                    onClick={() => saveAgent('Rascunho')}
                    disabled={saving}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                    Salvar rascunho
                  </button>
                  <button
                    onClick={() => saveAgent('Ativo')}
                    disabled={saving}
                    className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="animate-spin" size={17} /> : <Rocket size={17} />}
                    Publicar agente
                  </button>
                </div>
              </div>
            </footer>
          </main>

          </div>
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
      <span className="truncate text-xs font-bold">{label}</span>
    </span>
    {typeof count === 'number' && (
      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{count}</span>
    )}
  </button>
);

const Avatar: React.FC<{ label: string; gradient: string }> = ({ label, gradient }) => (
  <div className={`h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br ${gradient} p-[2px] shadow-sm`}>
    <div className="h-full w-full rounded-[6px] bg-white/10 flex items-center justify-center text-sm font-bold text-white">
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
    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>
    <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950 mb-0">{title}</h2>
    <p className="mt-1 text-sm font-medium text-slate-500 mb-0">{description}</p>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
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
    <span className={`h-9 rounded-lg border px-3 text-xs font-bold inline-flex items-center gap-2 ${className}`}>
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
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-1 text-xs font-bold">{value}</div>
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
    <div className="mt-3 text-base font-bold text-slate-950">{value}</div>
    <div className="text-[10px] font-bold text-emerald-600">{change}</div>
    <div className="mt-1 text-[10px] font-bold leading-snug text-slate-500">{label}</div>
  </div>
);

export default AIAgents;
