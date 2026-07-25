import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, User, Sparkles, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WooTechAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Olá! Eu sou o WooTech AI. Estou aqui para te ajudar com análises, textos, criativos ou dúvidas sobre o mercado imobiliário e rural. Como posso te ajudar hoje?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const apiUrl = (import.meta.env.VITE_API_URL === 'same-origin' ? '' : import.meta.env.VITE_API_URL) + '/api/wootech-ai/chat';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          model: 'auto/wootech',
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação com a IA');
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.choices[0].message.content },
        ]);
      } else {
        toast.error('Resposta vazia da IA.');
      }
    } catch (error) {
      console.error('WooTech AI Error:', error);
      toast.error('Ocorreu um erro ao conectar com o WooTech AI. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          'Olá! Eu sou o WooTech AI. Estou aqui para te ajudar com análises, textos, criativos ou dúvidas sobre o mercado imobiliário e rural. Como posso te ajudar hoje?',
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Sparkles size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">WooTech AI</h1>
            <p className="text-xs text-slate-300 font-medium">Assistente Inteligente Avançado</p>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors rounded-lg backdrop-blur-sm border border-white/10"
        >
          <PlusCircle size={16} />
          Novo Chat
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-sm border ${
                  msg.role === 'user'
                    ? 'bg-blue-100 border-blue-200 text-blue-600'
                    : 'bg-indigo-100 border-indigo-200 text-indigo-600'
                }`}
              >
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                } max-w-[85%] sm:max-w-[75%]`}
              >
                <div
                  className={`px-4 sm:px-5 py-3 rounded-2xl shadow-sm text-sm sm:text-base whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-sm">
                <Bot size={18} />
              </div>
              <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-slate-400" />
                <span className="text-sm text-slate-500 animate-pulse">
                  WooTech AI está processando...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ou peça algo ao WooTech AI..."
            className="w-full pl-5 pr-14 py-4 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 shadow-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
          </button>
        </form>
        <p className="text-center text-[11px] text-slate-400 mt-3">
          WooTech AI utiliza roteamento inteligente gratuito via OmniRoute. O conteúdo gerado deve ser revisado.
        </p>
      </div>
    </div>
  );
};

export default WooTechAI;
