import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bot, Brain, Sparkles, Settings, RefreshCw, Pause, Play,
  MessageSquare, Star, CheckCircle2, AlertTriangle, Loader2, ChevronDown,
  TestTube2, FileText, Database, Shield, Zap, GitBranch
} from 'lucide-react';
import { toast } from 'sonner';
import { useAIPath } from '@/src/hooks/usePanelBase';
import { getAgent } from '../services/aiWorkforce';

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
  const aiPath = useAIPath();
  const [tab, setTab] = useState<'overview' | 'prompt' | 'tools' | 'memory' | 'tests' | 'versions'>('overview');
  const [status, setStatus] = useState('ATIVO');
  const [busy, setBusy] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);
  const [agent, setAgent] = useState(agentInfo);

  useEffect(() => {
    if (!agentId) return;
    getAgent(agentId)
      .then((a: any) => {
        setAgent(prev => ({
          ...prev,
          id: a.id || prev.id,
          name: a.name || prev.name,
          type: a.type || prev.type,
          description: a.description || prev.description,
          model: a.versions?.[0]?.model || prev.model,
          version: a.versions?.[0]?.version || prev.version,
          status: a.status === 'PUBLISHED' ? 'ATIVO' : a.status
        }));
        setStatus(a.status === 'PUBLISHED' ? 'ATIVO' : (a.status === 'PAUSED' ? 'PAUSADO' : 'ATIVO'));
      })
      .catch(() => {});
  }, [agentId]);

  const toggleStatus = async () => {
    setBusy(true);
    await new Promise(r => setTimeout(r, 800));
    setStatus(status === 'ATIVO' ? 'PAUSADO' : 'ATIVO');
    setBusy(false);
    toast.success(status === 'ATIVO' ? 'Agente pausado' : 'Agente ativado');
  };

  const tabs = [
    ['overview', 'Visão geral', Star],
    ['prompt', 'Prompt', FileText],
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
                <h3 className="font-bold text-slate-950 text-sm mb-1">Sobre o agente</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{agent.description}</p>
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
                        <span className="text-slate-700">{v}</span>
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
                <h3 className="font-bold text-slate-950 text-sm">Prompt do agente</h3>
                <p className="text-xs text-slate-500 mt-0.5">Gerado pela WooTech IA · editável no modo avançado</p>
              </div>
              <button onClick={() => setPromptOpen(!promptOpen)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">
                <ChevronDown size={14} className={promptOpen ? '' : '-rotate-90'} /> {promptOpen ? 'Recolher' : 'Expandir'}
              </button>
            </div>
            {promptOpen && (
              <div className="p-5">
                <pre className="text-xs font-mono leading-relaxed text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-100">
{`Você é o "SDR de Vendas" da imobiliária. Seu papel é qualificar potenciais compradores.

REGRAS OBRIGATÓRIAS:
1. NUNCA invente preços, disponibilidade ou dados. Use SEMPRE as tools.
2. Nunca repita perguntas já respondidas (consulte o estado da conversa).
3. Se não souber, diga que vai verificar e use a tool apropriada.
4. Registre preferências nos slots quando coletar informações.
5. Se o lead pedir para falar com humano, faça handoff imediatamente.

FLUXO DE QUALIFICAÇÃO:
1. Cumprimente e identifique a intenção
2. Colete: bairro, orçamento, tipo de imóvel
3. Valide capacidade de compra
4. Pesquise imóveis com properties.search
5. Apresente no máximo 3 opções relevantes
6. Proponha agendamento de visita

TOM: amigável, profissional, direto. Responda em português brasileiro.`}
                </pre>
                <button className="mt-4 h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <Sparkles size={14} /> Regenerar com IA
                </button>
              </div>
            )}
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