import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronRight,
  Copy,
  Database,
  FileSearch,
  GitBranch,
  Headphones,
  MessageSquareText,
  PauseCircle,
  PlayCircle,
  Plus,
  Route,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Trash2,
  UserCheck,
  Users,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { aiAgentService, type AIAgent, type AIAgentPayload } from '../services/aiAgents';

type TabKey =
  | 'perfil'
  | 'canais'
  | 'atuacao'
  | 'modo'
  | 'gatilhos'
  | 'permissoes'
  | 'kanban'
  | 'conhecimento'
  | 'handoff'
  | 'metricas'
  | 'simulacao';

const tabs: Array<{ id: TabKey; label: string; icon: React.ElementType }> = [
  { id: 'perfil', label: 'Perfil', icon: UserCheck },
  { id: 'canais', label: 'Canais e Instancias', icon: MessageSquareText },
  { id: 'atuacao', label: 'Area de Atuacao', icon: BriefcaseBusiness },
  { id: 'modo', label: 'Modo', icon: SlidersHorizontal },
  { id: 'gatilhos', label: 'Gatilhos', icon: Zap },
  { id: 'permissoes', label: 'Permissoes', icon: ShieldCheck },
  { id: 'kanban', label: 'Kanban', icon: GitBranch },
  { id: 'conhecimento', label: 'Conhecimento', icon: Database },
  { id: 'handoff', label: 'Handoff Humano', icon: Users },
  { id: 'metricas', label: 'Metricas', icon: BarChart3 },
  { id: 'simulacao', label: 'Simulacao', icon: Sparkles },
];

const roles = [
  'SDR Imobiliario',
  'Agente de Qualificacao',
  'Agente de Follow-up',
  'Analista de Conversas',
  'Agente Documental',
  'Copiloto Comercial',
  'Supervisor de Atendimento',
  'Agente de Ouvidoria',
  'Agente de Pos-venda',
  'Agente Financeiro',
  'Agente de Agendamento',
  'Agente de Kanban',
  'Agente de Instagram',
];

const departments = ['Comercial', 'Atendimento', 'Documentacao', 'Pos-venda', 'Financeiro', 'Ouvidoria', 'Suporte', 'Juridico', 'Gestao'];
const styles = ['Consultivo', 'Direto', 'Acolhedor', 'Tecnico', 'Comercial', 'Institucional', 'Humanizado', 'Objetivo', 'Persuasivo'];
const statuses = ['Rascunho', 'Em teste', 'Ativo', 'Pausado', 'Com erro', 'Inativo'];

const channels = [
  'WooAPI WhatsApp',
  'Instagram Oficial',
  'Instagram nao oficial',
  'Facebook Messenger',
  'Chat do site',
  'Google Meu Negocio',
  'E-mail',
  'Ouvidoria',
  'Canal interno',
];

const instances = [
  { id: 'wooapi-vendas-oka', name: 'WooAPI Vendas - Oka Imoveis', channel: 'WooAPI WhatsApp', status: 'Conectado', unit: 'Oka Imoveis' },
  { id: 'wooapi-suporte-consultio', name: 'WooAPI Suporte - Consultio', channel: 'WooAPI WhatsApp', status: 'Conectado', unit: 'Consultio' },
  { id: 'ig-principal', name: 'Instagram Principal - Argolo Ventures', channel: 'Instagram Oficial', status: 'Conectado', unit: 'Argolo Ventures' },
  { id: 'chat-site', name: 'Chat Site - Landing Page', channel: 'Chat do site', status: 'Ativo', unit: 'Site' },
  { id: 'gmb-centro', name: 'Google Meu Negocio - Unidade Centro', channel: 'Google Meu Negocio', status: 'Pendente', unit: 'Centro' },
  { id: 'fb-oficial', name: 'Facebook Messenger - Pagina Oficial', channel: 'Facebook Messenger', status: 'Conectado', unit: 'Oficial' },
];

const workspaces = [
  ['Caixa de entrada', 'Lendo, respondendo ou sugerindo respostas em conversas de clientes.'],
  ['Conversas omnichannel', 'Acompanha interacoes em WhatsApp, Instagram, site, e-mail e redes.'],
  ['Kanban comercial', 'Cria cards, move oportunidades, atualiza etapas e gera tarefas.'],
  ['CRM de leads', 'Atualiza dados, temperatura, origem, tags e resumo do lead.'],
  ['Agenda', 'Agenda retornos, visitas, reunioes e compromissos.'],
  ['Documentos', 'Le PDFs, contratos, matriculas, comprovantes e anexos enviados.'],
  ['Propostas', 'Apoia a criacao, resumo e acompanhamento de propostas.'],
  ['Contratos', 'Analisa pontos sensiveis e aciona humano quando necessario.'],
  ['Pos-venda', 'Organiza retornos, satisfacao e proximos passos apos venda.'],
  ['Ouvidoria', 'Classifica reclamacoes, urgencia e escalonamento.'],
  ['Financeiro', 'Apoia cobrancas, pendencias e informacoes de pagamento.'],
  ['Relatorios', 'Analisa dados e gera diagnosticos operacionais.'],
  ['Base de clientes', 'Consulta historico e contexto do cliente.'],
  ['Automacoes internas', 'Dispara tarefas internas e rotinas assistidas.'],
];

const operationModes = [
  ['Atendente ativo', 'Responde clientes automaticamente dentro das regras permitidas.'],
  ['Copiloto humano', 'Sugere respostas e acoes, sem enviar sozinho.'],
  ['Analista de conversas', 'Identifica intencao, objecoes, temperatura e riscos.'],
  ['Agente de follow-up', 'Atua quando leads ficam parados ou sem resposta.'],
  ['Agente documental', 'Analisa PDFs, contratos, comprovantes e arquivos.'],
  ['Agente de qualificacao', 'Coleta informacoes essenciais e qualifica o lead.'],
  ['Agente roteador', 'Encaminha atendimento para setor, fila ou responsavel.'],
  ['Agente supervisor', 'Audita atendimentos, mede qualidade e aponta falhas.'],
  ['Agente operacional', 'Cria tarefas, agenda retornos, move cards e atualiza CRM.'],
];

