import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Send, 
  Sparkles, 
  Bot, 
  Calendar, 
  Users, 
  Target, 
  Clock,
  ChevronRight,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { ChatMessage, consultingAgent } from '../services/consultingAgent';
import { toast } from 'sonner';

const ConsultingQualificacao: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const leadName = searchParams.get('name') || '';
  const leadEmail = searchParams.get('email') || '';
  const leadCompany = searchParams.get('company') || '';

  useEffect(() => {
    // Initial welcome message with Typebot style delay
    const startChat = async () => {
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const welcomeMsg: ChatMessage = { 
        role: 'assistant', 
        content: `Olá${leadName ? ` ${leadName.split(' ')[0]}` : ''}! Prazer em te conhecer. 👋` 
      };
      
      const introMsg: ChatMessage = {
        role: 'assistant',
        content: `Sou a Clara, e vou te ajudar a configurar sua demonstração da IMOBZY. Antes de agendarmos um horário, me conte: qual o tamanho da sua equipe de corretores hoje?`
      };

      setMessages([welcomeMsg]);
      setIsTyping(false);
      
      setTimeout(async () => {
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setMessages(prev => [...prev, introMsg]);
        setIsTyping(false);
      }, 500);
    };

    startChat();
  }, [leadName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await consultingAgent.processMessage([...messages, userMsg], {
        name: leadName,
        email: leadEmail,
        company: leadCompany
      });
      
      // Artificial delay to feel like a real person/bot
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center font-sans">
      {/* Header / Progress bar */}
      <div className="w-full bg-white border-b border-slate-100 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
               <span className="text-white font-black italic">I</span>
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 leading-none">Qualificação IMOBZY</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">Fale com a Clara • Assistente Virtual</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atendimento Ativo</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 w-full max-w-3xl flex flex-col p-6 space-y-6 overflow-y-auto" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'user' ? 'bg-slate-200' : 'bg-emerald-600'
              }`}>
                {msg.role === 'user' ? <Users size={14} className="text-slate-600" /> : <Bot size={14} className="text-white" />}
              </div>
              <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none font-medium'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-white border border-slate-100 p-5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area (Typebot Style) */}
      <div className="w-full bg-white border-t border-slate-100 p-6">
        <div className="max-w-3xl mx-auto">
          {/* Quick Suggestions based on common qualification answers */}
          {!isTyping && messages.length > 0 && messages[messages.length-1].role === 'assistant' && (
            <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in duration-500">
              {['1 a 5 corretores', '6 a 15 corretores', 'Acima de 15', 'Sou gestor único'].map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => handleSend(opt)}
                  className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-4 bg-slate-50 rounded-2xl p-2 border border-slate-200 focus-within:border-emerald-500/50 transition-all shadow-inner"
          >
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva sua resposta..."
              className="flex-1 bg-transparent border-none outline-none px-6 py-3 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-30 transition-all shadow-lg shadow-emerald-200"
            >
              <Send size={20} />
            </button>
          </form>
          
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <CheckCircle2 size={12} className="text-emerald-500" /> Seus dados estão protegidos
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Bot size={12} className="text-emerald-500" /> Powered by IMOBZY AI
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.5s ease-out forwards; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default ConsultingQualificacao;
