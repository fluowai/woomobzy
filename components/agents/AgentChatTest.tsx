import React, { useRef, useState, useEffect } from 'react'
import {
  Bot, Send, Loader2, MessageCircle, Repeat2,
} from 'lucide-react'
import type { AIAgent } from '../../services/aiAgents'
import { aiAgentService } from '../../services/aiAgents'
import { callApi } from '../../src/lib/api'

type TestMessage = {
  id: string
  side: 'lead' | 'agent'
  content: string
}

type TestMode = 'lead-simulator' | 'agent-reply'

interface BuilderDraft {
  name?: string
  role?: string
  response_style?: string
  channels?: string[]
  channel?: string
  instructions?: string
}

interface AgentChatTestProps {
  agent: AIAgent | null
  draft: BuilderDraft
}

function buildDiagnostics(message: string) {
  const text = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const budget = message.match(
    /(?:r\$\s*)?(\d{2,3}(?:[.,]\d{3})*|\d+)\s*(milhao|milhoes|mi|m|mil)?/i
  )
  const city = message.match(/\bem\s+([^,.!?]{2,32})(?:[,.!?]|$)/i)
  const isVisit = /\b(visita|visitar|conhecer|agendar|horario)\b/.test(text)
  const isRent = /\b(alugar|aluguel|locacao|locar)\b/.test(text)
  const isSale = /\b(comprar|compra|procuro|busco|quero)\b/.test(text)
  const isFinance =
    /\b(financiamento|entrada|parcela|proposta|r\$|orcamento)\b/.test(text)

  return {
    intent: isVisit ? 'Visita' : isRent ? 'Locação' : isSale ? 'Compra' : 'Qualificação',
    budget: budget ? `${budget[1]} ${budget[2] || ''}`.trim() : 'A confirmar',
    city: city?.[1]?.trim() || 'A confirmar',
    temperature:
      isVisit || isFinance ? 'Quente' : isSale || isRent ? 'Morno' : 'Inicial',
    nextAction: isVisit
      ? 'Agendar visita'
      : isFinance
        ? 'Acionar corretor'
        : 'Qualificar perfil',
  }
}

async function simulateLeadReply(
  draft: BuilderDraft,
  message: string,
  history: TestMessage[]
) {
  const systemInstruction = [
    'Voce simula um lead imobiliario brasileiro real.',
    'Responda sempre como cliente/lead, nunca como assistente.',
    'Use mensagens naturais e curtas.',
    'Nao use markdown, nao explique o teste.',
  ].join(' ')

  const prompt = JSON.stringify({
    agent_under_test: {
      name: draft.name || 'Agente',
      role: draft.role || 'Atendimento',
      style: draft.response_style || 'consultivo',
      instructions: draft.instructions || '',
    },
    conversation: history.slice(-8).map((item) => ({
      role: item.side === 'agent' ? 'broker' : 'lead',
      content: item.content,
    })),
    broker_message: message,
    task: 'Continue a conversa respondendo apenas como o lead.',
  })

  try {
    const data = await callApi('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, systemInstruction, temperature: 0.85 }),
    })
    return String(data?.text || '').trim()
  } catch {
    return ''
  }
}