const triggers = [
  'Nova mensagem recebida',
  'Novo lead criado',
  'Card criado no kanban',
  'Card movido de etapa',
  'Lead parado ha 24 horas',
  'Lead parado ha 3 dias',
  'Cliente enviou audio',
  'Cliente enviou PDF',
  'Cliente enviou imagem',
  'Palavra-chave detectada',
  'Tag aplicada',
  'Atendimento sem resposta humana',
  'Cliente pediu visita',
  'Cliente pediu proposta',
  'Cliente mencionou preco',
  'Cliente mencionou financiamento',
  'Cliente demonstrou insatisfacao',
  'Cliente pediu humano',
  'Follow-up vencido',
  'Documento pendente',
  'Oportunidade com alto score',
  'Conversa com risco de perda',
];

const permissionGroups = {
  Mensagens: ['Ler mensagens', 'Responder automaticamente', 'Sugerir resposta', 'Enviar audio', 'Enviar imagem', 'Enviar documento', 'Enviar template', 'Encerrar conversa', 'Transferir conversa'],
  CRM: ['Criar lead', 'Editar lead', 'Atualizar temperatura', 'Atualizar origem', 'Atualizar status', 'Aplicar tags', 'Remover tags', 'Adicionar observacao', 'Criar resumo do lead'],
  Kanban: ['Criar card', 'Mover card', 'Editar card', 'Criar tarefa', 'Concluir tarefa', 'Definir prioridade', 'Sugerir proxima acao', 'Definir motivo de perda'],
  Agenda: ['Criar agendamento', 'Sugerir horario', 'Confirmar reuniao', 'Reagendar compromisso', 'Cancelar compromisso', 'Enviar lembrete'],
  Documentos: ['Ler PDF', 'Interpretar imagens', 'Extrair dados de documento', 'Classificar documento', 'Validar campos', 'Solicitar documento pendente', 'Criar checklist documental'],
  Comercial: ['Sugerir imovel', 'Sugerir proposta', 'Gerar resumo comercial', 'Identificar objecoes', 'Identificar intencao de compra', 'Identificar lead quente', 'Acionar corretor', 'Acionar closer'],
  Seguranca: ['Executar sem aprovacao', 'Exigir aprovacao para envio', 'Exigir aprovacao para mover card', 'Exigir aprovacao para proposta', 'Bloquear respostas sensiveis', 'Bloquear negociacao de preco', 'Bloquear envio fora do horario'],
};

const pipelines = ['Pre-atendimento', 'Qualificacao', 'Visita agendada', 'Proposta enviada', 'Documentacao', 'Negociacao', 'Fechamento', 'Pos-venda', 'Perdidos', 'Reativacao'];
const knowledgeSources = ['Base geral da empresa', 'Base do produto', 'Documentos enviados', 'URLs do site', 'Catalogo de imoveis', 'CRM', 'Conversas anteriores', 'Propostas antigas', 'Contratos', 'Planilhas', 'PDFs', 'Audios transcritos', 'FAQ', 'Scripts comerciais', 'Politicas de negociacao', 'Regras de financiamento', 'Dados do cliente', 'Dados do imovel', 'Dados do proprietario'];
const handoffRules = ['Cliente pediu atendimento humano', 'Cliente demonstrou irritacao', 'Cliente pediu desconto', 'Cliente quer fechar negocio', 'Cliente pediu contrato', 'Cliente enviou documento sensivel', 'Cliente pediu cancelamento', 'Pergunta juridica', 'Pergunta financeira complexa', 'Score do lead passou de 80', 'Valor do negocio passou de R$ 1 mi', 'Agente nao encontrou resposta confiavel', 'SLA estourou'];
const metrics = ['Conversas atendidas', 'Leads qualificados', 'Leads reativados', 'Follow-ups enviados', 'Respostas recebidas', 'Agendamentos criados', 'Cards movidos', 'Tarefas criadas', 'Documentos analisados', 'Handoffs realizados', 'Tempo medio de resposta', 'Taxa de resolucao', 'Taxa de conversao', 'Taxa de erro', 'Intervencao humana', 'Score de qualidade'];

