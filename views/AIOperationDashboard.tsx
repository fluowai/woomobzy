import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bot, Brain, MessageSquare, Users, Target, CalendarDays,
  Phone, Star, RefreshCw, Settings, Play, Pause, Zap, Clock, CheckCircle2,
  AlertTriangle, BarChart3, Loader2, Radio, GitBranch, Sparkles, ListChecks,
  ThumbsUp, TrendingUp, Wallet, Home, FileText, Search, Share2, Shield,
  ArrowUp, ArrowDown, MessageCircle, UserPlus, Timer, Hand, Search as SearchIcon,
  GitFork, TestTube2, Database, Rocket
} from 'lucide-react';
import { toast } from 'sonner';

const operation = {
  id: 'op-001',
  name: 'Operação Comercial Urbana',
  segment: 'URBAN_REAL_ESTATE',
  description: 'Pré-atendimento, qualificação e agendamento para venda e locação.',
  status: 'PUBLISHED',
  aiStatus: 'ACTIVE',
  agents: [
    { id: 'orchestrator', name: 'Orquestrador', type: 'ORCHESTRATOR', status: 'ACTIVE', conversations: 1042, resolution: '96%', score: 96, model: 'gemini-1.5-pro', color: 'bg-slate-950' },
    { id: 'sdr-vendas', name: 'SDR Vendas', type: 'SPECIALIST', status: 'ACTIVE', conversations: 483, resolution: '94%', score: 97, model: 'gemini-1.5-pro', color: 'bg-emerald-600' },
    { id: 'sdr-locacao', name: 'SDR Locação', type: 'SPECIALIST', status: 'ACTIVE', conversations: 421, resolution: '95%', score: 97, model: 'gemini-1.5-pro', color: 'bg-blue-600' },
    { id: 'especialista', name: 'Especialista de Imóveis', type: 'WORKER', status: 'ACTIVE', conversations: 396, resolution: '92%', score: 95, model: 'gemini-1.5-flash', color: 'bg-amber-500' },
    { id: 'agenda', name: 'Agenda e Handoff', type: 'WORKER', status: 'ACTIVE', conversations: 214, resolution: '98%', score: 94, model: 'gemini-1.5-flash', color: 'bg-purple-600' }
  ],
  channels: [
    { id: 'whatsapp', name: 'WhatsApp', instances: ['Comercial', 'Locação'] },
    { id: 'instagram', name: 'Instagram', instances: ['@empresa'] },
    { id: 'webchat', name: 'Chat do site', instances: ['Site principal'] }
  ],
  metrics: {
    conversations: 2851,
    leads: 118,
    visits: 47,
    contacts: 239,
    handoffs: 154,
    resolutionRate: '93%',
    avgResponseTime: '8s',
    noAnswer: '3.1%',
    followUps: 198,
    newAgents: 5,
    score: 97,
    messages: 9802
  },
  weekly: [
    { day: 'Seg', conversations: 42, leads: 9, visits: 2 },
    { day: 'Ter', conversations: 38, leads: 11, visits: 4 },
    { day: 'Qua', conversations: 51, leads: 14, visits: 6 },
    { day: 'Qui', conversations: 47, leads: 12, visits: 5 },
    { day: 'Sex', conversations: 61, leads: 18, visits: 9 },
    { day: 'Sáb', conversations: 58, leads: 16, visits: 8 },
    { day: 'Dom', conversations: 35, leads: 8, visits: 3 }
  ],
  insights: [
    { type: 'optimization', icon: Sparkles, title: 'Melhorar qualidade da qualificação para locação', description: 'Aumente a coleta de renda e documentação na qualificação de locação para reduzir 12% dos descartes.', score: 82, category: 'Qualificação' },
    { type: 'optimization', icon: Sparkles, title: 'Aumentar captação de visitas', description: 'Ativar fluxo de visita no 1º contato aumenta a conversão em 18%.', score: 91, category: 'Vendas' },
    { type: 'info', icon: TrendingUp, title: 'Tendência detectada: interesse por imóveis acima de R$ 800 mil', description: 'Muitos leads qualificados perguntando por imóveis acima de R$ 800 mil. Considere atualizar o catálogo.', score: 77, category: 'Mercado' },
    { type: 'alert', icon: AlertTriangle, title: 'Atualize a documentação do imóvel 1024', description: 'O documento está em revisão. A equipe de IA pode informar como "Em análise" enquanto isso.', score: 45, category: 'Imóveis' }
  ],
  recentHandoffs: [
    { lead: 'Maria Souza', agent: 'SDR Vendas', reason: 'Solicitou falar com humano', time: 'há 12 min', channel: 'WhatsApp', color: 'bg-emerald-50 text-emerald-700' },
    { lead: 'João Pereira', agent: 'Orquestrador', reason: 'Pedido de desconto especial', time: 'há 34 min', channel: 'Webchat', color: 'bg-blue-50 text-blue-700' },
    { lead: 'Ana Lima', agent: 'Agenda e Handoff', reason: 'Duas visitas seguidas em imóveis diferentes', time: 'há 1h', channel: 'WhatsApp', color: 'bg-amber-50 text-amber-700' },
    { lead: 'Carlos Souza', agent: 'SDR Locação', reason: 'Dúvida sobre contrato de locação', time: 'há 2h', channel: 'Instagram', color: 'bg-purple-50 text-purple-700' }
  ],
  noAnswers: [
    { lead: 'Fernanda Rocha', agent: 'SDR Vendas', phone: '(11) 98765-4321', time: 'há 2h', status: 'Sinal desconhecido', attempts: 1 },
    { lead: 'Ricardo Alves', agent: 'SDR Locação', phone: '(11) 91234-5678', time: 'há 5h', status: 'Número bloqueado', attempts: 2 },
    { lead: 'Juliana Costa', agent: 'SDR Vendas', phone: '(11) 92345-6789', time: 'ontem', status: 'Não respondeu', attempts: 1 }
  ],
  conversationSample: [
    { agent: 'SDR Vendas', type: 'in', text: 'Olá Maria! Tudo bem? Vi que você busca um apartamento na zona sul de até R$ 600 mil. Posso te ajudar a encontrar opções!' },
    { agent: 'SDR Vendas', type: 'out', text: 'Sim, ótimo! Qual a sua preferência: 2 ou 3 quartos?' }
  ],
  scoreBreakdown: {
    conversation: 98,
    tools: 100,
    memory: 95,
    antiRepetition: 100,
    security: 96,
    handoff: 92,
    data: 100
  },
  weeklyLeads: { thisWeek: 88, lastWeek: 72, change: '+22%' }
};

const AIOperationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'conversations' | 'tests' | 'channels' | 'history' | 'logs'>('overview');
  const [pausing, setPausing] = useState(false);
  const [aiStatus, setAiStatus] = useState('ACTIVE');

  const toggleStatus = async () => {
    setPausing(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      setAiStatus(aiStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
      toast.success(aiStatus === 'ACTIVE' ? 'Operação pausada' : 'Operação ativada');
    } finally {
      setPausing(false);
    }
  };

  const maxLeads = Math.max(...operation.weekly.map(w => w.leads));

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/ai" className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">{operation.name}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">URBAN_REAL_ESTATE</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${aiStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {aiStatus === 'ACTIVE' ? 'AI ATIVA' : 'AI PAUSADA'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleStatus} disabled={pausing}
              className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
              {pausing ? <Loader2 size={14} className="animate-spin" /> : aiStatus === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
              {aiStatus === 'ACTIVE' ? 'Pausar IA' : 'Ativar IA'}
            </button>
            <Link to={`/ai/operations/${id}/architecture`} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50">
              <GitBranch size={14} /> Arquitetura
            </Link>
            <Link to={`/ai/operations/${id}/agents/test`} className="h-9 px-4 rounded-lg bg-slate-950 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800">
              <TestTube2 size={14} /> Sandbox
            </Link>
          </div>
        </div>
        <div className="px-4 lg:px-7 flex items-center gap-1 overflow-x-auto">
          {([
            ['overview', 'Visão geral', BarChart3],
            ['agents', 'Agentes', Bot],
            ['conversations', 'Conversas', MessageSquare],
            ['tests', 'Testes', TestTube2],
            ['channels', 'Canais', Radio],
            ['history', 'Histórico', GitBranch],
            ['logs', 'Logs', FileText]
          ] as const).map(([tab, label, icon]) => {
            const Icon = icon;
            return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${activeTab === tab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
              <Icon size={14} /> {label}
            </button>
            );
          })}
        </div>
      </header>

      <div className="p-4 lg:p-7 space-y-5">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Conversas', value: operation.metrics.conversations, icon: MessageSquare, delta: '+18%', color: 'bg-emerald-50 text-emerald-600', up: true },
                { label: 'Leads', value: operation.metrics.leads, icon: UserPlus, delta: '+22%', color: 'bg-blue-50 text-blue-600', up: true },
                { label: 'Visitas', value: operation.metrics.visits, icon: CalendarDays, delta: '+14%', color: 'bg-amber-50 text-amber-600', up: true },
                { label: 'Handoffs', value: operation.metrics.handoffs, icon: Hand, delta: '-5%', color: 'bg-purple-50 text-purple-600', up: false },
                { label: 'Taxa de resolução', value: operation.metrics.resolutionRate, icon: CheckCircle2, delta: '+2%', color: 'bg-emerald-50 text-emerald-600', up: true },
                { label: 'Tempo resposta', value: operation.metrics.avgResponseTime, icon: Timer, delta: '-12%', color: 'bg-cyan-50 text-cyan-600', up: true },
                { label: 'Leads sem resposta', value: operation.metrics.noAnswer, icon: AlertTriangle, delta: '-18%', color: 'bg-red-50 text-red-600', up: true },
                { label: 'Score de publicação', value: `${operation.metrics.score}/100`, icon: Star, delta: '+3', color: 'bg-violet-50 text-violet-600', up: true }
              ].map((m, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className={`h-9 w-9 rounded-lg ${m.color} flex items-center justify-center mb-3`}>
                    <m.icon size={18} />
                  </div>
                  <div className="text-2xl font-bold text-slate-950">{m.value}</div>
                  <div className="text-[11px] text-slate-500">{m.label}</div>
                  <div className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${m.up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {m.up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{m.delta}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-950 text-sm">Últimos 7 dias</h3>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-600" /> Conversas</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500" /> Leads</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-400" /> Visitas</span>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-1 h-40">
                  {operation.weekly.map((w, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex items-end justify-center gap-1 h-32">
                        <div className="w-2.5 rounded-t bg-emerald-600" style={{ height: `${(w.conversations / 61) * 100}%` }} />
                        <div className="w-2.5 rounded-t bg-blue-500" style={{ height: `${(w.leads / maxLeads) * 100}%` }} />
                        <div className="w-2.5 rounded-t bg-amber-400" style={{ height: `${(w.visits / 9) * 100}%` }} />
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">{w.day}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-950 text-sm">Score da operação</h3>
                  <span className="text-[11px] font-bold text-slate-500">Publicação</span>
                </div>
                <div className="text-center mb-4">
                  <div className="h-28 w-28 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                    <div className="text-3xl font-bold text-emerald-600">97</div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 mt-2">Aprovado · publicado</div>
                </div>
                <div className="space-y-2">
                  {Object.entries(operation.scoreBreakdown).map(([k, v]) => (
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-950 text-sm">Insights da IA</h3>
                  <button className="text-[11px] font-bold text-emerald-700 hover:underline">Ver todos</button>
                </div>
                <div className="space-y-3">
                  {operation.insights.map((ins, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${ins.type === 'alert' ? 'bg-red-50 text-red-500' : ins.type === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        <ins.icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-950 truncate">{ins.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 whitespace-nowrap">{ins.category}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{ins.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-slate-950">{ins.score}</div>
                        <div className="text-[10px] text-slate-400">relevância</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-950 text-sm">Handoffs recentes</h3>
                    <button className="text-[11px] font-bold text-emerald-700 hover:underline">Ver todos</button>
                  </div>
                  <div className="space-y-3">
                    {operation.recentHandoffs.map((h, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {h.lead.split(' ').map(p => p[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-950 truncate">{h.lead}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{h.time}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{h.reason}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.color}`}>{h.agent}</span>
                            <span className="text-[10px] text-slate-400">{h.channel}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-950 text-sm">Leads sem resposta</h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600">3</span>
                  </div>
                  <div className="space-y-3">
                    {operation.noAnswers.map((n, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-950 truncate">{n.lead}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone size={10} /> {n.phone} · {n.attempts}x
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[11px] font-bold text-slate-600">{n.status}</div>
                          <div className="text-[10px] text-slate-400">{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'agents' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-950 text-sm">Equipe de IA ({operation.agents.length} agentes)</h3>
                <p className="text-xs text-slate-500 mt-0.5">Arquitetura gerada pela WooTech IA</p>
              </div>
              <Link to={`/ai/operations/${id}/architecture`} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50">
                <GitBranch size={14} /> Ver arquitetura
              </Link>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Agente</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Conversas</th>
                  <th className="px-5 py-3">Resolução</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Modelo</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {operation.agents.map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg ${a.color} flex items-center justify-center text-white`}>
                          {a.type === 'ORCHESTRATOR' ? <Brain size={15} /> : <Bot size={15} />}
                        </div>
                        <span className="font-bold text-slate-950 text-sm">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600">{a.type}</span></td>
                    <td className="px-5 py-3 text-sm font-bold text-slate-700">{a.conversations}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{a.resolution}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${a.score}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{a.score}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 font-mono">{a.model}</td>
                    <td className="px-5 py-3"><span className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700">ATIVO</span></td>
                    <td className="px-5 py-3">
                      <button className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50">
                        Testar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950 text-sm mb-4">Amostra de conversa</h3>
              <div className="space-y-3">
                {operation.conversationSample.map((m, i) => (
                  <div key={i} className={`flex ${m.type === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${m.type === 'out' ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-700 rounded-bl-sm'}`}>
                      <div className="text-[10px] font-bold opacity-70 mb-1">{m.agent} · {m.type === 'out' ? 'Recebida' : 'Enviada'}</div>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950 text-sm mb-4">Distribuição por agente</h3>
              {operation.agents.map((a, i) => {
                const pct = Math.round((a.conversations / operation.metrics.conversations) * 100);
                return (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">{a.name}</span>
                      <span className="text-slate-700">{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className={`h-full ${a.color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-950 text-sm">Última execução de testes</h3>
                <span className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700">APROVADO</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-lg border border-slate-100 p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">47</div>
                  <div className="text-[11px] text-slate-500">Testes passaram</div>
                </div>
                <div className="rounded-lg border border-slate-100 p-4 text-center">
                  <div className="text-2xl font-bold text-slate-950">1</div>
                  <div className="text-[11px] text-slate-500">Alerta (não bloqueante)</div>
                </div>
                <div className="rounded-lg border border-slate-100 p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">0</div>
                  <div className="text-[11px] text-slate-500">Falhas</div>
                </div>
              </div>
              <div className="space-y-3">
                {['Segurança · 12 testes', 'Conversação · 14 testes', 'Ferramentas · 8 testes', 'Memória · 6 testes', 'Anti-repetição · 7 testes'].map((t, i) => (
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
                <div className="flex items-center gap-3 p-3 rounded-lg border border-red-100 bg-red-50">
                  <Shield className="text-red-500" size={18} />
                  <div className="text-xs font-bold text-slate-700">Sem vulnerabilidades</div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-100 bg-amber-50">
                  <AlertTriangle className="text-amber-500" size={18} />
                  <div className="text-xs font-bold text-slate-700">1 otimização sugerida</div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-100 bg-emerald-50">
                  <CheckCircle2 className="text-emerald-600" size={18} />
                  <div className="text-xs font-bold text-slate-700">21 cenários executados</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {operation.channels.map((ch, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <MessageCircle className="text-emerald-600" size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 text-sm">{ch.name}</h3>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">ATIVO</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {ch.instances.map((inst, j) => (
                    <div key={j} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-sm font-bold text-slate-700">{inst}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1"><CheckCircle2 size={13} className="text-emerald-600" /> Conectado</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950 text-sm mb-4">Regras de atendimento</h3>
              <div className="space-y-2">
                {['Novos contatos: agentes de IA', 'Leads sem responsável: agentes de IA', 'Fora do horário: agentes de IA', 'Humano ativo: não responder', 'Campanha ativa: funil dedicado'].map((r, j) => (
                  <div key={j} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-xs font-bold text-slate-700">{r}</span>
                    <CheckCircle2 size={15} className="text-emerald-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4">
              <h3 className="font-bold text-slate-950 text-sm">Histórico da operação</h3>
            </div>
            <div className="px-5 pb-5 space-y-0">
              {[
                { icon: Rocket, color: 'bg-emerald-50 text-emerald-600', title: 'Operação publicada', desc: 'Publicada em todos os canais selecionados', time: 'há 3 semanas' },
                { icon: RefreshCw, color: 'bg-blue-50 text-blue-600', title: 'Agente "Especialista de Imóveis" atualizado', desc: 'Nova versão v3 com prompt aprimorado', time: 'há 2 semanas' },
                { icon: Zap, color: 'bg-amber-50 text-amber-600', title: 'Otimização aplicada', desc: 'Fluxo de agendamento otimizado pela IA', time: 'há 1 semana' },
                { icon: GitBranch, color: 'bg-purple-50 text-purple-600', title: 'Novo canal conectado', desc: 'Instagram @empresa conectado', time: 'há 5 dias' }
              ].map((h, i) => (
                <div key={i} className="flex gap-3 pb-5 relative">
                  {i < 3 && <div className="absolute left-[18px] top-10 bottom-0 w-px bg-slate-200" />}
                  <div className={`h-9 w-9 rounded-lg ${h.color} flex items-center justify-center shrink-0 relative z-10`}>
                    <h.icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-950">{h.title}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{h.time}</span>
                    </div>
                    <div className="text-xs text-slate-500">{h.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-950 text-sm">Logs da operação</h3>
                <p className="text-xs text-slate-500 mt-0.5">Rastreie cada interação e execução</p>
              </div>
              <div className="flex items-center gap-2">
                <select className="h-9 rounded-lg border border-slate-200 text-xs font-bold px-3">
                  <option>Todos os agentes</option>
                </select>
                <select className="h-9 rounded-lg border border-slate-200 text-xs font-bold px-3">
                  <option>Últimas 24h</option>
                </select>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Agente</th>
                  <th className="px-5 py-3">Evento</th>
                  <th className="px-5 py-3">Ação</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  ['19/08 21:32', 'Orquestrador', 'mensagem_recebida', 'Direction para SDR Vendas', 'SUCCESS'],
                  ['19/08 21:33', 'SDR Vendas', 'tool_executed', 'properties.search', 'SUCCESS'],
                  ['19/08 21:34', 'SDR Vendas', 'mensagem_enviada', 'Recomendação de imóvel', 'SUCCESS'],
                  ['19/08 21:35', 'Especialista', 'tool_executed', 'properties.availability', 'SUCCESS'],
                  ['19/08 21:36', 'Agenda e Handoff', 'agendamento_criado', 'Visita - Ter 10:00', 'SUCCESS']
                ].map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-xs text-slate-500 font-mono">{r[0]}</td>
                    <td className="px-5 py-3 text-sm font-bold text-slate-700">{r[1]}</td>
                    <td className="px-5 py-3"><span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{r[2]}</span></td>
                    <td className="px-5 py-3 text-xs text-slate-500">{r[3]}</td>
                    <td className="px-5 py-3"><span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{r[4]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIOperationDashboard;