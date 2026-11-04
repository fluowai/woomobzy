import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { callApi } from '../src/lib/api';

export const WebChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    { role: 'agent' | 'user'; content: string }[]
  >([
    {
      role: 'agent',
      content: 'Olá! Sou o assistente virtual. Como posso te ajudar hoje?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      // In a real scenario, we would pass an agentId or tenantId here.
      // For now, this is a placeholder integration for the widget.
      const response = await callApi('/api/gemini/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage }),
      });

      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: response.reply || 'Recebido.' },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: 'Desculpe, estou com dificuldades de conexão no momento.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <div className="text-sm font-bold">Assistente Virtual</div>
                <div className="text-[10px] font-medium text-emerald-100 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />{' '}
                  Online
                </div>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="text-emerald-100 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Loader2
                    size={14}
                    className="animate-spin text-emerald-600"
                  />
                  <span className="text-xs text-slate-400 font-medium">
                    Digitando...
                  </span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 h-10 px-3 rounded-xl bg-slate-100 border-none outline-none text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Send size={16} className="-ml-0.5" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={toggleChat}
        className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-700 transition hover:scale-105 active:scale-95"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};