const templates: Array<AIAgentPayload & { category: string }> = [
  {
    name: 'Lia Qualificacao',
    category: 'Comercial',
    role: 'Agente de Qualificacao',
    department: 'Comercial',
    status: 'Ativo',
    description: 'Qualifica leads, coleta dados essenciais e prepara o atendimento para o vendedor.',
    personality: 'Consultiva, objetiva, acolhedora e focada em entender a necessidade real do lead.',
    instructions: 'Descubra objetivo, cidade, faixa de valor, prazo, forma de pagamento e tipo de imovel. Atualize o lead sem parecer robotico. Nunca prometa condicoes sem validacao humana.',
    response_style: 'Consultivo',
    operation_mode: 'Agente de qualificacao',
    autonomy_level: 3,
    capabilities: ['Qualificar lead', 'Identificar intencao', 'Coletar orcamento', 'Aplicar tags', 'Criar card'],
    tools: ['whatsapp', 'kanban', 'matchmaking'],
    channels: ['WooAPI WhatsApp', 'Chat do site'],
    instances: ['wooapi-vendas-oka', 'chat-site'],
    workspaces: ['Conversas omnichannel', 'Kanban comercial', 'CRM de leads'],
    triggers: ['Nova mensagem recebida', 'Novo lead criado', 'Cliente mencionou financiamento'],
    metrics: ['Leads qualificados', 'Taxa de conversao', 'Tempo medio de resposta'],
  },
  {
    name: 'Theo Follow-up',
    category: 'Comercial',
    role: 'Agente de Follow-up',
    department: 'Comercial',
    status: 'Ativo',
    description: 'Reativa leads parados, envia retornos inteligentes e recupera oportunidades esquecidas.',
    personality: 'Objetivo, cordial e focado em recuperar oportunidades paradas.',
    instructions: 'Aja quando leads ficarem parados. Seja direto, humano e sempre ofereca um proximo passo claro.',
    response_style: 'Direto',
    operation_mode: 'Agente de follow-up',
    autonomy_level: 4,
    capabilities: ['Enviar follow-up', 'Criar tarefas', 'Mover cards', 'Aplicar tags', 'Acionar corretor'],
    tools: ['agenda', 'follow-up', 'whatsapp', 'kanban'],
    channels: ['WooAPI WhatsApp', 'Instagram Oficial'],
    instances: ['wooapi-vendas-oka', 'ig-principal'],
    workspaces: ['Kanban comercial', 'CRM de leads', 'Agenda', 'Conversas omnichannel'],
    triggers: ['Lead parado ha 24 horas', 'Follow-up vencido', 'Card movido de etapa'],
    pipelines: ['Qualificacao', 'Reativacao', 'Visita agendada'],
    metrics: ['Leads reativados', 'Respostas recebidas', 'Visitas agendadas', 'Cards movidos'],
  },
  {
    name: 'Argus Analista',
    category: 'Gestao',
    role: 'Analista de Conversas',
    department: 'Gestao',
    status: 'Ativo',
    description: 'Analisa conversas, identifica falhas comerciais, oportunidades perdidas e riscos.',
    personality: 'Tecnico, objetivo e criterioso.',
    instructions: 'Audite conversas finalizadas, encontre riscos, objecoes e leads quentes esquecidos. Nao responda clientes.',
    response_style: 'Tecnico',
    operation_mode: 'Analista de conversas',
    autonomy_level: 1,
    capabilities: ['Auditar conversas', 'Detectar objecoes', 'Gerar relatorio', 'Criar alerta'],
    tools: ['relatorios', 'kanban', 'crm'],
    channel_scope: 'Nenhuma instancia direta',
    workspaces: ['Conversas omnichannel', 'Relatorios', 'Kanban comercial', 'CRM de leads'],
    triggers: ['Conversa com risco de perda', 'Cliente demonstrou insatisfacao', 'Atendimento sem resposta humana'],
    metrics: ['Conversas atendidas', 'Taxa de erro', 'Intervencao humana', 'Score de qualidade'],
  },
  {
    name: 'Nina Documentos',
    category: 'Documentos',
    role: 'Agente Documental',
    department: 'Documentacao',
    status: 'Em teste',
    description: 'Analisa documentos imobiliarios, contratos, matriculas, comprovantes e pendencias.',
    personality: 'Precisa, calma e cuidadosa.',
    instructions: 'Classifique documentos enviados, identifique pendencias e acione humano para juridico ou contrato.',
    response_style: 'Tecnico',
    operation_mode: 'Agente documental',
    autonomy_level: 2,
    capabilities: ['Ler PDF', 'Classificar documento', 'Extrair dados', 'Criar checklist'],
    tools: ['documentos', 'pdf-reader', 'kanban'],
    workspaces: ['Documentos', 'Contratos', 'CRM de leads'],
    triggers: ['Cliente enviou PDF', 'Documento pendente', 'Cliente pediu contrato'],
    metrics: ['Documentos analisados', 'Taxa de erro', 'Handoffs realizados'],
  },
  {
    name: 'Bruno SDR',
    category: 'Comercial',
    role: 'SDR Imobiliario',
    department: 'Comercial',
    status: 'Ativo',
    description: 'Pre-vendedor consultivo que diagnostica necessidade e prepara oportunidades comerciais.',
    personality: 'Consultivo, seguro e orientado a conversao sem pressionar o lead.',
    instructions: 'Entenda perfil, objetivo, urgencia, orcamento, cidade e forma de pagamento. Gere resumo comercial e encaminhe oportunidades qualificadas para closer.',
    response_style: 'Consultivo',
    operation_mode: 'Agente de qualificacao',
    autonomy_level: 3,
    capabilities: ['Fazer perguntas consultivas', 'Diagnosticar necessidade', 'Criar oportunidade', 'Gerar resumo comercial', 'Encaminhar para closer'],
    tools: ['wooapi', 'crm', 'kanban', 'matchmaking'],
    channels: ['WooAPI WhatsApp', 'Chat do site'],
    instances: ['wooapi-vendas-oka', 'chat-site'],
    workspaces: ['Conversas omnichannel', 'CRM de leads', 'Kanban comercial'],
    triggers: ['Nova mensagem recebida', 'Novo lead criado', 'Cliente mencionou financiamento', 'Cliente pediu proposta'],
    pipelines: ['Pre-atendimento', 'Qualificacao', 'Proposta enviada'],
    metrics: ['Leads qualificados', 'Taxa de conversao', 'Tempo medio de resposta'],
  },
  {
    name: 'Kira Kanban',
    category: 'Operacional',
    role: 'Agente de Kanban',
    department: 'Gestao',
    status: 'Em teste',
    description: 'Organiza pipeline, move cards, cria tarefas e mantem oportunidades sem travar.',
    personality: 'Organizada, objetiva e focada em SLA operacional.',
    instructions: 'Monitore cards parados, sugira proximas acoes, crie tarefas de follow-up e alerte responsaveis quando SLA estourar.',
    response_style: 'Objetivo',
    operation_mode: 'Agente operacional',
    autonomy_level: 3,
    capabilities: ['Criar tarefa', 'Mover cards', 'Definir prioridade', 'Sugerir proxima acao', 'Alertar gestor'],
    tools: ['kanban', 'crm', 'agenda'],
    channel_scope: 'Apenas ambiente interno',
    channels: ['Canal interno'],
    workspaces: ['Kanban comercial', 'CRM de leads', 'Agenda', 'Automacoes internas'],
    triggers: ['Card criado no kanban', 'Card movido de etapa', 'Lead parado ha 24 horas', 'Follow-up vencido'],
    pipelines: ['Pre-atendimento', 'Qualificacao', 'Visita agendada', 'Reativacao'],
    metrics: ['Cards movidos', 'Tarefas criadas', 'Follow-ups enviados'],
  },
  {
    name: 'Iris Instagram',
    category: 'Atendimento',
    role: 'Agente de Instagram',
    department: 'Atendimento',
    status: 'Em teste',
    description: 'Atende directs do Instagram, identifica intencao e leva o contato para o CRM.',
    personality: 'Leve, cordial, rapida e alinhada a linguagem de rede social.',
    instructions: 'Responda directs com linguagem natural, identifique interesse, colete telefone quando adequado e crie lead com origem Instagram.',
    response_style: 'Humanizado',
    operation_mode: 'Copiloto humano',
    autonomy_level: 2,
    capabilities: ['Responder FAQ', 'Identificar intencao', 'Criar lead', 'Aplicar tags', 'Transferir atendimento'],
    tools: ['instagram', 'crm', 'kanban'],
    channels: ['Instagram Oficial', 'Instagram nao oficial'],
    instances: ['ig-principal'],
    workspaces: ['Conversas omnichannel', 'CRM de leads', 'Kanban comercial'],
    triggers: ['Nova mensagem recebida', 'Palavra-chave detectada', 'Cliente pediu visita', 'Cliente pediu humano'],
    pipelines: ['Pre-atendimento', 'Qualificacao'],
    metrics: ['Conversas atendidas', 'Leads qualificados', 'Taxa de conversao'],
  },
];

