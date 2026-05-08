import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Calendar, Sparkles, User, ChevronRight } from 'lucide-react';
import { ChatMessage, consultingAgent } from '../services/consultingAgent';
import { leadService } from '../services/leads';

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
      content: `Olá! Sou a Clara, especialista da IMOBZY. Posso te mostrar como nossa plataforma ajuda sua imobiliária a centralizar leads, imóveis, atendimentos e processos comerciais em um único sistema.` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickButtons = [
    'Conhecer a plataforma',
    'Agendar demonstração',
    'Ver recursos do sistema'
  ];

  const handleQuickAction = (action: string) => {
    setInput(action);
    // Auto-send if desired, or just set input
  };

  const handleSend = async (overrideInput?: string) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim() || isTyping) return;

    const userMessage: ChatMessage = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await consultingAgent.processMessage([...messages, userMessage], initialLeadData);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um erro. Podemos conversar por WhatsApp?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-full bg-emerald-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-[100] group ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageSquare size={28} />
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-8 right-8 w-[400px] max-h-[600px] h-[80vh] bg-white rounded-[2rem] shadow-2xl z-[101] flex flex-col overflow-hidden border border-slate-100 transition-all duration-500 transform ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                Clara <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Especialista IMOBZY</div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Buttons */}
        <div className="px-6 py-3 bg-white flex flex-wrap gap-2 border-t border-slate-50">
          {quickButtons.map((btn, i) => (
            <button 
              key={i}
              onClick={() => handleSend(btn)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all"
            >
              {btn}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-6 bg-white border-t border-slate-100">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-slate-50 rounded-2xl p-2 border border-slate-200 focus-within:border-emerald-500/50 transition-all"
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
              className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm text-slate-800"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-30 transition-all shadow-lg shadow-emerald-200"
            >
              {isTyping ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Bot size={12} className="text-emerald-500" /> Powered by IMOBZY AI
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConsultingAgent;
