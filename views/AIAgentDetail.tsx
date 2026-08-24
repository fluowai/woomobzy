import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Bot, Brain, RefreshCw, Pause, Play,
  MessageSquare, Star, CheckCircle2, AlertTriangle, Loader2, ChevronDown,
  TestTube2, FileText, Database, Shield, Zap, GitBranch, Save, Link2,
  SlidersHorizontal, Radio
} from 'lucide-react';
import { toast } from 'sonner';
import { useAIPath } from '@/src/hooks/usePanelBase';
import {
  createChannelRule,
  getAgent,
  getChannelInstances,
  listChannelRules,
  updateAgent,
  updateAgentPrompt,
  type ChannelInstances
} from '../services/aiWorkforce';

const defaultProfessionalPrompt = `IDENTIDADE
Você é um agente de atendimento imobiliário profissional da empresa. Sua função é atender leads com clareza, empatia e objetividade.

OBJETIVO
Qualificar o lead, entender sua intenção, registrar informações importantes e conduzir para o próximo passo correto: busca de imóvel, agendamento, follow-up ou atendimento humano.

REGRAS DE CONVERSA
1. Responda em português brasileiro, com tom profissional, natural e consultivo.
2. Faça uma pergunta por vez.
3. Não repita perguntas já respondidas.
4. Nunca invente preços, disponibilidade, endereços, documentos ou condições comerciais.
5. Quando precisar de dados operacionais, use as ferramentas disponíveis antes de responder.
6. Se o cliente pedir humano, negociação sensível, reclamação, jurídico ou exceção comercial, faça handoff.
7. Mantenha respostas curtas o suficiente para WhatsApp, sem parecer robótico.

QUALIFICAÇÃO
Colete nome, objetivo, tipo de imóvel, cidade/bairro, orçamento, prazo, forma de pagamento e preferência de visita quando fizer sentido.

ENCERRAMENTO
Sempre deixe um próximo passo claro.`;

function extractPrompt(agent: Record<string, any>): string {
  const activeVersion = agent.versions?.[0];
  const prompt = activeVersion?.prompt;

  if (typeof prompt?.full === 'string' && prompt.full.trim()) {
    return prompt.full;
  }

  if (Array.isArray(prompt?.blocks)) {
    return prompt.blocks
      .map((block: Record<string, unknown>) => [block.blockType, block.content].filter(Boolean).join('\n'))
      .filter(Boolean)
      .join('\n\n');
  }

  if (typeof (agent as any).instructions === 'string' && (agent as any).instructions.trim()) {
    return (agent as any).instructions;
  }

  return defaultProfessionalPrompt;
}

const agentInfo = {
  id: 'sdr-vendas',
  name: 'SDR Vendas',
  type: 'SPECIALIST',
  description: 'Qualifica potenciais compradores de imóveis urbanos, coleta preferências e apresenta imóveis da carteira.',
  model: 'gemini-1.5-pro',
  temperature: 0.4,
  status: 'ATIVO',
  version: 'v3',
  publishedAt: 'há 2 semanas',
  score: 97,
  conversations: 483,
  resolution: '94%',
  handoffs: 22,
  metrics: {
    conversation: 98,
    tools: 100,
    memory: 95,
    antiRepetition: 100,
    security: 96,
    handoff: 92,
    data: 100
  },
  tools: ['crm.leads.read', 'crm.leads.update', 'properties.search', 'calendar.availability', 'calendar.create'],
  permissions: ['Ler leads', 'Atualizar leads', 'Buscar imóveis', 'Consultar agenda', 'Criar visitas'],
  memoryLayers: ['Fatos do lead', 'Preferências', 'Histórico de conversas', 'Estado da operação'],
  versions: [
    { version: 'v3', status: 'PUBLICADO', date: 'há 2 semanas', note: 'Prompt aprimorado com exemplos de qualificação', score: 97 },
    { version: 'v2', status: 'SUPERADO', date: 'há 1 mês', note: 'Adicionada integração com calendário', score: 94 },
    { version: 'v1', status: 'SUPERADO', date: 'há 2 meses', note: 'Versão inicial', score: 91 }
  ]
};