const emptyAgent: AIAgentPayload = {
  name: '',
  role: 'Agente de Qualificacao',
  department: 'Comercial',
  status: 'Rascunho',
  description: '',
  channel: 'whatsapp',
  channel_scope: 'Instancias especificas',
  is_active: false,
  personality: 'Consultiva, objetiva, acolhedora e focada em entender a necessidade real do lead antes de oferecer uma solucao.',
  instructions: 'Descubra objetivo, cidade, faixa de valor, prazo, forma de pagamento e tipo de imovel. Atualize o lead sem parecer robotico. Nunca prometa condicoes comerciais sem validacao humana.',
  capabilities: ['Qualificar lead', 'Aplicar tags', 'Criar resumo do lead'],
  tools: ['whatsapp', 'kanban'],
  response_style: 'Consultivo',
  operation_mode: 'Copiloto humano',
  autonomy_level: 2,
  channels: ['WooAPI WhatsApp'],
  instances: [],
  channel_permissions: {},
  workspaces: ['CRM de leads', 'Conversas omnichannel'],
  triggers: ['Nova mensagem recebida'],
  permissions: {
    'Ler mensagens': true,
    'Sugerir resposta': true,
    'Aplicar tags': true,
    'Criar resumo do lead': true,
    'Exigir aprovacao para envio': true,
    'Bloquear negociacao de preco': true,
  },
  pipelines: ['Qualificacao'],
  knowledge_sources: ['Catalogo de imoveis', 'CRM', 'Scripts comerciais'],
  handoff: {
    rules: ['Cliente pediu atendimento humano', 'Cliente pediu desconto', 'Cliente quer fechar negocio'],
    destination: 'Corretor responsavel',
    actions: ['Enviar resumo da conversa', 'Aplicar tag', 'Notificar humano'],
  },
  metrics: ['Leads qualificados', 'Tempo medio de resposta', 'Taxa de conversao'],
  limits: { maxMessagesPerLead: 3, allowedHours: '08:00-18:00' },
};

