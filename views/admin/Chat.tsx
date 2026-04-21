import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import {
  Send,
  MessageSquare,
  Phone,
  MoreVertical,
  ArrowLeft,
  Search,
  Loader2,
  Check,
  CheckCheck,
  Image,
  File,
  AlertCircle,
  Smartphone,
  Trash2,
  Info,
  User,
  Plus,
  Paperclip,
  Smile,
  Mic,
  Tag,
  History,
  Edit3,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Circle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../src/lib/api';

interface Chat {
  id: string;
  jid: string;
  name: string;
  profile_photo_url: string | null;
  last_message_at: string | null;
  unread_count: number;
  lead_info?: {
    classification: string;
    email?: string;
    origin?: string;
    last_interaction?: string;
  } | null;
}

interface Message {
  id: string;
  content: string;
  from_me: boolean;
  status: string;
  sender_name: string | null;
  timestamp: string;
  message_type: string;
  chat_id: string;
  media_url?: string;
  mime_type?: string;
  metadata?: any;
}

interface Instance {
  id: string;
  name: string;
  phone_number: string | null;
  status: string;
  socket_alive?: boolean;
}

const Chat: React.FC = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(
    null
  );
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'todos' | 'ativos' | 'automacao' | 'arquivados'
  >('todos');
  const [showCRM, setShowCRM] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  // ──────────────────────────────────────────────
  // Fetching Logic
  // ──────────────────────────────────────────────
  const getAuthHeaders = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchInstances = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        getApiUrl(`/api/whatsapp/instances?t=${Date.now()}`),
        { headers }
      );
      const data = await response.json();
      if (data.success) {
        setInstances(data.instances || []);
        if (!selectedInstance && data.instances?.length > 0) {
          const first = data.instances.find(
            (i: Instance) =>
              (i.status === 'connected' || i.status === 'connecting') &&
              i.socket_alive !== false
          );
          setSelectedInstance(first || data.instances[0]);
        }
      }
    } catch (err) {
      setError('Falha ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, selectedInstance]);

  const fetchChats = useCallback(
    async (instanceId: string) => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          getApiUrl(`/api/whatsapp/instances/${instanceId}/chats`),
          { headers }
        );
        const data = await response.json();
        if (data.success) setChats(data.chats || []);
      } catch (err) {
        console.error(err);
      }
    },
    [getAuthHeaders]
  );

  const fetchMessages = useCallback(
    async (instanceId: string, chatId: string) => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          getApiUrl(
            `/api/whatsapp/instances/${instanceId}/chats/${chatId}/messages`
          ),
          { headers }
        );
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages || []);
          setTimeout(() => scrollToBottom('auto'), 100);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [getAuthHeaders]
  );

  useEffect(() => {
    fetchInstances();
  }, [profile?.organization_id]);

  useEffect(() => {
    if (selectedInstance) {
      fetchChats(selectedInstance.id);
      // Supabase Realtime setup here...
    }
  }, [selectedInstance]);

  useEffect(() => {
    if (selectedInstance && selectedChat)
      fetchMessages(selectedInstance.id, selectedChat.id);
  }, [selectedChat]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedInstance || !selectedChat || sending)
      return;
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        getApiUrl(`/api/whatsapp/instances/${selectedInstance.id}/send`),
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jid: selectedChat.jid,
            text: newMessage.trim(),
          }),
        }
      );
      if ((await response.json()).success) setNewMessage('');
    } catch (err) {
      setError('Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  // ──────────────────────────────────────────────
  // UI Helpers
  // ──────────────────────────────────────────────
  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  const formatJid = (jid: string) => `+${jid.split('@')[0].split(':')[0]}`;

  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (activeTab === 'ativos') return matchesSearch && chat.unread_count > 0;
    if (activeTab === 'automacao')
      return matchesSearch && chat.jid.includes('bot'); // Simplificado
    return matchesSearch;
  });

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0F172A]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
          Iniciando Painel Rural...
        </p>
      </div>
    );

  return (
    <div className="flex h-full bg-[#0F172A] text-slate-100 overflow-hidden font-sans">
      {/* ────────────────────────────────────────────────────────────────
          1. SIDEBAR (CHATS) — Estilo HubSpot Dark
          ──────────────────────────────────────────────────────────────── */}
      <div
        className={`${selectedChat ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[400px] bg-[#1E293B]/40 border-r border-slate-800 shrink-0`}
      >
        {/* Search & Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase italic text-white flex items-center gap-2">
              <MessageSquare className="text-emerald-500" size={24} />
              Conversas
            </h1>
            <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">
              {selectedInstance?.name || 'OFFLINE'}
            </div>
          </div>

          <div className="relative mb-6">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar investidores ou chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none text-slate-300 placeholder:text-slate-600"
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800">
            {['todos', 'ativos', 'automacao', 'arquivados'].map((tab: any) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full flex items-center gap-4 p-4 rounded-[28px] transition-all group relative border ${
                selectedChat?.id === chat.id
                  ? 'bg-emerald-500/10 border-emerald-500/20 shadow-lg'
                  : 'bg-transparent border-transparent hover:bg-slate-800/40'
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 font-black text-xl border border-slate-700 shadow-xl overflow-hidden group-hover:scale-105 transition-transform">
                  {chat.profile_photo_url ? (
                    <img
                      src={chat.profile_photo_url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    chat.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#1E293B] rounded-full shadow-lg" />
              </div>

              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3
                    className={`font-bold truncate text-sm tracking-tight ${selectedChat?.id === chat.id ? 'text-emerald-400' : 'text-slate-100'}`}
                  >
                    {chat.name || formatJid(chat.jid)}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap ml-2">
                    {chat.last_message_at
                      ? formatTime(chat.last_message_at)
                      : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700`}
                  >
                    {chat.lead_info?.classification || 'Lead'}
                  </span>
                  <p className="text-xs text-slate-500 truncate font-medium">
                    {chat.jid.endsWith('@g.us')
                      ? 'Grupo Ativo'
                      : 'Atendimento Direto'}
                  </p>
                </div>
              </div>

              {chat.unread_count > 0 && (
                <div className="absolute top-4 right-4 w-5 h-5 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <span className="text-[10px] font-black text-white">
                    {chat.unread_count}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          2. ÁREA CENTRAL (CHAT) — Estilo Premium Intercom
          ──────────────────────────────────────────────────────────────── */}
      <div
        className={`${!selectedChat ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-slate-900 relative`}
      >
        {selectedChat ? (
          <>
            {/* Header */}
            <header className="h-[90px] px-8 flex items-center justify-between border-b border-slate-800/50 bg-[#0F172A]/80 backdrop-blur-md z-10 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="lg:hidden p-2 text-slate-400"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <User className="text-emerald-500" size={24} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white italic uppercase tracking-tight leading-none mb-1">
                    {selectedChat.name || formatJid(selectedChat.jid)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Ativo Agora
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-3 bg-slate-800 text-slate-400 hover:bg-emerald-500 hover:text-white rounded-2xl transition-all shadow-xl">
                  <Phone size={20} />
                </button>
                <button
                  onClick={() => setShowCRM(!showCRM)}
                  className={`p-3 rounded-2xl transition-all shadow-xl ${showCRM ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  <Info size={20} />
                </button>
                <button className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0F172A] pattern-dots">
              <div className="max-w-4xl mx-auto space-y-8">
                {messages.map((msg, i) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`group relative max-w-[75%] px-6 py-4 rounded-[32px] shadow-2xl transition-all ${
                        msg.from_me
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50'
                      }`}
                    >
                      <p className="text-[15px] font-medium leading-relaxed mb-2">
                        {msg.content}
                      </p>
                      <div
                        className={`flex items-center gap-2 justify-end text-[9px] font-black uppercase tracking-widest ${msg.from_me ? 'text-emerald-200' : 'text-slate-500'}`}
                      >
                        {formatTime(msg.timestamp)}
                        {msg.from_me && (
                          <CheckCheck
                            size={12}
                            className={
                              msg.status === 'read'
                                ? 'text-white'
                                : 'opacity-40'
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="p-6 bg-[#0F172A] border-t border-slate-800/80">
              <div className="max-w-4xl mx-auto flex items-center gap-3 bg-slate-800/50 p-2 rounded-[32px] border border-slate-700/50 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <button className="p-3 text-slate-500 hover:text-emerald-500 transition-colors">
                  <Paperclip size={20} />
                </button>
                <button className="p-3 text-slate-500 hover:text-emerald-500 transition-colors hidden sm:block">
                  <Smile size={20} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Envie uma mensagem estratégica..."
                  className="flex-1 bg-transparent px-4 py-2 outline-none text-sm font-medium text-slate-100 placeholder:text-slate-600"
                />
                <button className="p-3 text-slate-500 hover:text-emerald-500 transition-colors hidden sm:block">
                  <Mic size={20} />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className={`p-4 rounded-full transition-all shadow-xl shadow-emerald-500/20 ${
                    newMessage.trim() && !sending
                      ? 'bg-emerald-500 text-white hover:scale-105'
                      : 'bg-slate-700 text-slate-500'
                  }`}
                >
                  {sending ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
            <div className="w-32 h-32 bg-slate-800 rounded-[48px] flex items-center justify-center mb-8 border border-slate-700">
              <MessageSquare size={48} className="text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">
              Painel de Negócios
            </h2>
            <p className="max-w-xs text-sm font-bold uppercase tracking-widest leading-loose">
              Selecione uma oportunidade à esquerda para iniciar o atendimento
            </p>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────
          3. PAINEL CRM (DIREITA) — Premium Intelligence
          ──────────────────────────────────────────────────────────────── */}
      {selectedChat && showCRM && (
        <div className="hidden xl:flex flex-col w-[400px] bg-[#1E293B]/60 border-l border-slate-800 p-8 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-[40px] bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/20 shadow-2xl">
                <User size={48} className="text-emerald-500" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-slate-700 p-2 rounded-2xl text-emerald-500 shadow-xl">
                <TrendingUp size={20} />
              </div>
            </div>
            <h4 className="text-xl font-black italic uppercase italic text-white mb-1">
              {selectedChat.name || 'Investidor Rural'}
            </h4>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">
              {formatJid(selectedChat.jid)}
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/20 tracking-widest">
                Lead Quente
              </span>
              <span className="px-4 py-1.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-black uppercase border border-slate-700 tracking-widest">
                Tráfego Pago
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <button className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-3xl border border-slate-800 hover:border-emerald-500/40 transition-all group">
              <Edit3
                size={18}
                className="text-slate-500 group-hover:text-emerald-500"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Ver Ficha
              </span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-3xl border border-slate-800 hover:border-emerald-500/40 transition-all group">
              <ExternalLink
                size={18}
                className="text-slate-500 group-hover:text-emerald-500"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Pipeline
              </span>
            </button>
          </div>

          <div className="space-y-8">
            {/* Informações Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Info size={16} className="text-emerald-500" />
                <h5 className="text-xs font-black uppercase tracking-widest text-white">
                  Informações Base
                </h5>
              </div>
              <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">
                    E-mail
                  </p>
                  <p className="text-sm font-medium text-slate-200">
                    {selectedChat.lead_info?.email || 'un@invest.com'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">
                    Origem
                  </p>
                  <p className="text-sm font-medium text-slate-200">
                    Campanha Google Ads - Mato Grosso
                  </p>
                </div>
              </div>
            </section>

            {/* Histórico Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-emerald-500" />
                <h5 className="text-xs font-black uppercase tracking-widest text-white">
                  Histórico e Score
                </h5>
              </div>
              <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Interações
                  </span>
                  <span className="text-xs font-black text-emerald-500">
                    14 total
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Tempo de Resp.
                  </span>
                  <span className="text-xs font-black text-white">2.4 min</span>
                </div>
              </div>
            </section>

            {/* Tags Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-emerald-500" />
                  <h5 className="text-xs font-black uppercase tracking-widest text-white">
                    Marcadores
                  </h5>
                </div>
                <button className="text-emerald-500 hover:rotate-90 transition-transform">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Mato Grosso', 'Gado Corte', 'Investidor', 'MT'].map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 border border-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>

            {/* Notas Rápidas */}
            <section>
              <h5 className="text-xs font-black uppercase tracking-widest text-white mb-4">
                Notas do Consultor
              </h5>
              <textarea
                placeholder="Adicione uma nota estratégica sobre este interessado..."
                className="w-full h-32 bg-slate-900/50 border border-slate-800 rounded-3xl p-4 text-sm font-medium text-slate-300 resize-none focus:border-emerald-500/40 outline-none transition-all placeholder:text-slate-700"
              />
            </section>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 20px; }
        .pattern-dots {
          background-image: radial-gradient(#1E293B 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>
    </div>
  );
};

export default Chat;