const AIAgentDetail: React.FC = () => {
  const { id, agentId } = useParams();
  const [searchParams] = useSearchParams();
  const aiPath = useAIPath();
  const initialTab = searchParams.get('tab') === 'channels' ? 'channels' : 'overview';
  const [tab, setTab] = useState<'overview' | 'prompt' | 'channels' | 'tools' | 'memory' | 'tests' | 'versions'>(initialTab);
  const [status, setStatus] = useState('ATIVO');
  const [busy, setBusy] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);
  const [agent, setAgent] = useState<any>(agentInfo);
  const [draftPrompt, setDraftPrompt] = useState(defaultProfessionalPrompt);
  const [savedPrompt, setSavedPrompt] = useState(defaultProfessionalPrompt);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [channelInstances, setChannelInstances] = useState<ChannelInstances | null>(null);
  const [channelRules, setChannelRules] = useState<Array<Record<string, any>>>([]);
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'instagram' | 'webchat'>('whatsapp');
  const [selectedInstanceId, setSelectedInstanceId] = useState('');
  const [connectingChannel, setConnectingChannel] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    getAgent(agentId)
      .then((a: any) => {
        const nextAgent = {
          ...agentInfo,
          ...a,
          model: a.versions?.[0]?.model || agentInfo.model,
          temperature: a.versions?.[0]?.model_config?.temperature ?? agentInfo.temperature,
          version: a.versions?.[0]?.version || agentInfo.version,
          status: a.status === 'PUBLISHED' ? 'ATIVO' : a.status
        };

        setAgent(prev => ({
          ...prev,
          ...nextAgent
        }));
        const prompt = extractPrompt(nextAgent);
        setDraftPrompt(prompt);
        setSavedPrompt(prompt);
        setStatus(a.status === 'PUBLISHED' ? 'ATIVO' : (a.status === 'PAUSED' ? 'PAUSADO' : 'ATIVO'));
      })
      .catch(() => {});
  }, [agentId]);

  useEffect(() => {
    Promise.all([getChannelInstances(), listChannelRules()])
      .then(([instances, rulesResult]) => {
        setChannelInstances(instances);
        setChannelRules(rulesResult.rules || []);
      })
      .catch(() => {});
  }, []);

  const toggleStatus = async () => {
    setBusy(true);
    try {
      const nextStatus = status === 'ATIVO' ? 'PAUSED' : 'PUBLISHED';
      if (agentId) {
        await updateAgent(agentId, { status: nextStatus } as any);
      }
      setStatus(nextStatus === 'PUBLISHED' ? 'ATIVO' : 'PAUSADO');
      toast.success(nextStatus === 'PUBLISHED' ? 'Agente ativado' : 'Agente pausado');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao alterar status do agente');
    } finally {
      setBusy(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!agentId) return;
    const cleanPrompt = draftPrompt.trim();

    if (cleanPrompt.length < 120) {
      toast.error('O prompt precisa ter instruções suficientes para uma conversa profissional.');
      return;
    }

    setSavingPrompt(true);
    try {
      await updateAgentPrompt(agentId, cleanPrompt);
      setSavedPrompt(cleanPrompt);
      toast.success('Prompt do agente salvo');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!agentId) return;
    setSavingProfile(true);
    try {
      const updated = await updateAgent(agentId, {
        name: agent.name,
        role: agent.role,
        description: agent.description,
        response_style: (agent as any).response_style || 'consultivo'
      } as any);
      setAgent(prev => ({ ...prev, ...updated }));
      toast.success('Configuração do agente salva');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar configuração');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleConnectChannel = async () => {
    if (!agentId) return;
    setConnectingChannel(true);
    try {
      const rule = await createChannelRule({
        agent_id: agentId,
        channel_type: selectedChannel,
        instance_id: selectedInstanceId || null,
        priority: 10,
        activation_rules: {
          newContactOnly: false,
          leadStatuses: ['Novo', 'Em Atendimento']
        },
        blocking_rules: {
          humanActive: true,
          conversationLocked: true
        },
        schedule: {
          mode: 'always_on',
          timezone: 'America/Sao_Paulo'
        }
      });
      setChannelRules(prev => [rule, ...prev]);
      toast.success('Canal conectado ao agente');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao conectar canal');
    } finally {
      setConnectingChannel(false);
    }
  };

  const activeChannelRules = channelRules.filter(rule => rule.agent_id === agentId && rule.is_active !== false);
  const availableInstances = channelInstances?.[selectedChannel] || [];
  const hasPromptChanges = draftPrompt !== savedPrompt;

  const tabs = [
    ['overview', 'Visão geral', Star],
    ['prompt', 'Prompt', FileText],
    ['channels', 'Canais', Radio],
    ['tools', 'Ferramentas', Database],
    ['memory', 'Memória', Brain],
    ['tests', 'Testes', TestTube2],
    ['versions', 'Versões', GitBranch]
  ] as const;

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={aiPath(`operations/${id}`)} className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <Bot size={18} />
              </div>
              <div>
                <div className="text-sm font-bold">{agent.name}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">{agent.type}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${status === 'ATIVO' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{status === 'ATIVO' ? 'ATIVO' : 'PAUSADO'}</span>
                  <span className="font-mono text-[10px]">{agent.version}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleStatus} disabled={busy}
              className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : status === 'ATIVO' ? <Pause size={14} /> : <Play size={14} />}
              {status === 'ATIVO' ? 'Pausar' : 'Ativar'}
            </button>
            <Link to={aiPath(`operations/${id}/agents/test`)} className="h-9 px-4 rounded-lg bg-slate-950 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800">
              <MessageSquare size={14} /> Testar no sandbox
            </Link>
          </div>
        </div>
        <div className="px-4 lg:px-7 flex items-center gap-1 overflow-x-auto">
          {tabs.map(([t, label, icon]) => {
            const Icon = icon;
            return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
              <Icon size={14} /> {label}
            </button>
            );
          })}
        </div>
      </header>

      <div className="p-4 lg:p-7 space-y-5">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Conversas', value: agent.conversations, icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Taxa de resolução', value: agent.resolution, icon: CheckCircle2, color: 'bg-blue-50 text-blue-600' },
                { label: 'Handoffs', value: agent.handoffs, icon: GitBranch, color: 'bg-purple-50 text-purple-600' },
                { label: 'Score de publicação', value: `${agent.score}/100`, icon: Star, color: 'bg-amber-50 text-amber-600' }
              ].map((m, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className={`h-9 w-9 rounded-lg ${m.color} flex items-center justify-center mb-3`}>
                    <m.icon size={18} />
                  </div>
                  <div className="text-2xl font-bold text-slate-950">{m.value}</div>
                  <div className="text-[11px] text-slate-500">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-950 text-sm">Configuração profissional</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Nome, função e descrição usados na operação e no handoff.</p>
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Salvar
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <label className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Nome do agente</span>
                    <input
                      value={agent.name}
                      onChange={(event) => setAgent(prev => ({ ...prev, name: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Função</span>
                    <input
                      value={agent.role}
                      onChange={(event) => setAgent(prev => ({ ...prev, role: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="md:col-span-2 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Descrição operacional</span>
                    <textarea
                      value={agent.description}
                      onChange={(event) => setAgent(prev => ({ ...prev, description: event.target.value }))}
                      rows={3}
                      className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium leading-relaxed outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Modelo', agent.model],
                    ['Temperatura', String(agent.temperature)],
                    ['Versão publicada', agent.version],
                    ['Publicado em', agent.publishedAt],
                    ['Tipo', agent.type],
                    ['Memória', '4 camadas ativas']
                  ].map(([k, v], i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-xs text-slate-500">{k}</span>
                      <span className="text-xs font-bold text-slate-700 font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-950 text-sm mb-4">Score do agente</h3>
                <div className="text-center mb-4">
                  <div className="h-24 w-24 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                    <div className="text-3xl font-bold text-emerald-600">97</div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 mt-2">Aprovado para publicação</div>
                </div>
                <div className="space-y-2">
                  {Object.entries(agent.metrics).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-[11px] font-bold mb-1">
                        <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="text-slate-700">{String(v)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'prompt' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-950 text-sm">Prompt profissional do agente</h3>
                <p className="text-xs text-slate-500 mt-0.5">Edite como no n8n: identidade, regras, ferramentas, handoff e tom da conversa.</p>
              </div>
              <div className="flex items-center gap-2">
                {hasPromptChanges && (
                  <span className="hidden sm:inline-flex text-[11px] font-bold px-2 py-1 rounded bg-amber-50 text-amber-700">
                    Alterações não salvas
                  </span>
                )}
                <button onClick={() => setPromptOpen(!promptOpen)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">
                  <ChevronDown size={14} className={promptOpen ? '' : '-rotate-90'} /> {promptOpen ? 'Recolher' : 'Expandir'}
                </button>
              </div>
            </div>
            {promptOpen && (
              <div className="p-5">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
                  <div className="space-y-3">
                    <textarea
                      value={draftPrompt}
                      onChange={(event) => setDraftPrompt(event.target.value)}
                      spellCheck
                      className="min-h-[520px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500">
                        {draftPrompt.trim().length.toLocaleString('pt-BR')} caracteres · versão ativa {agent.version}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setDraftPrompt(defaultProfessionalPrompt)}
                          className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <RefreshCw size={14} /> Usar base profissional
                        </button>
                        <button
                          onClick={handleSavePrompt}
                          disabled={savingPrompt || !hasPromptChanges}
                          className="h-9 px-4 rounded-lg bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                        >
                          {savingPrompt ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          Salvar prompt
                        </button>
                      </div>
                    </div>
                  </div>
                  <aside className="rounded-xl border border-slate-200 bg-white p-4 h-fit">
                    <div className="flex items-center gap-2 mb-3">
                      <SlidersHorizontal size={16} className="text-emerald-600" />
                      <h4 className="text-sm font-bold text-slate-950">Checklist de conversa</h4>
                    </div>
                    <div className="space-y-2">
                      {[
                        ['Tom profissional', /profissional|consultivo|empático|empatico/i.test(draftPrompt)],
                        ['Não inventar dados', /n(ã|a)o invente|nunca invente|ferramentas/i.test(draftPrompt)],
                        ['Anti-repetição', /n(ã|a)o repita|anti-repet/i.test(draftPrompt)],
                        ['Handoff humano', /handoff|humano|corretor/i.test(draftPrompt)],
                        ['WhatsApp fluido', /whatsapp|respostas curtas|natural/i.test(draftPrompt)]
                      ].map(([label, ok]) => (
                        <div key={String(label)} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                          <span className="text-xs font-bold text-slate-700">{label}</span>
                          {ok ? <CheckCircle2 size={15} className="text-emerald-600" /> : <AlertTriangle size={15} className="text-amber-500" />}
                        </div>
                      ))}
                    </div>
                    <Link
                      to={aiPath(`operations/${id}/agents/${agentId}/test`)}
                      className="mt-4 h-9 w-full rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={14} /> Testar conversa
                    </Link>
                  </aside>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'channels' && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-950 text-sm">Canais conectados</h3>
                <p className="text-xs text-slate-500 mt-0.5">O agente só assume conversas nos canais com regra ativa.</p>
              </div>
              <div className="divide-y divide-slate-50">
                {activeChannelRules.length > 0 ? activeChannelRules.map((rule) => (
                  <div key={String(rule.id)} className="p-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Radio size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-950 capitalize">{String(rule.channel_type)}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">ATIVO</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Bloqueia resposta automática quando houver humano ativo e preserva o contexto da conversa.</p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{String(rule.instance_id || 'todas')}</span>
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <div className="h-12 w-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Link2 size={22} />
                    </div>
                    <h4 className="font-bold text-slate-950">Nenhum canal conectado</h4>
                    <p className="text-sm text-slate-500 mt-1">Conecte WhatsApp, Instagram ou chat do site para o agente assumir conversas.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950 text-sm mb-4">Conectar canal</h3>
              <div className="space-y-4">
                <label className="space-y-1 block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Canal</span>
                  <select
                    value={selectedChannel}
                    onChange={(event) => {
                      setSelectedChannel(event.target.value as 'whatsapp' | 'instagram' | 'webchat');
                      setSelectedInstanceId('');
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="webchat">Chat do site</option>
                  </select>
                </label>
                <label className="space-y-1 block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Instância</span>
                  <select
                    value={selectedInstanceId}
                    onChange={(event) => setSelectedInstanceId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Todas as instâncias disponíveis</option>
                    {availableInstances.map((instance: any) => (
                      <option key={instance.id} value={instance.id}>
                        {instance.name || instance.username || instance.slug || instance.id}
                        {instance.status ? ` · ${instance.status}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
                  A IA responde apenas quando a regra permitir. Se um humano estiver atendendo, a automação fica bloqueada.
                </div>
                <button
                  onClick={handleConnectChannel}
                  disabled={connectingChannel}
                  className="h-10 w-full rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {connectingChannel ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                  Conectar agente
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'tools' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950 text-sm mb-4">Ferramentas habilitadas ({agent.tools.length})</h3>
              <div className="space-y-2">
                {agent.tools.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-emerald-600" />
                      <span className="text-sm font-mono font-bold text-slate-700">{t}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">PERMITIDO</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950 text-sm mb-4">Permissões (menor privilégio)</h3>
              <div className="space-y-2">
                {agent.permissions.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-slate-50">
                    <Shield size={14} className="text-blue-600" />
                    <span className="text-sm font-bold text-slate-700">{p}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg border border-blue-100 bg-blue-50 text-[11px] text-blue-700 flex items-start gap-2">
                <Shield size={14} className="shrink-0 mt-0.5" />
                Acesso controlado pelo Policy Engine. O agente nunca acessa dados fora do seu escopo.
              </div>
            </div>
          </div>
        )}

        {tab === 'memory' && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-950 text-sm mb-4">Camadas de memória</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {agent.memoryLayers.map((m, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-4">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
                    <Brain className="text-emerald-600" size={16} />
                  </div>
                  <div className="text-sm font-bold text-slate-950">{m}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Camada {i + 1}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-slate-50 text-[11px] text-slate-500 flex items-center gap-2">
              <Zap size={14} className="text-emerald-600 shrink-0" />
              A memória do lead é compartilhada entre os agentes da operação para manter contexto consistente.
            </div>
          </div>
        )}

        {tab === 'tests' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-950 text-sm">Última execução</h3>
                <span className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700">APROVADO</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-lg border border-slate-100 p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">47</div>
                  <div className="text-[11px] text-slate-500">Aprovados</div>
                </div>
                <div className="rounded-lg border border-slate-100 p-4 text-center">
                  <div className="text-2xl font-bold text-amber-500">1</div>
                  <div className="text-[11px] text-slate-500">Alertas</div>
                </div>
                <div className="rounded-lg border border-slate-100 p-4 text-center">
                  <div className="text-2xl font-bold text-slate-950">21</div>
                  <div className="text-[11px] text-slate-500">Cenários</div>
                </div>
              </div>
              <div className="space-y-2">
                {['Segurança · 12/12', 'Conversação · 14/14', 'Ferramentas · 8/8', 'Memória · 6/6', 'Anti-repetição · 7/8'].map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm font-bold text-slate-700">{t}</span>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950 text-sm mb-4">AI Red Team</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-100 bg-emerald-50">
                  <CheckCircle2 className="text-emerald-600" size={18} />
                  <div className="text-xs font-bold text-slate-700">Sem prompt injection</div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-100 bg-emerald-50">
                  <CheckCircle2 className="text-emerald-600" size={18} />
                  <div className="text-xs font-bold text-slate-700">Sem alucinação de dados</div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-100 bg-amber-50">
                  <AlertTriangle className="text-amber-500" size={18} />
                  <div className="text-xs font-bold text-slate-700">1 repetição em 21 cenários</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'versions' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-950 text-sm">Versões do agente</h3>
                <p className="text-xs text-slate-500 mt-0.5">Versões são imutáveis · rollback com um clique</p>
              </div>
              <button className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50">+ Criar nova versão</button>
            </div>
            <div className="divide-y divide-slate-50">
              {agent.versions.map((v, i) => (
                <div key={i} className="p-5 flex items-center gap-4 hover:bg-slate-50/60">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${v.status === 'PUBLICADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <GitBranch size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-950 text-sm font-mono">{v.version}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${v.status === 'PUBLICADO' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{v.status}</span>
                      <span className="text-[11px] font-bold text-slate-500">Score {v.score}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{v.note}</p>
                  </div>
                  <div className="text-[11px] text-slate-400 shrink-0">{v.date}</div>
                  <button className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 shrink-0">Restaurar</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAgentDetail;