const AIAgents: React.FC = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string>('new');
  const [activeTab, setActiveTab] = useState<TabKey>('perfil');
  const [draft, setDraft] = useState<AIAgentPayload>(emptyAgent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedId), [agents, selectedId]);
  const filteredAgents = useMemo(() => agents.filter((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes(query.toLowerCase())), [agents, query]);
  const enabledPermissions = Object.entries(draft.permissions || {}).filter(([, enabled]) => enabled).length;
  const selectedInstances = draft.instances || [];
  const selectedWorkspaces = draft.workspaces || [];
  const selectedTriggers = draft.triggers || [];
  const riskAlerts = buildRiskAlerts(draft);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      setDraft({ ...emptyAgent, ...selectedAgent });
    } else {
      setDraft(emptyAgent);
    }
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

  const patchDraft = (patch: Partial<AIAgentPayload>) => setDraft((current) => ({ ...current, ...patch }));

  const toggleArray = (field: keyof AIAgentPayload, value: string) => {
    const current = ((draft[field] as string[]) || []) as string[];
    patchDraft({
      [field]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    } as Partial<AIAgentPayload>);
  };

  const togglePermission = (permission: string) => {
    patchDraft({
      permissions: {
        ...(draft.permissions || {}),
        [permission]: !(draft.permissions || {})[permission],
      },
    });
  };

  const useTemplate = (template: AIAgentPayload) => {
    setSelectedId('new');
    setActiveTab('perfil');
    setDraft({ ...emptyAgent, ...template });
  };

  const duplicateAgent = () => {
    setSelectedId('new');
    patchDraft({ name: `${draft.name || 'Agente'} - copia`, status: 'Rascunho', is_active: false });
    toast.success('Configuracao duplicada como rascunho.');
  };

  const saveAgent = async () => {
    if (!draft.name?.trim() || !draft.role?.trim()) {
      toast.error('Informe nome e funcao do agente.');
      setActiveTab('perfil');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...draft,
        is_active: draft.status === 'Ativo' || draft.status === 'Em teste',
        capabilities: draft.capabilities || [],
        tools: draft.tools || [],
      };

      if (selectedAgent) {
        await aiAgentService.update(selectedAgent.id, payload);
        toast.success('Agente atualizado.');
      } else {
        const created = await aiAgentService.create(payload);
        setSelectedId(created.id);
        toast.success('Agente criado.');
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

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Carregando agentes...</div>;

  return (
    <div className="min-h-full bg-[#F7F9FC] -m-6 p-5 lg:p-6">
      <div className="max-w-[1580px] mx-auto space-y-5">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.24em] mb-2">
              <WandSparkles size={16} /> Orquestrador de Agentes
            </div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">Central de Agentes Operacionais</h1>
            <p className="text-sm text-slate-500 font-medium mt-2 max-w-4xl">
              Crie agentes, conecte canais, defina onde eles trabalham e controle o que cada IA pode fazer dentro da sua operacao.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={duplicateAgent} className="agent-btn-secondary">
              <Copy size={17} /> Duplicar
            </button>
            <button
              onClick={() => {
                setSelectedId('new');
                setActiveTab('perfil');
              }}
              className="agent-btn-primary"
            >
              <Plus size={18} /> Novo agente
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 2xl:grid-cols-[330px_minmax(0,1fr)] gap-5">
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="agent-input pl-9" placeholder="Buscar agente" />
              </div>
              <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setSelectedId(agent.id);
                      setActiveTab('perfil');
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedId === agent.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center">
                        <Bot size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-sm text-slate-900 truncate">{agent.name}</p>
                        <p className="text-xs text-slate-500 truncate">{agent.role}</p>
                      </div>
                      <AgentStatusBadge status={agent.status || (agent.is_active ? 'Ativo' : 'Pausado')} compact />
                    </div>
                  </button>
                ))}
                {agents.length === 0 && <div className="p-5 text-sm text-slate-500 text-center">Nenhum agente criado ainda.</div>}
              </div>
            </div>

            <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200 mb-1">Modelos prontos</p>
              <p className="text-xs text-white/55 mb-3">Selecione um modelo para preencher o agente.</p>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button key={template.name} onClick={() => useTemplate(template)} className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{template.name}</p>
                      <span className="text-[10px] font-black uppercase tracking-wide text-indigo-100 bg-indigo-500/20 rounded-full px-2 py-1">{template.category}</span>
                    </div>
                    <p className="text-xs text-white/55">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <AgentSummary draft={draft} riskAlerts={riskAlerts} enabledPermissions={enabledPermissions} />
          </aside>

          <main className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Brain size={20} />
                </div>
                <div>
                  <h2 className="font-black text-slate-950">{selectedAgent ? 'Editar agente operacional' : 'Novo agente operacional'}</h2>
                  <p className="text-xs text-slate-500">Crie agentes que trabalham na operacao, nao apenas respondem mensagens.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AgentStatusBadge status={draft.status || 'Rascunho'} />
                {selectedAgent && (
                  <button onClick={removeAgent} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="border-b border-slate-100 bg-slate-50/70 overflow-x-auto">
              <div className="flex min-w-max p-2 gap-1">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)} className={`agent-tab ${activeTab === id ? 'agent-tab-active' : ''}`}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 lg:p-6">
              {activeTab === 'perfil' && <ProfileTab draft={draft} patchDraft={patchDraft} />}
              {activeTab === 'canais' && <ChannelsTab draft={draft} patchDraft={patchDraft} toggleArray={toggleArray} />}
              {activeTab === 'atuacao' && <SelectionGrid title="Em quais areas da operacao esse agente pode atuar?" items={workspaces} selected={selectedWorkspaces} onToggle={(value) => toggleArray('workspaces', value)} />}
              {activeTab === 'modo' && <ModeTab draft={draft} patchDraft={patchDraft} />}
              {activeTab === 'gatilhos' && <TriggersTab draft={draft} patchDraft={patchDraft} selected={selectedTriggers} toggleArray={toggleArray} />}
              {activeTab === 'permissoes' && <PermissionsTab draft={draft} togglePermission={togglePermission} />}
              {activeTab === 'kanban' && <KanbanTab draft={draft} toggleArray={toggleArray} />}
              {activeTab === 'conhecimento' && <KnowledgeTab draft={draft} toggleArray={toggleArray} />}
              {activeTab === 'handoff' && <HandoffTab draft={draft} patchDraft={patchDraft} />}
              {activeTab === 'metricas' && <MetricsTab draft={draft} toggleArray={toggleArray} />}
              {activeTab === 'simulacao' && <SimulationTab draft={draft} />}
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <MiniStat icon={MessageSquareText} label={`${(draft.channels || []).length} canais`} />
                <MiniStat icon={Route} label={`${selectedInstances.length} instancias`} />
                <MiniStat icon={Zap} label={`${selectedTriggers.length} gatilhos`} />
                <MiniStat icon={ShieldCheck} label={`${enabledPermissions} permissoes`} />
              </div>
              <button onClick={saveAgent} disabled={saving} className="h-11 px-6 bg-slate-950 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar agente'}
              </button>
            </div>
          </main>
        </section>
      </div>

      <style>{`
        .agent-input { width: 100%; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 11px 13px; font-size: 14px; outline: none; }
        .agent-input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(99,102,241,.12); background: white; }
        .agent-tab { height: 38px; padding: 0 12px; border-radius: 10px; display: inline-flex; align-items: center; gap: 7px; color: #64748b; font-size: 12px; font-weight: 800; white-space: nowrap; }
        .agent-tab:hover { background: #fff; color: #334155; }
        .agent-tab-active { background: #4f46e5; color: #fff; box-shadow: 0 8px 18px rgba(79,70,229,.18); }
        .agent-btn-primary { height: 42px; padding: 0 16px; background: #4f46e5; color: #fff; border-radius: 12px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .agent-btn-secondary { height: 42px; padding: 0 14px; background: #fff; color: #334155; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
      `}</style>
    </div>
  );
};

function buildRiskAlerts(draft: AIAgentPayload) {
  const alerts: string[] = [];
  const permissions = draft.permissions || {};
  if (permissions['Responder automaticamente'] && !(draft.instances || []).length && draft.channel_scope !== 'Apenas ambiente interno') {
    alerts.push('Resposta automatica sem instancia definida.');
  }
  if (Number(draft.autonomy_level || 1) >= 5) alerts.push('Autonomia total exige revisao de seguranca.');
  if (permissions['Enviar documento'] && !permissions['Exigir aprovacao para envio']) alerts.push('Envio de documento deve exigir aprovacao.');
  if (['Juridico', 'Financeiro'].includes(String(draft.department)) && !((draft.handoff as any)?.rules || []).length) alerts.push('Area sensivel sem handoff configurado.');
  return alerts;
}

const ProfileTab = ({ draft, patchDraft }: { draft: AIAgentPayload; patchDraft: (patch: Partial<AIAgentPayload>) => void }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <Field label="Nome do agente">
      <input value={draft.name || ''} onChange={(e) => patchDraft({ name: e.target.value })} className="agent-input" placeholder="Ex: Lia Qualificacao" />
    </Field>
    <Field label="Funcao">
      <select value={draft.role || roles[0]} onChange={(e) => patchDraft({ role: e.target.value })} className="agent-input">
        {roles.map((role) => <option key={role}>{role}</option>)}
      </select>
    </Field>
    <Field label="Departamento">
      <select value={draft.department || departments[0]} onChange={(e) => patchDraft({ department: e.target.value })} className="agent-input">
        {departments.map((department) => <option key={department}>{department}</option>)}
      </select>
    </Field>
    <Field label="Estilo">
      <select value={draft.response_style || styles[0]} onChange={(e) => patchDraft({ response_style: e.target.value })} className="agent-input">
        {styles.map((style) => <option key={style}>{style}</option>)}
      </select>
    </Field>
    <Field label="Status">
      <select value={draft.status || 'Rascunho'} onChange={(e) => patchDraft({ status: e.target.value, is_active: e.target.value === 'Ativo' || e.target.value === 'Em teste' })} className="agent-input">
        {statuses.map((status) => <option key={status}>{status}</option>)}
      </select>
    </Field>
    <Field label="Descricao curta">
      <input value={draft.description || ''} onChange={(e) => patchDraft({ description: e.target.value })} className="agent-input" placeholder="O que esse agente entrega na operacao" />
    </Field>
    <Field label="Personalidade">
      <textarea value={draft.personality || ''} onChange={(e) => patchDraft({ personality: e.target.value })} className="agent-input min-h-28" />
    </Field>
    <Field label="Instrucoes operacionais">
      <textarea value={draft.instructions || ''} onChange={(e) => patchDraft({ instructions: e.target.value })} className="agent-input min-h-28" />
    </Field>
  </div>
);

