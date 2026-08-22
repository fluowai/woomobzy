import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Send, Bot, Brain, RotateCcw, Filter, Pause, Play, MessageSquare,
  Phone, Users, Search, Settings2, Shield, Database, Zap, Clock, Star,
  CheckCircle2, AlertTriangle, Sparkles, Loader2, Mic, Paperclip, MoreVertical,
  ChevronDown, GitBranch, Bug, Wand2, Target, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { useAIPath } from '@/src/hooks/usePanelBase';
import { getOperation, sendAgentMessage, type AIAgent } from '../services/aiWorkforce';

type Message = {
  id: number;
  role: 'user' | 'agent';
  agent?: string;
  content: string;
  time: string;
  tools?: { name: string; status: 'success' | 'info' | 'error'; detail?: string }[];
  slots?: { label: string; value: string }[];
};

const agents = [
  { id: 'orchestrator', name: 'Orquestrador', type: 'ORCHESTRATOR', color: 'bg-slate-950', model: 'gemini-1.5-pro', status: 'ATIVO' },
  { id: 'sdr-vendas', name: 'SDR Vendas', type: 'SPECIALIST', color: 'bg-emerald-600', model: 'gemini-1.5-pro', status: 'ATIVO' },
  { id: 'sdr-locacao', name: 'SDR Locação', type: 'SPECIALIST', color: 'bg-blue-600', model: 'gemini-1.5-pro', status: 'ATIVO' },
  { id: 'especialista', name: 'Especialista de Imóveis', type: 'WORKER', color: 'bg-amber-500', model: 'gemini-1.5-flash', status: 'ATIVO' },
  { id: 'agenda', name: 'Agenda e Handoff', type: 'WORKER', color: 'bg-purple-600', model: 'gemini-1.5-flash', status: 'ATIVO' }
];

const initialMessages: Message[] = [
  {
    id: 1, role: 'agent', agent: 'SDR Vendas', content: 'Olá! Tudo bem? Sou a assistente virtual da imobiliária e vi que você busca um apartamento na zona sul de até R$ 600 mil. Posso te ajudar a encontrar ótimas opções!',
    time: '14:32', tools: [{ name: 'crm.leads.read', status: 'info', detail: 'Contexto do lead recuperado' }], slots: [{ label: 'Bairro', value: 'Zona Sul' }, { label: 'Orçamento', value: 'R$ 600 mil' }]
  },
  {
    id: 2, role: 'user', content: 'Oi! Sim, quero um apartamento de 2 quartos com vaga de garagem, pode ser?',
    time: '14:33'
  },
  {
    id: 3, role: 'agent', agent: 'Especialista de Imóveis', content: 'Claro! Vou buscar apartamentos de 2 quartos com vaga na zona sul dentro do seu orçamento. Só um momento...',
    time: '14:33', tools: [{ name: 'properties.search', status: 'success', detail: '6 imóveis encontrados' }, { name: 'properties.read', status: 'success', detail: '3 disponíveis' }, { name: 'properties.availability', status: 'success', detail: '1/3 disponível imediato' }], slots: [{ label: 'Quartos', value: '2' }, { label: 'Vaga', value: 'Sim' }]
  },
  {
    id: 4, role: 'agent', agent: 'SDR Vendas', content: 'Encontrei ótimas opções! 🏠 O **Apartamento Jardim Paulista** (R$ 580 mil, 2 quartos, vaga) chama atenção. Posso agendar uma visita para você conhecer?',
    time: '14:34'
  },
  {
    id: 5, role: 'user', content: 'Gostei! Tem disponível para sábado de manhã?',
    time: '14:35'
  },
  {
    id: 6, role: 'agent', agent: 'Agenda e Handoff', content: 'Perfeito! Tenho disponibilidade sábado às 10h e às 11h30. Qual horário prefere?',
    time: '14:35', tools: [{ name: 'calendar.availability', status: 'success', detail: '2 horários livres' }]
  },
  {
    id: 7, role: 'user', content: 'Sábado 10h é ótimo!',
    time: '14:36'
  },
  {
    id: 8, role: 'agent', agent: 'Agenda e Handoff', content: 'Agendado! 🎉 Visita ao **Apartamento Jardim Paulista** confirmada para **sábado às 10h**. Vou te enviar o endereço e o contato do corretor. Até sábado!',
    time: '14:36', tools: [{ name: 'calendar.create', status: 'success', detail: 'Visita criada' }, { name: 'crm.leads.update', status: 'success', detail: 'Lead atualizado para VISITA_AGENDADA' }], slots: [{ label: 'Visita', value: 'Sáb 10h' }, { label: 'Lead status', value: 'VISITA_AGENDADA' }]
  }
];

