import React, { useRef, useState } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react';
import { ChatMessage, consultingAgent } from '../services/consultingAgent';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';

interface ConsultingAgentProps {
  initialLeadData?: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
}

const ConsultingAgent: React.FC<ConsultingAgentProps> = ({ initialLeadData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Ola! Sou a Clara, especialista da ${COMMERCIAL_PRODUCT_NAME}. Posso te mostrar como nossa plataforma ajuda sua imobiliaria a centralizar leads, imoveis, atendimentos e processos comerciais em um unico sistema.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickButtons = [
    'Conhecer a plataforma',
    'Agendar demonstracao',
    'Ver recursos do sistema',
  ];

  const handleSend = async (overrideInput?: string) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim() || isTyping) return;

    const userMessage: ChatMessage = { role: 'user', content: messageToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await consultingAgent.processMessage(
        [...messages, userMessage],
        initialLeadData
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Desculpe, tive um erro. Podemos conversar por WhatsApp?',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 z-[100] flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xl transition-all group hover:scale-110 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageSquare size={28} />
      </button>

      <div
        className={`fixed bottom-8 right-8 z-[101] flex h-[80vh] max-h-[600px] w-[400px] flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl transition-all duration-500 ${isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-10 opacity-0'}`}
      >
        <div className="flex items-center justify-between bg-slate-900 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                Clara <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                Especialista {COMMERCIAL_PRODUCT_NAME}
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 transition-colors hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto bg-slate-50/50 p-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'rounded-tr-none bg-emerald-600 text-white'
                    : 'rounded-tl-none border border-slate-100 bg-white text-slate-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-none border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0.2s]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-50 bg-white px-6 py-3">
          {quickButtons.map((btn, i) => (
            <button
              key={i}
              onClick={() => handleSend(btn)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
            >
              {btn}
            </button>
          ))}
        </div>

        <div className="border-t border-slate-100 bg-white p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition-all focus-within:border-emerald-500/50"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escreva sua mensagem..."
              className="flex-1 border-none bg-transparent px-4 py-2 text-sm text-slate-800 outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:opacity-30"
            >
              {isTyping ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <Bot size={12} className="text-emerald-500" /> Powered by {COMMERCIAL_PRODUCT_NAME} AI
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConsultingAgent;