const ChannelsTab = ({ draft, patchDraft, toggleArray }: { draft: AIAgentPayload; patchDraft: (patch: Partial<AIAgentPayload>) => void; toggleArray: (field: keyof AIAgentPayload, value: string) => void }) => (
  <div className="space-y-5">
    <SectionHeader title="Onde esse agente vai trabalhar?" subtitle="Defina canais, instancias, permissao de leitura e onde a IA pode responder." />
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
      {['Todas as instancias', 'Instancias especificas', 'Apenas canais especificos', 'Apenas ambiente interno', 'Nenhuma instancia direta'].map((scope) => (
        <button key={scope} onClick={() => patchDraft({ channel_scope: scope })} className={`p-3 rounded-xl border text-xs font-black text-left ${draft.channel_scope === scope ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>
          {scope}
        </button>
      ))}
    </div>
    <ChoicePanel icon={MessageSquareText} title="Canais disponiveis">
      {channels.map((channel) => <Chip key={channel} active={(draft.channels || []).includes(channel)} onClick={() => toggleArray('channels', channel)} label={channel} />)}
    </ChoicePanel>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {instances.map((instance) => (
        <button key={instance.id} onClick={() => toggleArray('instances', instance.id)} className={`text-left p-4 rounded-xl border transition-colors ${(draft.instances || []).includes(instance.id) ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900">{instance.name}</p>
              <p className="text-xs text-slate-500 mt-1">{instance.channel} - {instance.unit}</p>
            </div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1">{instance.status}</span>
          </div>
        </button>
      ))}
    </div>
    <ChoicePanel icon={ShieldCheck} title="Permissoes por canal">
      {['Ler mensagens', 'Responder automaticamente', 'Sugerir resposta', 'Aplicar tags', 'Criar lead', 'Atualizar lead', 'Transferir atendimento', 'Enviar midia', 'Enviar documento', 'Agendar retorno'].map((permission) => (
        <Chip key={permission} active={Boolean((draft.permissions || {})[permission])} onClick={() => patchDraft({ permissions: { ...(draft.permissions || {}), [permission]: !(draft.permissions || {})[permission] } })} label={permission} />
      ))}
    </ChoicePanel>
  </div>
);

const ModeTab = ({ draft, patchDraft }: { draft: AIAgentPayload; patchDraft: (patch: Partial<AIAgentPayload>) => void }) => (
  <div className="space-y-5">
    <SectionHeader title="Como esse agente deve atuar?" subtitle="Escolha o papel operacional e o nivel de autonomia permitido." />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {operationModes.map(([mode, description]) => (
        <button key={mode} onClick={() => patchDraft({ operation_mode: mode })} className={`text-left p-4 rounded-xl border ${draft.operation_mode === mode ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
          <p className="font-black text-sm text-slate-900">{mode}</p>
          <p className="text-xs text-slate-500 mt-2">{description}</p>
        </button>
      ))}
    </div>
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-black text-slate-950">Nivel de autonomia</p>
          <p className="text-xs text-slate-500">1 observa, 5 executa tudo que estiver permitido.</p>
        </div>
        <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">Nivel {draft.autonomy_level || 2}</span>
      </div>
      <input type="range" min={1} max={5} value={draft.autonomy_level || 2} onChange={(e) => patchDraft({ autonomy_level: Number(e.target.value) })} className="w-full accent-indigo-600" />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-4">
        {['Observador', 'Copiloto', 'Operador assistido', 'Autonomo controlado', 'Autonomo total'].map((label, index) => (
          <div key={label} className={`p-3 rounded-xl text-xs font-bold ${Number(draft.autonomy_level || 2) === index + 1 ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{label}</div>
        ))}
      </div>
    </div>
  </div>
);

const TriggersTab = ({ draft, patchDraft, selected, toggleArray }: { draft: AIAgentPayload; patchDraft: (patch: Partial<AIAgentPayload>) => void; selected: string[]; toggleArray: (field: keyof AIAgentPayload, value: string) => void }) => (
  <div className="space-y-5">
    <SelectionGrid title="Quando esse agente deve agir?" items={triggers.map((item) => [item, 'Gatilho operacional monitorado pelo orquestrador.'])} selected={selected} onToggle={(value) => toggleArray('triggers', value)} />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Field label="Horas parado"><input className="agent-input" value={String((draft.limits as any)?.idleHours || 24)} onChange={(e) => patchDraft({ limits: { ...(draft.limits || {}), idleHours: e.target.value } })} /></Field>
      <Field label="Dias parado"><input className="agent-input" value={String((draft.limits as any)?.idleDays || 3)} onChange={(e) => patchDraft({ limits: { ...(draft.limits || {}), idleDays: e.target.value } })} /></Field>
      <Field label="Horario permitido"><input className="agent-input" value={String((draft.limits as any)?.allowedHours || '08:00-18:00')} onChange={(e) => patchDraft({ limits: { ...(draft.limits || {}), allowedHours: e.target.value } })} /></Field>
      <Field label="Max. mensagens por lead"><input className="agent-input" value={String((draft.limits as any)?.maxMessagesPerLead || 3)} onChange={(e) => patchDraft({ limits: { ...(draft.limits || {}), maxMessagesPerLead: e.target.value } })} /></Field>
    </div>
  </div>
);

const PermissionsTab = ({ draft, togglePermission }: { draft: AIAgentPayload; togglePermission: (permission: string) => void }) => (
  <div className="space-y-4">
    <SectionHeader title="O que esse agente pode fazer?" subtitle="Governanca por categoria, com destaque para acoes sensiveis." />
    {Object.entries(permissionGroups).map(([group, items]) => (
      <ChoicePanel key={group} icon={group === 'Seguranca' ? ShieldCheck : Check} title={group}>
        {items.map((item) => <Chip key={item} active={Boolean((draft.permissions || {})[item])} onClick={() => togglePermission(item)} label={item} />)}
      </ChoicePanel>
    ))}
  </div>
);

const KanbanTab = ({ draft, toggleArray }: { draft: AIAgentPayload; toggleArray: (field: keyof AIAgentPayload, value: string) => void }) => (
  <div className="space-y-5">
    <SelectionGrid title="Em quais pipelines esse agente atua?" items={pipelines.map((item) => [item, 'Permite criar cards, mover etapas, gerar tarefas e sugerir proxima acao.'])} selected={draft.pipelines || []} onToggle={(value) => toggleArray('pipelines', value)} />
    <ChoicePanel icon={GitBranch} title="Acoes no kanban">
      {['Criar card quando novo lead chegar', 'Mover card quando lead for qualificado', 'Mover card quando visita for agendada', 'Criar tarefa de follow-up', 'Adicionar resumo interno', 'Sugerir proxima etapa', 'Marcar lead como quente', 'Definir motivo de perda'].map((item) => (
        <Chip key={item} active={Boolean((draft.permissions || {})[item])} onClick={() => {}} label={item} />
      ))}
    </ChoicePanel>
  </div>
);

const KnowledgeTab = ({ draft, toggleArray }: { draft: AIAgentPayload; toggleArray: (field: keyof AIAgentPayload, value: string) => void }) => (
  <SelectionGrid title="Quais fontes esse agente pode acessar?" items={knowledgeSources.map((item) => [item, 'Fonte consultada pelo agente para montar contexto antes de agir.'])} selected={draft.knowledge_sources || []} onToggle={(value) => toggleArray('knowledge_sources', value)} />
);

const HandoffTab = ({ draft, patchDraft }: { draft: AIAgentPayload; patchDraft: (patch: Partial<AIAgentPayload>) => void }) => {
  const handoff = (draft.handoff as any) || {};
  const selectedRules = handoff.rules || [];
  const toggleRule = (rule: string) => {
    patchDraft({ handoff: { ...handoff, rules: selectedRules.includes(rule) ? selectedRules.filter((item: string) => item !== rule) : [...selectedRules, rule] } });
  };
  return (
    <div className="space-y-5">
      <SelectionGrid title="Quando esse agente deve chamar um humano?" items={handoffRules.map((item) => [item, 'Transfere ou solicita aprovacao antes de continuar.'])} selected={selectedRules} onToggle={toggleRule} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Destino do handoff">
          <select className="agent-input" value={handoff.destination || 'Corretor responsavel'} onChange={(e) => patchDraft({ handoff: { ...handoff, destination: e.target.value } })}>
            {['Corretor responsavel', 'Vendedor responsavel', 'Closer', 'SDR', 'Suporte', 'Financeiro', 'Juridico', 'Gestor', 'Fila especifica', 'Usuario especifico'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Mensagem interna padrao">
          <input className="agent-input" value={handoff.internalMessage || 'Lead com alta intencao. Recomendo atendimento humano imediato.'} onChange={(e) => patchDraft({ handoff: { ...handoff, internalMessage: e.target.value } })} />
        </Field>
      </div>
    </div>
  );
};

const MetricsTab = ({ draft, toggleArray }: { draft: AIAgentPayload; toggleArray: (field: keyof AIAgentPayload, value: string) => void }) => (
  <SelectionGrid title="Como medir se esse agente esta funcionando?" items={metrics.map((item) => [item, 'Indicador acompanhado por agente e por periodo.'])} selected={draft.metrics || []} onToggle={(value) => toggleArray('metrics', value)} />
);

const SimulationTab = ({ draft }: { draft: AIAgentPayload }) => {
  const [message, setMessage] = useState('Oi, gostei do apartamento no bairro Campinas. Aceita financiamento?');
  const predicted = useMemo(() => simulateAgent(draft, message), [draft, message]);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
      <div className="space-y-4">
        <SectionHeader title="Testar agente antes de ativar" subtitle="Simule uma mensagem e visualize resposta, acoes, tags e risco de handoff." />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="agent-input min-h-36" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Canal simulado"><select className="agent-input"><option>WooAPI WhatsApp</option><option>Instagram Oficial</option><option>Chat do site</option></select></Field>
          <Field label="Instancia"><select className="agent-input"><option>WooAPI Vendas - Oka Imoveis</option><option>Chat Site - Landing Page</option></select></Field>
          <Field label="Etapa kanban"><select className="agent-input"><option>Qualificacao</option><option>Visita agendada</option><option>Proposta enviada</option></select></Field>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Resultado previsto</p>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-black text-slate-900 mb-2">Resposta sugerida</p>
          <p className="text-sm text-slate-600">{predicted.reply}</p>
        </div>
        <ResultList title="Acoes" items={predicted.actions} />
        <ResultList title="Tags" items={predicted.tags} />
        <div className={`rounded-xl border p-3 ${predicted.handoff ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <p className="text-sm font-black">{predicted.handoff ? 'Handoff recomendado' : 'Handoff nao necessario'}</p>
        </div>
      </div>
    </div>
  );
};

function simulateAgent(draft: AIAgentPayload, message: string) {
  const lower = message.toLowerCase();
  const tags = ['interesse_imovel'];
  const actions = ['Identificar interesse em imovel', 'Criar ou atualizar lead', 'Manter na etapa Qualificacao'];
  if (lower.includes('financi')) {
    tags.push('interesse_financiamento');
    actions.push('Perguntar se ja possui financiamento aprovado');
  }
  if (lower.includes('visita')) {
    tags.push('pedido_visita');
    actions.push('Criar tarefa de visita');
  }
  return {
    reply: `${draft.name || 'Agente'} sugeriria: Perfeito, posso te ajudar com isso. Voce ja tem uma faixa de valor definida e pretende financiar por qual banco?`,
    tags,
    actions,
    handoff: lower.includes('desconto') || lower.includes('contrato') || lower.includes('fechar'),
  };
}

const SelectionGrid = ({ title, items, selected, onToggle }: { title: string; items: string[][]; selected: string[]; onToggle: (value: string) => void }) => (
  <div className="space-y-4">
    <SectionHeader title={title} />
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map(([label, description]) => (
        <button key={label} onClick={() => onToggle(label)} className={`text-left p-4 rounded-xl border transition-colors ${selected.includes(label) ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center ${selected.includes(label) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-transparent'}`}><Check size={13} /></span>
            <div>
              <p className="font-black text-sm text-slate-900">{label}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const AgentSummary = ({ draft, riskAlerts, enabledPermissions }: { draft: AIAgentPayload; riskAlerts: string[]; enabledPermissions: number }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 mb-3">Resumo da configuracao</p>
    <div className="space-y-3 text-sm">
      <SummaryLine label="Modo" value={draft.operation_mode || 'Copiloto humano'} />
      <SummaryLine label="Autonomia" value={`Nivel ${draft.autonomy_level || 2}`} />
      <SummaryLine label="Canais" value={String((draft.channels || []).length)} />
      <SummaryLine label="Areas" value={String((draft.workspaces || []).length)} />
      <SummaryLine label="Permissoes" value={String(enabledPermissions)} />
    </div>
    {riskAlerts.length > 0 && (
      <div className="mt-4 space-y-2">
        {riskAlerts.map((alert) => (
          <div key={alert} className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            <AlertTriangle size={15} /> {alert}
          </div>
        ))}
      </div>
    )}
  </div>
);

const AgentStatusBadge = ({ status, compact = false }: { status: string; compact?: boolean }) => {
  const palette: Record<string, string> = {
    Ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rascunho: 'bg-slate-50 text-slate-500 border-slate-200',
    'Em teste': 'bg-blue-50 text-blue-700 border-blue-200',
    Pausado: 'bg-amber-50 text-amber-700 border-amber-200',
    'Com erro': 'bg-red-50 text-red-700 border-red-200',
    Inativo: 'bg-slate-100 text-slate-700 border-slate-300',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border font-black ${compact ? 'w-2.5 h-2.5 p-0 text-transparent overflow-hidden' : 'px-3 py-1 text-xs'} ${palette[status] || palette.Rascunho}`}>{status === 'Ativo' ? <PlayCircle size={13} /> : <PauseCircle size={13} />} {status}</span>;
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">{label}</span>
    {children}
  </label>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div>
    <h3 className="text-lg font-black text-slate-950">{title}</h3>
    {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

const ChoicePanel: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="border border-slate-200 rounded-2xl p-4 bg-white">
    <div className="flex items-center gap-2 mb-3 text-slate-900 font-black text-sm">
      <Icon size={17} className="text-indigo-600" /> {title}
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

const Chip: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`px-3 py-2 rounded-full border text-xs font-bold transition-colors ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
    {label}
  </button>
);

const MiniStat = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
    <Icon size={14} className="text-indigo-600" /> {label}
  </div>
);

const SummaryLine = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-slate-500">{label}</span>
    <span className="font-black text-slate-900 text-right">{value}</span>
  </div>
);

const ResultList = ({ title, items }: { title: string; items: string[] }) => (
  <div>
    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 mb-2">{title}</p>
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
          <ChevronRight size={15} className="text-indigo-600" /> {item}
        </div>
      ))}
    </div>
  </div>
);

export default AIAgents;