const SandboxChat: React.FC = () => {
  const { id } = useParams();
  const aiPath = useAIPath();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [operationAgents, setOperationAgents] = useState<AIAgent[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [activeAgent, setActiveAgent] = useState('orchestrator');
  const [traceOpen, setTraceOpen] = useState<number | null>(8);
  const [activeTab, setActiveTab] = useState<'chat' | 'phone' | 'leads' | 'visual'>('chat');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    let mounted = true;

    const loadOperationAgents = async () => {
      if (!id || id === 'draft') {
        setOperationAgents([]);
        setActiveAgent('orchestrator');
        return;
      }

      try {
        const operation = await getOperation(id);
        const loadedAgents = operation.agents || [];
        if (!mounted) return;

        setOperationAgents(loadedAgents);
        if (loadedAgents.length > 0) {
          setActiveAgent(current =>
            loadedAgents.some(agent => agent.id === current)
              ? current
              : loadedAgents[0].id
          );
        } else {
          setOperationAgents([]);
          setActiveAgent('orchestrator');
        }
      } catch (error: any) {
        if (!mounted) return;
        setOperationAgents([]);
        toast.error('Erro ao carregar agentes da operação: ' + error.message);
      }
    };

    loadOperationAgents();

    return () => {
      mounted = false;
    };
  }, [id]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), role: 'user', content: input, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      let reply: Message;
      if (id && id !== 'draft' && operationAgents.length > 0) {
        const result = await sendAgentMessage(id, {
          channel: 'sandbox',
          message: input,
          agentId: activeAgent
        });
        reply = {
          id: Date.now() + 1, role: 'agent', agent: activeAgentObj?.name || 'SDR Vendas',
          content: result.response || 'Processei sua mensagem com sucesso.',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          tools: (result.toolCalls || []).map((t: string) => ({ name: t, status: 'success' as const, detail: undefined })),
          slots: result.usage ? [{ label: 'Latência', value: `${result.latencyMs}ms` }] : []
        };
      } else {
        await new Promise(r => setTimeout(r, 1600));
        reply = {
          id: Date.now() + 1, role: 'agent', agent: 'SDR Vendas',
          content: 'Ótima pergunta! Vou verificar os dados disponíveis para te dar uma resposta precisa. Deixa eu consultar o sistema...',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          tools: [{ name: 'properties.search', status: 'success', detail: '2 imóveis encontrados' }, { name: 'crm.leads.update', status: 'success', detail: 'Preferências registradas' }],
          slots: [{ label: 'Preferência', value: input.slice(0, 40) }]
        };
      }
      setMessages(m => [...m, reply]);
      setIsTyping(false);
      setTraceOpen(reply.id);
    } catch (error: any) {
      setIsTyping(false);
      toast.error('Erro no sandbox: ' + error.message);
      setMessages(m => [...m, { id: Date.now() + 2, role: 'agent', agent: 'Sistema', content: 'Não foi possível processar a mensagem. Verifique se a operação está ativa.', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]);
    }
  };

  const resetConversation = () => {
    setMessages(initialMessages);
    setTraceOpen(null);
    toast.success('Conversa reiniciada');
  };

  const sandboxAgents = operationAgents.length > 0
    ? operationAgents.map((agent, index) => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      color: index === 0 ? 'bg-slate-950' : index === 1 ? 'bg-emerald-600' : index === 2 ? 'bg-purple-600' : 'bg-blue-600',
      model: String((agent.versions?.[0] as any)?.model || (agent.versions?.[0] as any)?.model_name || 'IA'),
      status: agent.status || 'ATIVO'
    }))
    : agents;
  const activeAgentObj = sandboxAgents.find(a => a.id === activeAgent) || sandboxAgents[0];

  return (
    <div className="min-h-full bg-[#F5F7FB] -m-3 sm:-m-4 md:-m-6 text-slate-950 flex flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="h-16 px-4 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={aiPath(id && id !== 'draft' ? `operations/${id}` : '')} className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-sm font-bold">Sandbox de conversação</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Modo de teste · sem envio real</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">OPERACAO: {id || 'draft'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetConversation} className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50">
              <RotateCcw size={13} /> Reiniciar
            </button>
            <button onClick={() => setAutoPaused(!autoPaused)} className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${autoPaused ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 hover:bg-slate-50'}`}>
              {autoPaused ? <Play size={13} /> : <Pause size={13} />} {autoPaused ? 'Auto-resposta pausada' : 'Auto-resposta'}
            </button>
            <button className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50">
              <Filter size={13} /> Filtrar
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden p-4 lg:p-7 gap-5">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
              {([
                ['chat', 'Chat', MessageSquare],
                ['phone', 'Ligação', Phone],
                ['leads', 'Leads', Users],
                ['visual', 'Visual', Bot]
              ] as const).map(([tab, label, icon]) => {
                const Icon = icon;
                return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === tab ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <Icon size={14} /> {label}
                </button>
                );
              })}
            </div>
            <button className="h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <MoreVertical size={16} />
            </button>
          </div>

          <div className="flex-1 rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                  MA
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-950">Maria Antonia</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
                    <span className="text-slate-300">·</span>
                    <span>Fonte: WhatsApp</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700">EM ATENDIMENTO</span>
                <button className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                  <Phone size={14} />
                </button>
                <button className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'flex gap-2'}`}>
                    {m.role === 'agent' && (
                  <div className={`h-7 w-7 rounded-lg ${sandboxAgents.find(a => a.name === m.agent)?.color || 'bg-emerald-600'} flex items-center justify-center text-white shrink-0 mt-1`}>
                        <Bot size={13} />
                      </div>
                    )}
                    <div className={`rounded-xl px-4 py-3 ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-700 rounded-bl-sm'}`}>
                      {m.role === 'agent' && <div className="text-[10px] font-bold text-slate-500 mb-1">{m.agent}</div>}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                      <div className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>{m.time}</div>
                    </div>
                    {m.role === 'agent' && m.tools && m.tools.length > 0 && (
                      <button onClick={() => setTraceOpen(traceOpen === m.id ? null : m.id)} className="mt-1 ml-9 flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-emerald-600">
                        <GitBranch size={10} /> {traceOpen === m.id ? 'Ocultar trace' : 'Ver trace'} ({m.tools.length})
                      </button>
                    )}
                    {m.role === 'agent' && m.tools && traceOpen === m.id && (
                      <div className="ml-9 mt-2 rounded-lg border border-slate-200 bg-white overflow-hidden">
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Tool trace</span>
                          <span className="text-[10px] text-slate-400">{m.time}</span>
                        </div>
                        <div className="p-2 space-y-1">
                          {m.tools.map((t, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.status === 'success' ? 'bg-emerald-500' : t.status === 'error' ? 'bg-red-500' : 'bg-blue-400'}`} />
                              <span className="text-[11px] font-mono text-slate-700">{t.name}</span>
                              <span className="text-[10px] text-slate-400 ml-auto truncate">{t.detail}</span>
                            </div>
                          ))}
                        </div>
                        {m.slots && (
                          <div className="p-2 border-t border-slate-100">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Slots capturados</div>
                            <div className="flex flex-wrap gap-1.5">
                              {m.slots.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700">
                                  {s.label}: {s.value}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-end gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                    <Bot size={13} />
                  </div>
                  <div className="rounded-xl bg-slate-100 px-4 py-3 flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <button className="h-10 w-10 rounded-lg text-slate-400 hover:bg-slate-50 flex items-center justify-center"><Mic size={17} /></button>
                <button className="h-10 w-10 rounded-lg text-slate-400 hover:bg-slate-50 flex items-center justify-center"><Paperclip size={17} /></button>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 h-10 rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <button onClick={sendMessage} disabled={!input.trim() || isTyping}
                  className="h-10 px-4 rounded-lg bg-slate-950 text-white text-sm font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-40">
                  <Send size={15} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] text-slate-400">Modo sandbox: nenhuma mensagem é enviada de verdade</span>
                <span className="text-[10px] text-slate-400">Enter para enviar</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="w-80 shrink-0 hidden xl:flex flex-col gap-4 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-950 uppercase tracking-wide">Agentes</span>
              <span className="text-[10px] font-bold text-slate-400">TESTE</span>
            </div>
            <div className="p-2 space-y-1">
              {sandboxAgents.map(a => (
                <button key={a.id} onClick={() => setActiveAgent(a.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${activeAgent === a.id ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                  <div className={`h-8 w-8 rounded-lg ${a.color} flex items-center justify-center text-white shrink-0`}>
                    {a.type === 'ORCHESTRATOR' ? <Brain size={14} /> : <Bot size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-950 truncate">{a.name}</div>
                    <div className="text-[10px] text-slate-400">{a.model}</div>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="ATIVO" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-950 uppercase tracking-wide">Painel operacional</span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Slots</span>
                  <span className="text-[10px] text-slate-400">4/6 preenchidos</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Bairro: Zona Sul', 'Orçamento: R$ 600 mil', 'Quartos: 2', 'Vaga: Sim'].map(s => (
                    <span key={s} className="px-2 py-1 rounded bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Contexto do lead</div>
                <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
                  {[
                    ['Origem', 'WhatsApp'],
                    ['Campanha', 'Google Ads - Compra'],
                    ['Status', 'Qualificado'],
                    ['Reuniões', '1 visita']
                  ].map(([k, v], i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-bold text-slate-700">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Qualificação</div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1"><span className="text-slate-500">Interesse</span><span className="text-emerald-600">Alto</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full w-[85%] bg-emerald-600 rounded-full" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1"><span className="text-slate-500">Urgência</span><span className="text-emerald-600">Média</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full w-[60%] bg-emerald-500 rounded-full" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1"><span className="text-slate-500">Capacidade</span><span className="text-emerald-600">Alta</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full w-[90%] bg-emerald-600 rounded-full" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-950 uppercase tracking-wide">Guardrails</span>
            </div>
            <div className="p-3 space-y-1.5">
              {[
                ['Data Truth Policy', true],
                ['Anti-repetição', true],
                ['Detecção de loop', true],
                ['Prompt injection', true],
                ['Handoff', true],
                ['Auditoria', true]
              ].map(([label, ok], i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {ok ? <CheckCircle2 size={13} className="text-emerald-600" /> : <AlertTriangle size={13} className="text-amber-500" />}
                  <span className="text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-950 uppercase tracking-wide">Custos estimados</span>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-slate-950">R$ 0,42</div>
              <div className="text-[11px] text-slate-500 mb-3">8 mensagens · teste</div>
              <div className="space-y-1.5">
                {[
                  ['Tokens de entrada', '2,1k'],
                  ['Tokens de saída', '1,3k'],
                  ['Tool calls', '7'],
                  ['Custo total', 'R$ 0,42']
                ].map(([k, v], i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-bold text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SandboxChat;
