import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { toast } from 'sonner';

interface WebChatWidgetProps {
  organizationId: string;
}

export const WebChatWidget: React.FC<WebChatWidgetProps> = ({
  organizationId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !session && !isInitializing) {
      initSession();
    }
  }, [isOpen]);

  useEffect(() => {
    if (session?.id) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [session?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getVisitorId = () => {
    let vid = localStorage.getItem('imobzy_visitor_id');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('imobzy_visitor_id', vid);
    }
    return vid;
  };

  const initSession = async () => {
    setIsInitializing(true);
    try {
      const res = await fetch('/api/crm/webchat/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_id: getVisitorId(),
          organization_id: organizationId,
        }),
      });
      if (!res.ok) throw new Error('Falha ao iniciar chat');
      const data = await res.json();
      setSession(data);
    } catch (err: any) {
      toast.error('Erro ao conectar ao chat online');
    } finally {
      setIsInitializing(false);
    }
  };

  const loadMessages = async () => {
    if (!session?.id) return;
    try {
      const res = await fetch(`/api/crm/webchat/messages/${session.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      // silent fail for polling
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session?.id) return;

    const content = newMessage.trim();
    setNewMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/crm/webchat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          content,
        }),
      });
      if (!res.ok) throw new Error('Falha ao enviar mensagem');
      await loadMessages();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-[350px] h-[500px] mb-4 flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Atendimento Online</h3>
                <p className="text-xs text-emerald-100">
                  Responderemos em instantes
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3">
            {messages.length === 0 && !isInitializing && (
              <div className="text-center text-slate-500 text-sm mt-8">
                Como podemos ajudar hoje?
              </div>
            )}
            {isInitializing && (
              <div className="text-center text-slate-500 text-sm mt-8">
                Conectando...
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${msg.sender_type === 'visitor' ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl text-sm ${
                    msg.sender_type === 'visitor'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 mx-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={loading || !session}
                className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm outline-none transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || loading || !session}
                className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <Send size={18} className="ml-1" />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
};
