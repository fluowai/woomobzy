import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bot, ArrowLeft, ArrowRight, Building2, MessageSquare, Target,
  GitBranch, Settings, TestTube2, Radio, Rocket, Sparkles,
  Check, Loader2, Brain, Users, Shield, Database, Plus, X,
  Wand2, ChevronDown, ChevronUp, Play as PlayIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useAIPath } from '@/src/hooks/usePanelBase';
import { createOperation, runArchitect as runArchitectApi, publishOperation } from '../services/aiWorkforce';

type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter';
type AIModel = 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-5-sonnet-20241022' | 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'llama-3.1-8b-instant';

const providerOptions = [
  { value: 'openai' as AIProvider, label: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o'], default: 'gpt-4o-mini', icon: 'Bot' },
  { value: 'anthropic' as AIProvider, label: 'Anthropic', models: ['claude-3-5-sonnet-20241022'], default: 'claude-3-5-sonnet-20241022', icon: 'Shield' },
  { value: 'gemini' as AIProvider, label: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash'], default: 'gemini-1.5-pro', icon: 'Sparkles' },
  { value: 'groq' as AIProvider, label: 'Groq', models: ['llama-3.1-8b-instant'], default: 'llama-3.1-8b-instant', icon: 'Zap' },
  { value: 'openrouter' as AIProvider, label: 'OpenRouter', models: ['gpt-4o-mini'], default: 'gpt-4o-mini', icon: 'Router' }
];

const steps = [
  { id: 'business', label: 'Negócio', icon: Building2 },
  { id: 'operation', label: 'Operação', icon: MessageSquare },
  { id: 'objectives', label: 'Objetivos', icon: Target },
  { id: 'architecture', label: 'Arquitetura', icon: GitBranch },
  { id: 'config', label: 'Configuração', icon: Settings },
  { id: 'tests', label: 'Testes', icon: TestTube2 },
  { id: 'channels', label: 'Canais', icon: Radio },
  { id: 'publish', label: 'Publicação', icon: Rocket },
];

const segments = [
  { id: 'URBAN_REAL_ESTATE', label: 'Imobiliária Urbana', desc: 'Venda, locação e administração de imóveis urbanos', icon: Building2 },
  { id: 'RURAL_REAL_ESTATE', label: 'Imobiliária Rural', desc: 'Fazendas, sítios, chácaras e áreas de investimento', icon: Bot },
  { id: 'DEVELOPER', label: 'Incorporadora', desc: 'Lançamentos, obras e venda de unidades', icon: GitBranch },
  { id: 'BUILDER', label: 'Construtora', desc: 'Construção e venda de unidades prontas', icon: Settings },
  { id: 'LAND_DEVELOPER', label: 'Loteadora', desc: 'Loteamentos e venda de lotes', icon: Target },
];

const urbanOperations = ['Venda', 'Locação', 'Administração', 'Captação', 'Lançamentos', 'Avaliação', 'Financiamento', 'Pós-venda'];
const urbanGoals = [
  'Primeiro atendimento', 'Pré-atendimento', 'Qualificação', 'Busca de imóveis',
  'Recomendação', 'Agendamento', 'Follow-up', 'Recuperação de leads',
  'Captação', 'Atendimento de proprietários', 'Atendimento de locatários', 'Pós-venda'
];
const ruralOperations = ['Venda de propriedades', 'Arrendamento', 'Áreas de investimento', 'Captação de propriedades', 'Visitas técnicas', 'Due diligence'];
const ruralGoals = ['Qualificação de compradores rurais', 'Busca de propriedades', 'Análise de documentação (CAR, matrícula)', 'Agendamento de visitas técnicas', 'Follow-up', 'Atendimento a investidores'];
const developerOperations = ['Lançamentos', 'Venda de estoque', 'Atendimento por empreendimento', 'Corretores parceiros', 'Campanhas específicas'];
const developerGoals = ['Qualificação de compradores', 'Simulação de fluxo de pagamento', 'Agendamento em stand', 'Disponibilidade por torre/bloco', 'Follow-up', 'Atendimento a corretores parceiros'];
const builderOperations = ['Venda de unidades prontas', 'Acompanhamento de obra', 'Entrega de chaves', 'Assistência técnica'];
const builderGoals = ['Qualificação de compradores', 'Visitas à obra', 'Simulação de financiamento', 'Assistência técnica', 'Pós-entrega'];
const landDeveloperOperations = ['Loteamento aberto', 'Condomínio fechado', 'Lotes comerciais', 'Lotes industriais', 'Tabela dinâmica', 'Financiamento próprio'];
const landDeveloperGoals = ['Escolha de lote no mapa', 'Disponibilidade em tempo real', 'Simulação de financiamento próprio', 'Agendamento de visita', 'Follow-up', 'Campanhas por empreendimento'];

const segmentData: Record<string, { operations: string[]; goals: string[] }> = {
  URBAN_REAL_ESTATE: { operations: urbanOperations, goals: urbanGoals },
  RURAL_REAL_ESTATE: { operations: ruralOperations, goals: ruralGoals },
  DEVELOPER: { operations: developerOperations, goals: developerGoals },
  BUILDER: { operations: builderOperations, goals: builderGoals },
  LAND_DEVELOPER: { operations: landDeveloperOperations, goals: landDeveloperGoals },
};

type ArchitectureDraft = {
  operation: {
    name: string;
    description: string;
    globalGuardrails: Record<string, unknown>;
  };
  agents: Array<{
    id: string;
    name: string;
    type: string;
    role?: string;
    description?: string;
    tools: string[];
    model?: string;
  }>;
  workflows: Array<Record<string, unknown>>;
  testPlan: Array<Record<string, unknown>>;
};

const mockTestScores = {
  conversation: 98,
  tools: 100,
  memory: 95,
  antiRepetition: 100,
  security: 96,
  handoff: 92,
  data: 100,
  overall: 97
};

const CreateOperationWizard: React.FC = () => {
  const navigate = useNavigate();
  const aiPath = useAIPath();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    segment: 'URBAN_REAL_ESTATE',
    operations: [] as string[],
    goals: [] as string[],
    sameForBoth: 'separate',
    additional: '',
    businessModel: {} as Record<string, unknown>,
    architecture: null as ArchitectureDraft | null,
    selectedChannels: {} as Record<string, string[]>,
    testsRun: false,
    selectedAIProvider: 'gemini' as AIProvider,
    selectedAIModel: 'gemini-1.5-pro' as AIModel
  });
  const [testRunning, setTestRunning] = useState(false);

  const currentSegment = segmentData[draft.segment] || segmentData.URBAN_REAL_ESTATE;
  const currentStepInfo = steps[currentStep];
  const canGoNext = useMemo(() => {
    switch (steps[currentStep].id) {
      case 'business': return draft.segment !== '';
      case 'operation': return draft.operations.length > 0;
      case 'objectives': return draft.goals.length > 0 || draft.additional.trim().length > 0;
      case 'architecture': return !!draft.architecture;
      case 'tests': return draft.testsRun;
      case 'channels': return Object.keys(draft.selectedChannels).length > 0;
      default: return true;
    }
  }, [currentStep, draft]);

  const toggleItem = (field: 'operations' | 'goals', value: string) => {
    setDraft(d => {
      const current = d[field];
      const next = current.includes(value) ? current.filter(x => x !== value) : [...current, value];
      return { ...d, [field]: next };
    });
  };

  const toggleChannel = (channel: string, instance: string) => {
    setDraft(d => {
      const current = d.selectedChannels[channel] || [];
      const next = current.includes(instance) ? current.filter(x => x !== instance) : [...current, instance];
      return { ...d, selectedChannels: { ...d.selectedChannels, [channel]: next } };
    });
  };

  const ensureOperation = async (): Promise<string> => {
    if (operationId) return operationId;
    const created = await createOperation({
      name: draft.name || `Operação ${draft.segment}`,
      segment: draft.segment,
      businessModel: {
        operations: draft.operations,
        sameForBoth: draft.sameForBoth,
        additional: draft.additional
      },
      objectives: draft.goals
    });
    setOperationId(created.id);
    return created.id;
  };

  const runArchitect = async () => {
    setLoading(true);
    try {
      const id = await ensureOperation();
      const result = await runArchitectApi(id, { provider: draft.selectedAIProvider, model: draft.selectedAIModel });
      setDraft(d => ({
        ...d,
        architecture: {
          operation: {
            name: result.architecture.name,
            description: result.architecture.description,
            globalGuardrails: result.architecture.globalGuardrails || {}
          },
          agents: (result.agents || []).map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            role: a.role,
            description: a.description || '',
            tools: (a.tools || []).map((t: any) => t?.name || t?.id || String(t)),
            model: (a.versions?.[0] as any)?.model || draft.selectedAIModel
          })),
          workflows: result.architecture.workflows || [],
          testPlan: result.testPlan || []
        }
      }));
      toast.success('Arquitetura gerada pela WooTech IA!');
    } catch (error: any) {
      toast.error('Erro ao gerar arquitetura: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    setTestRunning(true);
    try {
      await ensureOperation();
      setDraft(d => ({ ...d, testsRun: true }));
      toast.success('Testes marcados como concluídos. Operação criada.');
    } catch (error: any) {
      toast.error('Erro ao executar testes: ' + error.message);
    } finally {
      setTestRunning(false);
    }
  };

  const publish = async () => {
    setLoading(true);
    try {
      const id = await ensureOperation();
      await publishOperation(id, 0);
      toast.success('Operação publicada com sucesso!');
      navigate(aiPath(`operations/${id}`));
    } catch (error: any) {
      toast.error('Erro ao publicar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderBusiness = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-950 mb-1">Qual o segmento da sua empresa?</h3>
        <p className="text-sm text-slate-500 mb-4">Identificamos automaticamente os segmentos habilitados no seu tenant. A WooTech IA criará agentes compatíveis apenas com seu segmento.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {segments.map(s => (
            <button key={s.id} onClick={() => setDraft(d => ({ ...d, segment: s.id }))}
              className={`text-left rounded-xl border p-4 transition ${draft.segment === s.id ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${draft.segment === s.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <s.icon size={20} />
                </div>
                <div>
                  <div className="font-bold text-slate-950 text-sm">{s.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <Field label="Nome da operação">
        <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          className="w-full h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
          placeholder="Ex.: Operação Comercial Urbana" />
      </Field>
    </div>
  );

  const renderOperation = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-950 mb-1">Quais operações sua empresa realiza?</h3>
        <p className="text-sm text-slate-500 mb-4">Selecione todas as que se aplicam ao seu negócio.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {currentSegment.operations.map(op => (
            <button key={op} onClick={() => toggleItem('operations', op)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-bold transition ${draft.operations.includes(op) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
              {draft.operations.includes(op) ? <Check size={16} className="text-emerald-600" /> : <Plus size={16} className="text-slate-400" />}
              {op}
            </button>
          ))}
        </div>
      </div>
      {draft.operations.includes('Venda') && draft.operations.includes('Locação') && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h4 className="font-bold text-slate-950 text-sm mb-2">Sobre venda e locação</h4>
          <p className="text-xs text-slate-600 mb-3">Como você quer estruturar o atendimento?</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'same', label: 'Mesmo atendimento' },
              { id: 'separate', label: 'Agentes diferentes' },
              { id: 'funnels', label: 'Funis separados' },
              { id: 'teams', label: 'Equipes comerciais separadas' }
            ].map(o => (
              <button key={o.id} onClick={() => setDraft(d => ({ ...d, sameForBoth: o.id }))}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition ${draft.sameForBoth === o.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-blue-700 mt-3">Recomendado pela WooTech IA: <b>Agentes diferentes</b> — funis e qualificações distintos.</p>
        </div>
      )}
      <Field label="Descreva alguma necessidade adicional (opcional)">
        <textarea value={draft.additional} onChange={e => setDraft(d => ({ ...d, additional: e.target.value }))}
          className="w-full min-h-24 rounded-lg border border-slate-200 p-4 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none resize-none"
          placeholder="Ex.: Atendemos também proprietários que querem vender, e temos parceria com um banco para financiamento..." />
      </Field>
    </div>
  );

  const renderObjectives = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-950 mb-1">O que você quer que sua equipe de IA faça?</h3>
        <p className="text-sm text-slate-500 mb-4">Selecione as atividades que deseja automatizar.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {currentSegment.goals.map(g => (
            <button key={g} onClick={() => toggleItem('goals', g)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-bold transition ${draft.goals.includes(g) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
              {draft.goals.includes(g) ? <Check size={16} className="text-emerald-600" /> : <Plus size={16} className="text-slate-400" />}
              {g}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderArchitecture = () => {
    if (!draft.architecture) {
      return (
        <div className="text-center py-16">
          <div className="h-20 w-20 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <Brain className="h-10 w-10 text-emerald-600 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-slate-950 mb-2">A WooTech IA vai desenhar sua equipe</h3>
          <p className="text-slate-500 max-w-lg mx-auto mb-6 text-sm">
            Com base nas informações fornecidas, a IA criará automaticamente a arquitetura de agentes: quantos agentes, funções, prompts, ferramentas, permissões e workflows.
          </p>
          <button onClick={runArchitect} disabled={loading}
            className="h-12 px-6 rounded-xl bg-slate-950 text-white font-bold text-sm flex items-center gap-2 mx-auto hover:bg-slate-800 disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? 'Gerando arquitetura...' : 'Gerar arquitetura com IA'}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Sparkles className="text-emerald-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">Recomendamos uma operação com {draft.architecture.agents.length} agentes</h3>
            <p className="text-sm text-slate-500">{draft.architecture.operation.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {draft.architecture.agents.map((agent, idx) => (
            <div key={agent.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-white ${idx === 0 ? 'bg-slate-950' : 'bg-emerald-600'}`}>
                  {idx === 0 ? <Brain size={18} /> : <Bot size={18} />}
                </div>
                <div>
                  <div className="font-bold text-slate-950 text-sm">{agent.name}</div>
                  <div className="text-[11px] text-slate-500">{agent.type}</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-3">{agent.description}</p>
              {agent.tools.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {agent.tools.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={runArchitect} disabled={loading}
            className="h-11 px-5 rounded-xl bg-slate-950 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Regenerar
          </button>
          <span className="text-xs text-slate-500 self-center">Use "Ajustar estrutura" para personalizar no chat com a IA (disponível em breve).</span>
        </div>
      </div>
    );
  };

  const renderConfig = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="text-emerald-600" size={22} />
        <div>
          <h3 className="text-lg font-bold text-slate-950">Tudo configurado automaticamente</h3>
          <p className="text-sm text-slate-500">Prompts, ferramentas, permissões, memória e guardrails foram criados pela IA.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Bot, label: 'Prompts gerados', value: '4 agentes', color: 'bg-emerald-50 text-emerald-600' },
          { icon: Database, label: 'Ferramentas selecionadas', value: '8 tools', color: 'bg-blue-50 text-blue-600' },
          { icon: Shield, label: 'Permissões', value: '14 (menor privilégio)', color: 'bg-purple-50 text-purple-600' },
          { icon: Users, label: 'Memória', value: 'Ativa (4 camadas)', color: 'bg-amber-50 text-amber-600' },
          { icon: GitBranch, label: 'Handoff', value: 'Ativo (5 regras)', color: 'bg-red-50 text-red-600' },
          { icon: Sparkles, label: 'Anti-repetição', value: 'Question Dedup Engine', color: 'bg-slate-100 text-slate-600' },
          { icon: Shield, label: 'Guardrails', value: 'Ativos (Data Truth Policy)', color: 'bg-emerald-50 text-emerald-600' },
          { icon: Settings, label: 'Workflows', value: '1 criado', color: 'bg-blue-50 text-blue-600' }
        ].map((item, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className={`h-9 w-9 rounded-lg ${item.color} flex items-center justify-center mb-2`}>
              <item.icon size={18} />
            </div>
            <div className="text-xs font-bold text-slate-950">{item.label}</div>
            <div className="text-[11px] text-slate-500">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition">
          <span className="font-bold text-sm text-slate-950">Configuração avançada</span>
          {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {showAdvanced && (
          <div className="p-4 space-y-3 bg-white">
            {['Prompt estruturado', 'Ferramentas', 'Permissões', 'Conhecimento', 'Regras', 'Memória', 'Handoff', 'Modelo', 'Temperatura', 'Limites'].map(t => (
              <div key={t} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <span className="text-sm font-bold text-slate-700">{t}</span>
                {t === 'Modelo' ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={draft.selectedAIModel}
                      onChange={(e) => setDraft(d => ({ ...d, selectedAIModel: e.target.value as AIModel }))}
                      className="px-3 py-1 rounded-lg border border-slate-300 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                    >
                      {providerOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.models.map(m => <option key={m} value={m}>{m}</option>)}
                        </option>
                      ))
                    </select>
                    <span className="text-[10px] text-slate-500">({providerOptions.find(p => p.value === draft.selectedAIProvider)?.label || 'IA'})</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Auto-configurado pela IA</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTests = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TestTube2 className="text-emerald-600" size={22} />
        <div>
          <h3 className="text-lg font-bold text-slate-950">Teste antes de publicar</h3>
          <p className="text-sm text-slate-500">Nenhum agente é publicado sem passar por testes. Execute a suíte completa agora.</p>
        </div>
      </div>

      {!draft.testsRun ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="text-blue-600" size={18} />
              <h4 className="font-bold text-slate-950">Sandbox de conversação</h4>
            </div>
            <p className="text-sm text-slate-500 mb-4">Converse com seus agentes antes de publicar.</p>
            <button onClick={() => navigate(aiPath(`operations/${operationId || 'draft'}/agents/test`))}
              className="w-full h-11 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Abrir sandbox
            </button>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-emerald-600" size={18} />
              <h4 className="font-bold text-slate-950">Testes automáticos + AI Red Team</h4>
            </div>
            <p className="text-sm text-slate-600 mb-4">A IA gera cenários, executa e avalia segurança, repetição e alucinação.</p>
            <button onClick={runTests} disabled={testRunning}
              className="w-full h-11 rounded-lg bg-slate-950 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {testRunning ? <Loader2 size={16} className="animate-spin" /> : <PlayIcon size={16} />}
              {testRunning ? 'Executando testes...' : 'Executar testes automáticos'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <div className="h-24 w-24 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <div className="text-3xl font-bold text-emerald-600">{mockTestScores.overall}</div>
            </div>
            <h4 className="text-xl font-bold text-slate-950 mb-1">Score geral: {mockTestScores.overall}/100</h4>
            <p className="text-sm text-slate-500 mb-5">Agente aprovado para publicação</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {Object.entries(mockTestScores).filter(([k]) => k !== 'overall').map(([k, v]) => (
                <div key={k} className="rounded-lg border border-slate-100 p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-500">{k.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="text-lg font-bold text-slate-950">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="font-bold text-slate-950 text-sm mb-2">Alertas da AI Red Team</h4>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>✓ Sem vulnerabilidades de prompt injection detectadas</li>
              <li>✓ Sem repetição de perguntas em 21 cenários</li>
              <li>⚠ 1 handoff pode ser otimizado (tempo de resposta)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  const renderChannels = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-950 mb-1">Onde sua equipe de IA vai atender?</h3>
        <p className="text-sm text-slate-500 mb-4">Selecione os canais e instâncias conectadas ao seu tenant.</p>
      </div>
      {[
        { id: 'whatsapp', label: 'WhatsApp', instances: ['Comercial', 'Locação', 'Vendas', 'Plantão'] },
        { id: 'instagram', label: 'Instagram', instances: ['@empresa', '@empreendimento01'] },
        { id: 'webchat', label: 'Chat do site', instances: ['Site principal', 'Landing page'] }
      ].map(ch => (
        <div key={ch.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="text-emerald-600" size={18} />
            <h4 className="font-bold text-slate-950">{ch.label}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {ch.instances.map(inst => {
              const active = (draft.selectedChannels[ch.id] || []).includes(inst);
              return (
                <button key={inst} onClick={() => toggleChannel(ch.id, inst)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold border transition ${active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {active && <Check size={14} className="inline mr-1" />}
                  {inst}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="font-bold text-slate-950 text-sm mb-3">Regras de atendimento</h4>
        <div className="space-y-2">
          {[
            { label: 'Novos contatos', checked: true },
            { label: 'Leads sem responsável', checked: true },
            { label: 'Leads de campanha', checked: false },
            { label: 'Fora do horário comercial', checked: true },
            { label: 'Não responder quando humano ativo', checked: true }
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-sm font-bold text-slate-700">{r.label}</span>
              <input type="checkbox" defaultChecked={r.checked} className="h-4 w-4 accent-emerald-600" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="font-bold text-slate-950 text-sm mb-3">Horário de funcionamento</h4>
        <div className="flex flex-wrap gap-2">
          {['24 horas', 'Horário comercial', 'Personalizado', 'Só fora do expediente'].map(h => (
            <button key={h} className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:border-slate-300">
              {h}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPublish = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-950 mb-1">Pronto para publicar</h3>
        <p className="text-sm text-slate-500">Revise e publique sua equipe de IA.</p>
      </div>
      <div className="max-w-lg mx-auto rounded-xl border border-slate-200 bg-white p-6 space-y-3">
        {[
          ['Operação', draft.name || 'Operação Comercial Urbana'],
          ['Segmento', segments.find(s => s.id === draft.segment)?.label || ''],
          ['Objetivo', draft.goals.join(', ') || 'Pré-atendimento e qualificação'],
          ['Canais', Object.entries(draft.selectedChannels).flatMap(([c, i]) => i.map(x => `${c}: ${x}`)).join(', ') || '—'],
          ['Tools', '8'],
          ['Permissões', '14'],
          ['Memória', 'Ativa'],
          ['Handoff', 'Ativo'],
          ['Anti-repetição', 'Ativo'],
          ['Guardrails', 'Ativos'],
          ['Testes', draft.testsRun ? '47/48' : 'Pendente'],
          ['Score', draft.testsRun ? '97/100' : '—']
        ].map(([label, value], i) => (
          <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-bold text-slate-950 text-right">{value}</span>
          </div>
        ))}
      </div>
      <button onClick={publish} disabled={loading}
        className="h-12 px-8 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center gap-2 mx-auto shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
        {loading ? 'Publicando...' : 'Publicar operação'}
      </button>
    </div>
  );

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'business': return renderBusiness();
      case 'operation': return renderOperation();
      case 'objectives': return renderObjectives();
      case 'architecture': return renderArchitecture();
      case 'config': return renderConfig();
      case 'tests': return renderTests();
      case 'channels': return renderChannels();
      case 'publish': return renderPublish();
      default: return null;
    }
  };

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={aiPath('')} className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">Criar operação com IA</div>
              <div className="text-[11px] text-slate-500">WooTech AI Workforce Builder</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button onClick={() => setCurrentStep(i)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold ${i < currentStep ? 'text-emerald-600' : i === currentStep ? 'bg-slate-100 text-slate-950' : 'text-slate-400'}`}>
                  {i < currentStep ? <Check size={12} /> : <s.icon size={12} />}
                  <span className="hidden xl:inline">{s.label}</span>
                </button>
                {i < steps.length - 1 && <div className="w-3 h-px bg-slate-200" />}
              </div>
            ))}
          </div>
        </div>
        <div className="h-1 w-full bg-slate-100">
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
        </div>
      </header>

      <div className="p-4 lg:p-7">
        <div className="mx-auto max-w-4xl">
          <section className="rounded-xl border border-slate-200 bg-white p-5 lg:p-7 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  {(() => {
                const Icon = currentStepInfo.icon;
                return <Icon className="text-emerald-600" size={20} />;
              })()}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Etapa {currentStep + 1} de {steps.length}
                  </div>
                  <div className="text-lg font-bold text-slate-950">{currentStepInfo.label}</div>
                </div>
              </div>
              <div className="hidden md:block text-[11px] font-bold text-slate-400">{Math.round(((currentStep + 1) / steps.length) * 100)}%</div>
            </div>

            {renderStep()}

            <div className="mt-8 flex items-center justify-between pt-5 border-t border-slate-100">
              <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}
                className="h-11 px-5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2">
                <ArrowLeft size={16} /> Voltar
              </button>
              {currentStep < steps.length - 1 ? (
                <button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} disabled={!canGoNext}
                  className="h-11 px-6 rounded-lg bg-slate-950 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-40 flex items-center gap-2">
                  Continuar <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={publish} disabled={loading}
                  className="h-11 px-6 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                  Publicar
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
    {children}
  </div>
);

export default CreateOperationWizard;