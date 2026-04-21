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
      <div className="flex flex-col items-center justify-center h-full bg-brand">
        <Loader2 className="w-10 h-10 animate-spin text-brand mb-4" />
        <p className="text-secondary font-bold uppercase tracking-[0.2em] text-[10px]">
          Carregando mensagens...
        </p>
      </div>
    );

  return (
    <div className="flex h-full bg-brand text-text-primary overflow-hidden font-sans">
      {/* ============================================
          1. SIDEBAR (CHATS) — Estilo WhatsApp Web
      ============================================ */}
      <div
        className={`${selectedChat ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[400px] bg-wa-sidebar border-r border-subtle shrink-0`}
      >
        {/* Search & Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold uppercase tracking-tight text-text-primary flex items-center gap-2">
              <MessageSquare className="text-brand" size={24} />
              Conversas
            </h1>
            <div className="bg-brand/10 text-brand text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-brand/20">
              {selectedInstance?.name || 'OFFLINE'}
            </div>
          </div>

          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-input border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 transition-all outline-none text-text-primary placeholder:text-tertiary"
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-bg-card rounded-lg border border-subtle">
            {['todos', 'ativos', 'automacao', 'arquivados'].map((tab: any) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${
                  activeTab === tab
                    ? 'bg-brand text-white'
                    : 'text-tertiary hover:text-text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full flex items-center gap-3 p-3 transition-all group border-b border-subtle ${
                selectedChat?.id === chat.id
                  ? 'bg-brand/10 border-l-2 border-l-brand'
                  : 'hover:bg-brand/5'
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center text-text-primary font-bold text-lg border border-subtle overflow-hidden group-hover:scale-105 transition-transform">
                  {chat.profile_photo_url ? (
                    <img
                      src={chat.profile_photo_url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    chat.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand border-2 border-wa-sidebar rounded-full" />
              </div>

              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h3
                    className={`font-semibold truncate text-sm ${selectedChat?.id === chat.id ? 'text-brand' : 'text-text-primary'}`}
                  >
                    {chat.name || formatJid(chat.jid)}
                  </h3>
                  <span className="text-[10px] font-medium text-tertiary whitespace-nowrap ml-2">
                    {chat.last_message_at
                      ? formatTime(chat.last_message_at)
                      : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg-hover text-tertiary border border-subtle`}
                  >
                    {chat.lead_info?.classification || 'Lead'}
                  </span>
                  <p className="text-xs text-tertiary truncate font-medium">
                    {chat.jid.endsWith('@g.us') ? 'Grupo' : 'Direto'}
                  </p>
                </div>
              </div>

              {chat.unread_count > 0 && (
                <div className="absolute top-3 right-3 min-w-[18px] h-[18px] bg-brand rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white px-1">
                    {chat.unread_count}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================
          2. ÁREA CENTRAL (CHAT) — Estilo WhatsApp
      ============================================ */}
      <div
        className={`${!selectedChat ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-wa-bg relative`}
      >
        {selectedChat ? (
          <>
            {/* Header */}
            <header className="h-16 px-4 flex items-center justify-between border-b border-subtle bg-bg-card z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="lg:hidden p-2 text-secondary"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center border border-brand/20">
                    <User className="text-brand" size={20} />
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand rounded-full border-2 border-bg-card" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary leading-tight mb-0.5">
                    {selectedChat.name || formatJid(selectedChat.jid)}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                    <span className="text-[10px] font-medium text-tertiary uppercase tracking-wide">
                      Online
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2.5 bg-bg-hover text-secondary hover:text-brand rounded-lg transition-all">
                  <Phone size={18} />
                </button>
                <button
                  onClick={() => setShowCRM(!showCRM)}
                  className={`p-2.5 rounded-lg transition-all ${showCRM ? 'bg-brand text-white' : 'bg-bg-hover text-secondary hover:text-brand'}`}
                >
                  <Info size={18} />
                </button>
                <button className="p-2.5 bg-bg-hover text-secondary hover:text-brand rounded-lg transition-all">
                  <MoreVertical size={18} />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-wa-bg">
              <div className="max-w-3xl mx-auto space-y-1">
                {messages.map((msg, i) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-200`}
                  >
                    <div
                      className={`group relative max-w-[70%] px-3 py-2 rounded-lg transition-all ${
                        msg.from_me
                          ? 'message-sent rounded-tr-sm'
                          : 'message-received rounded-tl-sm'
                      }`}
                    >
                      <p className="text-[14px] font-normal leading-relaxed">
                        {msg.content}
                      </p>
                      <div
                        className={`flex items-center justify-end gap-1 text-[9px] font-medium mt-0.5 ${
                          msg.from_me ? 'text-white/70' : 'text-tertiary'
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                        {msg.from_me && (
                          <CheckCheck
                            size={10}
                            className={
                              msg.status === 'read'
                                ? 'text-brand'
                                : 'text-white/40'
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
            <div className="p-3 bg-bg-card border-t border-subtle">
              <div className="max-w-3xl mx-auto flex items-center gap-2 bg-bg-input p-1.5 rounded-xl border border-subtle focus-within:ring-2 focus-within:ring-brand/20 transition-all">
                <button className="p-2 text-tertiary hover:text-brand transition-colors">
                  <Paperclip size={18} />
                </button>
                <button className="p-2 text-tertiary hover:text-brand transition-colors hidden sm:block">
                  <Smile size={18} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-transparent px-3 py-2 outline-none text-sm font-normal text-text-primary placeholder:text-tertiary"
                />
                <button className="p-2 text-tertiary hover:text-brand transition-colors hidden sm:block">
                  <Mic size={18} />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className={`p-2.5 rounded-lg transition-all ${
                    newMessage.trim() && !sending
                      ? 'bg-brand text-white hover:scale-105'
                      : 'bg-bg-hover text-tertiary'
                  }`}
                >
                  {sending ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
            <div className="w-24 h-24 bg-bg-hover rounded-full flex items-center justify-center mb-6 border border-subtle">
              <MessageSquare size={40} className="text-brand" />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-4">
              Mensagens
            </h2>
            <p className="max-w-xs text-sm font-medium text-secondary">
              Selecione uma conversa para iniciar o atendimento
            </p>
          </div>
        )}
      </div>

      {/* ============================================
          3. PAINEL CRM (DIREITA)
      ============================================ */}
      {selectedChat && showCRM && (
        <div className="hidden xl:flex flex-col w-[360px] bg-bg-card border-l border-subtle p-6 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center border-2 border-brand/20">
                <User size={36} className="text-brand" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-bg-card border border-subtle p-1.5 rounded-full text-brand">
                <TrendingUp size={16} />
              </div>
            </div>
            <h4 className="text-lg font-bold text-text-primary mb-0.5">
              {selectedChat.name || 'Contato'}
            </h4>
            <p className="text-xs font-medium text-tertiary uppercase tracking-wide mb-5">
              {formatJid(selectedChat.jid)}
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full bg-brand/15 text-brand text-[10px] font-bold uppercase tracking-wide border border-brand/20">
                Lead
              </span>
              <span className="px-3 py-1 rounded-full bg-bg-hover text-secondary text-[10px] font-bold uppercase tracking-wide border border-subtle">
                Ativo
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="flex flex-col items-center gap-2 p-4 bg-bg-hover rounded-xl border border-subtle hover:border-brand/40 transition-all group">
              <Edit3
                size={16}
                className="text-tertiary group-hover:text-brand"
              />
              <span className="text-[10px] font-bold uppercase tracking-wide text-secondary">
                Ficha
              </span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 bg-bg-hover rounded-xl border border-subtle hover:border-brand/40 transition-all group">
              <ExternalLink
                size={16}
                className="text-tertiary group-hover:text-brand"
              />
              <span className="text-[10px] font-bold uppercase tracking-wide text-secondary">
                Pipeline
              </span>
            </button>
          </div>

          <div className="space-y-6">
            {/* Informações Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-brand" />
                <h5 className="text-xs font-bold uppercase tracking-wide text-text-primary">
                  Informações
                </h5>
              </div>
              <div className="bg-bg-hover rounded-xl border border-subtle p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-medium text-tertiary uppercase mb-0.5">
                    E-mail
                  </p>
                  <p className="text-sm font-medium text-text-primary"></p>
                  <p className="text-[10px] font-bold text-tertiary uppercase mb-1">
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
              <div className="flex items-center gap-2 mb-3">
                <History size={14} className="text-brand" />
                <h5 className="text-xs font-bold uppercase tracking-wide text-text-primary">
                  Histórico
                </h5>
              </div>
              <div className="bg-bg-hover rounded-xl border border-subtle p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-medium text-tertiary uppercase">
                    Interações
                  </span>
                  <span className="text-xs font-bold text-brand">0</span>
                </div>
              </div>
            </section>

            {/* Tags Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-brand" />
                  <h5 className="text-xs font-bold uppercase tracking-wide text-text-primary">
                    Marcadores
                  </h5>
                </div>
                <button className="text-brand hover:rotate-90 transition-transform">
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Tag1', 'Tag2'].map((t) => (
                  <span
                    key={t}
                    className="px-2 py-1 bg-bg-hover rounded-md text-[10px] font-medium text-secondary border border-subtle"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>

            {/* Notas Rápidas */}
            <section>
              <h5 className="text-xs font-bold uppercase tracking-wide text-text-primary mb-3">
                Notas
              </h5>
              <textarea
                placeholder="Adicione uma nota..."
                className="w-full h-28 bg-bg-input border border-subtle rounded-xl p-3 text-sm font-medium text-text-primary resize-none focus:border-brand/40 outline-none transition-all placeholder:text-tertiary"
              />
            </section>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default Chat;