export const AgentChatTest: React.FC<AgentChatTestProps> = ({
  agent,
  draft,
}) => {
  const [testMode, setTestMode] = useState<TestMode>('agent-reply')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<TestMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `agent-test-${Date.now()}`)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const runTest = async (override?: string) => {
    const msg = (override || input).trim()
    if (!msg) return

    const outgoing: TestMessage = {
      id: `${testMode === 'lead-simulator' ? 'agent' : 'lead'}-${Date.now()}`,
      side: testMode === 'lead-simulator' ? 'agent' : 'lead',
      content: msg,
    }
    const nextHistory = [...messages, outgoing]
    setMessages(nextHistory)
    setInput('')
    setLoading(true)

    try {
      let reply = ''
      let replySide: TestMessage['side'] = 'agent'

      if (testMode === 'lead-simulator') {
        replySide = 'lead'
        reply = await simulateLeadReply(draft, msg, nextHistory)
        if (!reply) {
          reply = 'Entendi. Pode me passar mais detalhes?'
        }
      } else if (agent) {
        const response = await aiAgentService.chat(agent.id, msg, sessionId)
        reply = response.reply
      } else {
        reply = `Olá! Recebi sua mensagem. Como posso ajudar com sua busca por imóveis?`
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${replySide}-${Date.now()}`,
          side: replySide,
          content: reply || 'Não consegui responder agora.',
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-error-${Date.now()}`,
          side: 'agent',
          content: 'Erro ao conectar. Tente novamente.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const resetChat = () => {
    setMessages([])
    setInput('')
  }

  const lastMessage = [...messages].reverse().find((m) => m.side === 'lead')?.content || ''
  const diagnostics = buildDiagnostics(lastMessage)

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Bot size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-950">
                {draft.name || agent?.name || 'Teste'}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {testMode === 'lead-simulator'
                  ? 'Você fala como corretor'
                  : agent
                    ? 'Resposta real do agente'
                    : 'Simulação'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:ml-auto">
            <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setTestMode('lead-simulator')}
                className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                  testMode === 'lead-simulator'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Eu sou corretor
              </button>
              <button
                type="button"
                onClick={() => setTestMode('agent-reply')}
                className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                  testMode === 'agent-reply'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Eu sou lead
              </button>
            </div>
            <button
              type="button"
              onClick={resetChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              title="Limpar conversa"
            >
              <Repeat2 size={14} />
            </button>
          </div>
        </div>

        <div className="bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,.08),transparent_24%),radial-gradient(circle_at_84%_20%,rgba(139,92,246,.08),transparent_26%),#f6f3ee] p-4">
          <div className="mx-auto mb-3 w-fit rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-400 shadow-sm">
            Hoje
          </div>
          <div className="max-h-[460px] min-h-[320px] space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <div className="flex h-[280px] items-center justify-center text-center">
                <div className="max-w-sm rounded-lg border border-white/70 bg-white/80 px-5 py-4 shadow-sm">
                  <MessageCircle className="mx-auto text-emerald-600" size={22} />
                  <p className="mb-0 mt-2 text-sm font-bold text-slate-800">
                    Escreva a primeira mensagem
                  </p>
                  <p className="mb-0 mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    {testMode === 'lead-simulator'
                      ? 'Você manda como corretor e o lead responde.'
                      : 'Você manda como lead e valida a resposta.'}
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.side === 'agent' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-lg px-3 py-2 text-xs font-semibold leading-relaxed shadow-sm ${
                    msg.side === 'agent'
                      ? 'bg-[#D9FDD3] text-slate-800'
                      : 'bg-white text-slate-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="w-fit rounded-lg bg-white px-3 py-2 text-slate-400 shadow-sm">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0.4s]" />
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <form
          className="border-t border-slate-200 bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault()
            runTest()
          }}
        >
          {!agent && testMode === 'agent-reply' && (
            <div className="mb-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
              Salve o agente para testar resposta real da IA.
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-11 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder={
                testMode === 'lead-simulator'
                  ? 'Digite sua mensagem para o lead...'
                  : 'Digite como se fosse o lead...'
              }
              rows={2}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Send size={17} />
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold text-slate-950">Diagnóstico do teste</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Diagnostic label="Intenção" value={diagnostics.intent} />
            <Diagnostic label="Orçamento" value={diagnostics.budget} />
            <Diagnostic label="Cidade" value={diagnostics.city} />
            <Diagnostic label="Temperatura" value={diagnostics.temperature} />
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Próxima ação
            </div>
            <div className="mt-1 text-sm font-bold text-slate-950">
              {diagnostics.nextAction}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Diagnostic: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
      {label}
    </div>
    <div className="mt-1 text-xs font-bold text-slate-700">{value}</div>
  </div>
)
