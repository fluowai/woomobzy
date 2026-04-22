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
  Users,
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
  const handleDeleteChat = async () => {
    if (!selectedChat) return;
    if (!window.confirm('Excluir permanentemente esta conversa de forma irreversível?')) return;

    try {
      // Delete from DB directly (requires RLS permit or public schema)
      await supabase.from('whatsapp_messages').delete().eq('chat_id', selectedChat.id);
      const { error } = await supabase.from('whatsapp_chats').delete().eq('id', selectedChat.id);
      
      if (error) throw error;

      // Local state update
      setChats((prev) => prev.filter((c) => c.id !== selectedChat.id));
      setSelectedChat(null);
    } catch (err) {
      console.error('Erro ao deletar chat', err);
      alert('Falha ao excluir a conversa. Verifique as permissões.');
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
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0 bg-wa-sidebar">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all group border-b border-white/5 relative ${
                selectedChat?.id === chat.id
                  ? 'bg-wa-msg-received'
                  : 'hover:bg-bg-hover'
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-wa-msg-received flex items-center justify-center text-text-primary font-bold text-lg overflow-hidden group-hover:scale-105 transition-transform border border-white/5">
                  {chat.profile_photo_url ? (
                    <img
                      src={chat.profile_photo_url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={24} className="text-tertiary" />
                  )}
                </div>
              </div>

              <div className="flex-1 text-left min-w-0 py-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium truncate text-[16px] text-text-primary">
                    {chat.name || formatJid(chat.jid)}
                  </h3>
                  <span className={`text-[12px] font-normal whitespace-nowrap ml-2 ${chat.unread_count > 0 ? 'text-brand' : 'text-tertiary'}`}>
                    {chat.last_message_at ? formatTime(chat.last_message_at) : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-tertiary truncate font-normal leading-tight pr-4">
                    {chat.jid.endsWith('@g.us') ? (
                      <span className="flex items-center gap-1"><Users size={12} /> Grupo</span>
                    ) : (
                      'Clique para ver a conversa'
                    )}
                  </p>
                  {chat.unread_count > 0 && (
                    <div className="min-w-[20px] h-[20px] bg-brand rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-[11px] font-bold text-white px-1">
                        {chat.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </div>
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
            <header className="h-16 px-4 flex items-center justify-between border-b border-white/5 bg-wa-sidebar z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="lg:hidden p-2 text-secondary"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-wa-msg-received flex items-center justify-center border border-white/5 overflow-hidden">
                    {selectedChat.profile_photo_url ? (
                      <img src={selectedChat.profile_photo_url} className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-tertiary" />
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-brand rounded-full border-2 border-wa-sidebar shadow-sm" />
                </div>
                <div>
                  <h2 className="text-[16px] font-medium text-text-primary leading-tight">
                    {selectedChat.name || formatJid(selectedChat.jid)}
                  </h2>
                  <p className="text-[11px] text-tertiary font-normal">
                    {selectedChat.jid.endsWith('@g.us') ? 'Em grupo' : 'Online'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="p-2 text-tertiary hover:text-text-primary transition-all">
                  <Search size={20} />
                </button>
                <button 
                  onClick={handleDeleteChat} 
                  className="p-2 text-tertiary hover:text-red-500 transition-all"
                  title="Apagar conversa"
                >
                  <Trash2 size={20} />
                </button>
                <button className="p-2 text-tertiary hover:text-text-primary transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 custom-scrollbar" 
              style={{ 
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                backgroundSize: '400px',
                backgroundRepeat: 'repeat',
                backgroundColor: 'var(--color-wa-bg)'
              }}
            >
              <div className="max-w-4xl mx-auto space-y-2">
                {messages.map((msg, i) => {
                  const isGroup = selectedChat?.jid.endsWith('@g.us');
                  const showSender = isGroup && !msg.from_me;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-200`}
                    >
                      <div
                        className={`group relative max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-xl shadow-sm transition-all ${
                          msg.from_me
                            ? 'bg-wa-bubble-sent text-text-primary rounded-tr-none'
                            : 'bg-wa-bubble-received text-text-primary rounded-tl-none'
                        }`}
                      >
                        {showSender && (
                          <p className="text-[11px] font-bold text-brand mb-1 truncate">
                            {msg.sender_name || 'Membro'}
                          </p>
                        )}
                        
                        {/* Media Content */}
                        {msg.media_url && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-black/5 bg-black/5">
                            {msg.message_type === 'imageMessage' ? (
                              <img 
                                src={msg.media_url} 
                                alt="Mídia" 
                                className="max-w-full max-h-[300px] object-contain hover:scale-[1.02] transition-transform cursor-pointer"
                                onClick={() => window.open(msg.media_url, '_blank')}
                              />
                            ) : msg.message_type === 'audioMessage' ? (
                              <audio controls className="w-full h-8 scale-90 -ml-4">
                                <source src={msg.media_url} type={msg.mime_type || 'audio/ogg'} />
                              </audio>
                            ) : (
                              <div 
                                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-black/5"
                                onClick={() => window.open(msg.media_url, '_blank')}
                              >
                                <div className="p-2 bg-wa-msg-received rounded-lg">
                                  <File size={20} className="text-brand" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate">Arquivo {msg.mime_type?.split('/')[1]?.toUpperCase()}</p>
                                  <p className="text-[10px] text-tertiary">Clique para baixar</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-[14px] font-normal leading-snug break-words whitespace-pre-wrap">
                          {msg.content}
                        </p>

                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] font-medium mt-1 -mr-1 ${
                            msg.from_me ? 'text-wa-time-sent' : 'text-wa-time-received'
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                          {msg.from_me && (
                            <div className="ml-1">
                              {msg.status === 'read' ? (
                                <CheckCheck size={12} className="text-wa-check-read" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck size={12} className="text-wa-check-delivered" />
                              ) : (
                                <Check size={12} className="text-wa-check-sent" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="p-2 bg-wa-sidebar border-t border-white/5">
              <div className="max-w-4xl mx-auto flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button className="p-2.5 text-tertiary hover:text-text-primary transition-all">
                    <Smile size={24} />
                  </button>
                  <button className="p-2.5 text-tertiary hover:text-text-primary transition-all mr-1">
                    <Paperclip size={24} />
                  </button>
                </div>
                
                <div className="flex-1 bg-wa-msg-received rounded-lg px-4 py-2 border border-white/5 focus-within:border-white/10 transition-all">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Digite uma mensagem"
                    className="w-full bg-transparent outline-none text-[15px] text-text-primary placeholder:text-tertiary"
                  />
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-3 text-tertiary hover:text-text-primary transition-all flex items-center justify-center"
                >
                  {sending ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : newMessage.trim() ? (
                    <Send size={24} className="text-brand" />
                  ) : (
                    <Mic size={24} />
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2e38; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #007850; }
      `}</style>
    </div>
  );
};

export default Chat;
