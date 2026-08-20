import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bot, Brain, GitBranch, Database, Shield, Zap, Users,
  MessageSquare, Sparkles, Wand2, Settings, Loader2, RefreshCw,
  CheckCircle2, AlertTriangle, Layers, Lock, MemoryStick, Target,
  Radio, TestTube2, Rocket, FileText, Workflow, ChevronRight, Boxes,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

const architecture = {
  name: 'Operação Comercial Urbana',
  description: 'Pré-atendimento, qualificação e agendamento para venda e locação.',
  globalGuardrails: {
    dataTruthPolicy: 'STRICT',
    promptInjectionProtection: true,
    tenantIsolation: true,
    auditLogging: true
  },
  agents: [
    { id: 'orchestrator', name: 'Orquestrador', type: 'ORCHESTRATOR', role: 'Orquestrador de Conversas', description: 'Identifica a intenção do contato e direciona para o agente correto. Gerencia trocas de assunto e coordena a equipe.', model: 'gemini-1.5-pro', color: 'bg-slate-950', tools: ['intent.classify', 'conversation.transfer'] },
    { id: 'sdr-vendas', name: 'SDR Vendas', type: 'SPECIALIST', role: 'SDR de Vendas', description: 'Qualifica potenciais compradores, coleta preferências e apresenta imóveis da carteira.', model: 'gemini-1.5-pro', color: 'bg-emerald-600', tools: ['crm.leads.read', 'crm.leads.update', 'properties.search', 'calendar.availability', 'calendar.create'] },
    { id: 'sdr-locacao', name: 'SDR Locação', type: 'SPECIALIST', role: 'SDR de Locação', description: 'Qualifica interessados em aluguel, coleta renda e documentação e apresenta opções.', model: 'gemini-1.5-pro', color: 'bg-blue-600', tools: ['crm.leads.read', 'properties.search', 'calendar.availability'] },
    { id: 'especialista', name: 'Especialista de Imóveis', type: 'WORKER', role: 'Especialista de Imóveis', description: 'Pesquisa e compara imóveis conforme o perfil do lead. Consulta disponibilidade e dados atualizados.', model: 'gemini-1.5-flash', color: 'bg-amber-500', tools: ['properties.search', 'properties.read', 'properties.availability'] },
    { id: 'agenda', name: 'Agenda e Handoff', type: 'WORKER', role: 'Agenda e Handoff', description: 'Agenda visitas, valida dados e faz handoff para atendentes humanos quando necessário.', model: 'gemini-1.5-flash', color: 'bg-purple-600', tools: ['calendar.availability', 'calendar.create', 'crm.leads.update'] }
  ],
  workflows: [
    { name: 'Novo Lead', trigger: 'NEW_LEAD', steps: ['Criar lead no CRM', 'Orquestrador classifica', 'SDR executa funil', 'Especialista busca imóveis', 'Agenda confirma visita'] },
    { name: 'Follow-up de visita', trigger: 'FOLLOW_UP_VISIT', steps: ['Consultar visitas de hoje', 'Verificar status', 'Enviar lembrete'] },
    { name: 'Handoff para humano', trigger: 'HANDOFF', steps: ['Identificar motivo', 'Notificar equipe', 'Registrar resumo'] }
  ],
  connections: [
    { from: 'orchestrator', to: 'sdr-vendas' },
    { from: 'orchestrator', to: 'sdr-locacao' },
    { from: 'sdr-vendas', to: 'especialista' },
    { from: 'sdr-locacao', to: 'especialista' },
    { from: 'sdr-vendas', to: 'agenda' },
    { from: 'sdr-locacao', to: 'agenda' }
  ]
};

const ArchitectureCanvas: React.FC = () => {
  const { id } = useParams();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'canvas' | 'agents' | 'workflows' | 'guardrails'>('canvas');

  const agentPositions: Record<string, { top: string; left: string }> = {
    orchestrator: { top: '38%', left: '42%' },
    'sdr-vendas': { top: '8%', left: '10%' },
    'sdr-locacao': { top: '8%', left: '70%' },
    especialista: { top: '70%', left: '10%' },
    agenda: { top: '70%', left: '70%' }
  };

  const save = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      setEditing(false);
      toast.success('Arquitetura salva!');
    } finally {
      setSaving(false);
    }
  };

  const findAgent = (name: string) => architecture.agents.find(a => a.name === name);

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/ai/operations/${id}`} className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">Arquitetura da operação</div>
              <div className="text-[11px] text-slate-500">{architecture.name} · gerada pela WooTech IA</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50">
                <Wand2 size={14} /> Editar
              </button>
            ) : (
              <>
                <button onClick={() => setEditing(false)} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg bg-slate-950 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Salvar
                </button>
              </>
            )}
            <button className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50">
              <RefreshCw size={14} /> Regenerar com IA
            </button>
            <Link to={`/ai/operations/${id}/agents/test`} className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-700">
              <TestTube2 size={14} /> Testar
            </Link>
          </div>
        </div>
        <div className="px-4 lg:px-7 flex items-center gap-1">
          {([
            ['canvas', 'Canvas', Boxes],
            ['agents', 'Agentes', Bot],
            ['workflows', 'Workflows', Workflow],
            ['guardrails', 'Guardrails', Shield]
          ] as const).map(([t, label, icon]) => {
            const Icon = icon;
            return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition ${tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
              <Icon size={14} /> {label}
            </button>
            );
          })}
        </div>
      </header>

      <div className="p-4 lg:p-7">
        {tab === 'canvas' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-slate-700">{architecture.agents.length} agentes</span> ·
                <span>{architecture.connections.length} conexões</span> ·
                <span>{architecture.workflows.length} workflows</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700">ARQUITETURA ATIVA</span>
            </div>

            <div className="relative h-[540px] rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white overflow-hidden">
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              {architecture.connections.map((c, i) => {
                const from = agentPositions[c.from];
                const to = agentPositions[c.to];
                const fromAgent = findAgent(c.from);
                const toAgent = findAgent(c.to);
                return (
                  <svg key={i} className="absolute inset-0 w-full h-full" fill="none">
                    <line
                      x1="0" y1="0" x2="0" y2="0"
                      stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round"
                      opacity="0.6"
                    />
                    <line
                      x1={`${from.left}`} y1={`${from.top}`} x2={`${to.left}`} y2={`${to.top}`}
                      stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round"
                      opacity="0.5"
                    />
                    <title>{fromAgent?.name} → {toAgent?.name}</title>
                  </svg>
                );
              })}
              {architecture.agents.map(a => {
                const pos = agentPositions[a.id];
                return (
                  <div key={a.id} style={{ top: pos.top, left: pos.left }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-52 rounded-xl border bg-white shadow-sm p-3 transition ${editing ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className={`h-9 w-9 rounded-lg ${a.color} flex items-center justify-center text-white`}>
                        {a.type === 'ORCHESTRATOR' ? <Brain size={16} /> : <Bot size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-950 truncate">{a.name}</div>
                        <div className="text-[10px] text-slate-400">{a.type}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{a.description}</p>
                    {a.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.tools.slice(0, 3).map((t, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-mono font-bold text-slate-500">{t}</span>
                        ))}
                        {a.tools.length > 3 && <span className="text-[9px] font-bold text-slate-400">+{a.tools.length - 3}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                      <Sparkles size={10} className="text-emerald-500" /> Score {100 - a.id.length}: aprovação</div>
                  </div>
                );
              })}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ativo</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Rascunho</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Sparkles className="text-emerald-600" size={18} />
              </div>
              <div className="flex-1 text-xs text-slate-600">
                <span className="font-bold text-slate-950">Dica da WooTech IA:</span> esta arquitetura foi desenhada para cobrir os 4 objetivos selecionados com 5 agentes. Você pode ajustar, regenerar ou testar a qualquer momento.
              </div>
            </div>
          </div>
        )}

        {tab === 'agents' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-950 text-sm">Agentes da operação</h3>
                <p className="text-xs text-slate-500 mt-0.5">{architecture.agents.length} agentes · prompts, ferramentas e permissões</p>
              </div>
              <button className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50">+ Adicionar agente</button>
            </div>
            <div className="divide-y divide-slate-50">
              {architecture.agents.map(a => (
                <div key={a.id} className="p-5 hover:bg-slate-50/60">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl ${a.color} flex items-center justify-center text-white shrink-0`}>
                      {a.type === 'ORCHESTRATOR' ? <Brain size={18} /> : <Bot size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-950 text-sm">{a.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{a.type}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{a.model}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{a.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {a.tools.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-bold text-slate-600">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Editar</button>
                      <button className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Testar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'workflows' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {architecture.workflows.map((wf, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-950 text-sm">{wf.name}</h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 mt-1 inline-block">{wf.trigger}</span>
                  </div>
                  <Workflow size={18} className="text-emerald-600" />
                </div>
                <div className="space-y-0">
                  {wf.steps.map((s, j) => (
                    <div key={j} className="flex gap-3 relative">
                      {j < wf.steps.length - 1 && <div className="absolute left-[9px] top-6 bottom-0 w-px bg-slate-200" />}
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 relative z-10 ${j === 0 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                        {j === 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      </div>
                      <div className="pb-4 text-xs text-slate-600">{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-slate-300 p-5 flex flex-col items-center justify-center text-center">
              <button className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center mb-2">
                <Sparkles className="text-emerald-600" size={18} />
              </button>
              <div className="text-xs font-bold text-slate-700">Criar workflow</div>
              <p className="text-[11px] text-slate-400 mt-1">Automatize fluxos com a IA</p>
            </div>
          </div>
        )}

        {tab === 'guardrails' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <h3 className="font-bold text-slate-950 text-sm mb-4">Guardrails globais</h3>
              <div className="space-y-3">
                {[
                  { icon: Shield, name: 'Data Truth Policy', value: 'STRICT', desc: 'O LLM nunca inventa dados operacionais. Valores como preço, disponibilidade e prazos só podem vir de tools verificadas.', color: 'bg-red-50 text-red-600' },
                  { icon: Lock, name: 'Proteção contra prompt injection', value: 'ATIVO', desc: 'Entradas do usuário são sanitizadas e nunca interpretadas como instruções de sistema.', color: 'bg-purple-50 text-purple-600' },
                  { icon: Users, name: 'Isolamento de tenant', value: 'ATIVO', desc: 'Dados isolados por organização no banco e na memória. RLS garantido.', color: 'bg-emerald-50 text-emerald-600' },
                  { icon: FileText, name: 'Auditoria completa', value: 'ATIVO', desc: 'Toda ação registrada com timestamp, agente, contexto e resultado.', color: 'bg-blue-50 text-blue-600' },
                  { icon: MemoryStick, name: 'Anti-repetição', value: 'Question Dedup Engine', desc: 'O agente nunca pergunta o mesmo item que já foi respondido ou registrado em slots.', color: 'bg-amber-50 text-amber-600' },
                  { icon: Zap, name: 'Loop detector', value: 'ATIVO', desc: 'Detecta e interrompe loops de conversa automaticamente.', color: 'bg-cyan-50 text-cyan-600' }
                ].map((g, i) => (
                  <div key={i} className="flex gap-3 p-4 rounded-xl border border-slate-100">
                    <div className={`h-10 w-10 rounded-lg ${g.color} flex items-center justify-center shrink-0`}>
                      <g.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-950">{g.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{g.value}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950 text-sm mb-4">Resumo de segurança</h3>
              <div className="space-y-3">
                {[
                  ['Ferramentas com permissão', '14/18'],
                  ['Requisições aprovadas', '31'],
                  ['Falhas bloqueadas', '3'],
                  ['Alertas ativos', '1'],
                  ['Última auditoria', 'há 2h']
                ].map(([k, v], i) => (
                  <div key={i} className="flex justify-between p-3 rounded-lg bg-slate-50 text-xs">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-bold text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchitectureCanvas;