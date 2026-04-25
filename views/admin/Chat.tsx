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
  CheckSquare,
  X,
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
  sender_jid?: string;
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
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'todos' | 'contatos' | 'grupos' | 'arquivados'
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

  const handleDeleteBulk = async () => {
    if (!selectedChat || selectedMessageIds.length === 0 || !selectedInstance) return;
    if (!confirm(`Deseja excluir permanentemente estas ${selectedMessageIds.length} mensagens?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/whatsapp/instances/${selectedInstance.id}/messages/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ ids: selectedMessageIds }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m.id)));
        setSelectedMessageIds([]);
        setIsSelectionMode(false);
      } else {
        alert(data.error || 'Erro ao excluir mensagens');
      }
    } catch (err) {
      console.error('Erro ao excluir mensagens:', err);
      alert('Erro de conexão ao excluir mensagens');
    } finally {
      setIsDeleting(false);
    }
  };

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
  const handleClearMessages = async () => {
    if (!selectedChat) return;
    if (!window.confirm('Deseja limpar todas as mensagens desta conversa? O contato continuará na lista.')) return;

    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .delete()
        .eq('chat_id', selectedChat.id);
      
      if (error) throw error;

      setMessages([]);
      console.log(`[Chat] 🧹 Mensagens limpas para o chat ${selectedChat.id}`);
    } catch (err) {
      console.error('Erro ao limpar mensagens', err);
      alert('Falha ao limpar as mensagens.');
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChat) return;
    if (!window.confirm('EXCLUIR CONVERSA: Isso removerá permanentemente o contato e todas as mensagens do seu painel. Confirmar?')) return;

    try {
      await supabase.from('whatsapp_messages').delete().eq('chat_id', selectedChat.id);
      const { error } = await supabase.from('whatsapp_chats').delete().eq('id', selectedChat.id);
      
      if (error) throw error;

      setChats((prev) => prev.filter((c) => c.id !== selectedChat.id));
      setSelectedChat(null);
      setMessages([]);
    } catch (err) {
      console.error('Erro ao deletar chat', err);
      alert('Falha ao excluir a conversa. Verifique as permissões.');
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  const formatDisplayJid = (jid: string) => {
    if (!jid) return '';
    const num = jid.split('@')[0].split(':')[0];
    if (num.length >= 15 || jid.includes('@lid')) return num; 
    if (num.startsWith('55') && num.length >= 10) {
      const ddd = num.slice(2, 4);
      const rest = num.slice(4);
      return `+55 (${ddd}) ${rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4)}-${rest.length === 9 ? rest.slice(5) : rest.slice(4)}`;
    }
    return `+${num}`;
  };

  const mentionMap = React.useMemo(() => {
    const map = new Map<string, string>();
    messages.forEach((m: any) => {
      if (m.resolved_mentions && Array.isArray(m.resolved_mentions)) {
        for (const mention of m.resolved_mentions) {
          if (mention.name) map.set(mention.number, mention.name);
        }
      }
      if (m.sender_name && !m.sender_name.startsWith('+') && m.sender_jid) {
        const num = m.sender_jid.split('@')[0].split(':')[0];
        map.set(num, m.sender_name);
      }
    });
    return map;
  }, [messages]);

  const renderMessageContent = (content: string) => {
    if (!content) return content;
    const mentionRegex = /@(\+?\d{10,15})/g;
    const parts = content.split(mentionRegex);
    if (parts.length === 1) return content;
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const cleanPart = part.startsWith('+') ? part.slice(1) : part;
        const resolvedName = mentionMap.get(cleanPart);
        return (
          <span key={i} className="text-brand font-bold bg-brand/10 px-1 py-0.5 rounded-md text-[13px]">
            @{resolvedName || formatDisplayJid(cleanPart + '@s.whatsapp.net')}
          </span>
        );
      }
      return part;
    });
  };

  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (activeTab === 'contatos') return matchesSearch && !chat.jid.endsWith('@g.us');
    if (activeTab === 'grupos') return matchesSearch && chat.jid.endsWith('@g.us');
    if (activeTab === 'arquivados') return false; // Por enquanto
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
    <div className="flex h-full bg-wa-bg text-text-primary overflow-hidden font-sans border-t border-subtle">
      <div className={`${selectedChat ? 'hidden lg:flex' : 'flex'} flex-col w-full md:w-[350px] lg:w-[380px] bg-white border-r border-subtle shrink-0 shadow-sm z-10`}>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-input border border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 transition-all outline-none text-text-primary placeholder:text-tertiary"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-wa-msg-received rounded-lg border border-subtle">
            {['todos', 'contatos', 'grupos'].map((tab: any) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${
                  activeTab === tab ? 'bg-brand text-white shadow-md' : 'text-tertiary hover:text-text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0 bg-wa-sidebar">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all group border-b border-white/5 relative ${
                selectedChat?.id === chat.id ? 'bg-wa-msg-received' : 'hover:bg-bg-hover'
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-wa-msg-received flex items-center justify-center text-text-primary font-bold text-lg overflow-hidden group-hover:scale-105 transition-transform border border-white/5">
                  {chat.profile_photo_url ? (
                    <img src={chat.profile_photo_url} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-tertiary" />
                  )}
                </div>
              </div>
              <div className="flex-1 text-left min-w-0 py-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium truncate text-[16px] text-text-primary">
                    {chat.name || formatDisplayJid(chat.jid)}
                  </h3>
                  <span className={`text-[12px] font-normal whitespace-nowrap ml-2 ${chat.unread_count > 0 ? 'text-brand' : 'text-tertiary'}`}>
                    {chat.last_message_at ? formatTime(chat.last_message_at) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-tertiary truncate font-normal leading-tight pr-4">
                    {chat.jid.endsWith('@g.us') ? <span className="flex items-center gap-1"><Users size={12} /> Grupo</span> : 'Clique para ver a conversa'}
                  </p>
                  {chat.unread_count > 0 && (
                    <div className="min-w-[20px] h-[20px] bg-brand rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-[11px] font-bold text-white px-1">{chat.unread_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`${!selectedChat ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-wa-bg relative`}>
        {selectedChat ? (
          <>
            <header className="h-16 px-4 flex items-center justify-between border-b border-white/5 bg-wa-sidebar z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedChat(null)} className="lg:hidden p-2 text-secondary">
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
                  <h3 className="font-bold text-text-primary leading-tight">{selectedChat.name || formatDisplayJid(selectedChat.jid)}</h3>
                  <p className="text-[11px] font-bold text-brand uppercase tracking-widest mt-0.5">{selectedChat.jid.endsWith('@g.us') ? 'Em grupo' : 'Chat Individual'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                  className={`p-2 rounded-full transition-all ${isSelectionMode ? 'bg-brand text-white shadow-lg' : 'text-tertiary hover:text-brand'}`}
                  title="Selecionar mensagens"
                >
                  <CheckSquare size={20} />
                </button>
                <button className="p-2 text-tertiary hover:text-text-primary transition-all"><Search size={20} /></button>
                <button onClick={handleClearMessages} className="p-2 text-tertiary hover:text-brand transition-all" title="Limpar histórico"><History size={20} /></button>
                <button onClick={handleDeleteChat} className="p-2 text-tertiary hover:text-red-500 transition-all ml-1" title="Excluir conversa"><Trash2 size={20} /></button>
                <button className="p-2 text-tertiary hover:text-text-primary transition-all"><MoreVertical size={20} /></button>
              </div>
            </header>

            <div 
              className="flex-1 overflow-y-auto p-4 custom-scrollbar" 
              style={{ 
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                backgroundSize: '400px',
                backgroundRepeat: 'repeat',
                backgroundColor: 'var(--color-wa-bg)'
              }}
            >
              <div className="flex flex-col space-y-1">
                {messages.map((msg, i) => {
                  const isGroup = selectedChat?.jid.endsWith('@g.us');
                  const showSender = isGroup && !msg.from_me;
                  const isSelected = selectedMessageIds.includes(msg.id);

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex items-start gap-3 group/msg ${isSelectionMode ? 'cursor-pointer hover:bg-black/[0.02]' : ''}`}
                      onClick={() => {
                        if (isSelectionMode) {
                          setSelectedMessageIds(prev => 
                            prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]
                          );
                        }
                      }}
                    >
                      {isSelectionMode && (
                        <div className="pt-2">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-brand border-brand' : 'border-gray-300'}`}>
                            {isSelected && <Check size={14} className="text-white" />}
                          </div>
                        </div>
                      )}
                      <div className={`flex-1 flex flex-col ${msg.from_me ? 'items-end' : 'items-start'} max-w-full`}>
                        <div className={`group relative transition-all w-full md:max-w-[90%] py-2 px-4 ${
                          msg.from_me ? 'text-right' : 'text-left'
                        }`}>
                          {showSender && (
                            <p className="text-[11px] font-bold text-brand mb-0.5 uppercase tracking-wider">
                              {msg.sender_name || formatDisplayJid(msg.sender_jid || '')}
                            </p>
                          )}
                          {msg.media_url && (
                            <div className={`mb-2 inline-block rounded-lg overflow-hidden border border-black/5 bg-black/5`}>
                              {msg.message_type === 'imageMessage' ? (
                                <img src={msg.media_url} alt="Mídia" className="max-w-full max-h-[400px] object-contain hover:grayscale-0 grayscale-[0.2] transition-all cursor-pointer" onClick={() => window.open(msg.media_url, '_blank')} />
                              ) : msg.message_type === 'audioMessage' ? (
                                <audio controls className="w-[300px] h-8 scale-90 -ml-4"><source src={msg.media_url} type={msg.mime_type || 'audio/ogg'} /></audio>
                              ) : (
                                <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-black/5" onClick={() => window.open(msg.media_url, '_blank')}>
                                  <div className="p-2 bg-wa-msg-received rounded-lg"><File size={20} className="text-brand" /></div>
                                  <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">Arquivo {msg.mime_type?.split('/')[1]?.toUpperCase()}</p><p className="text-[10px] text-tertiary">Clique para baixar</p></div>
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`flex flex-col ${msg.from_me ? 'items-end' : 'items-start'}`}>
                            <p className="text-[15px] font-medium leading-relaxed text-[#111b21] drop-shadow-sm">
                              {renderMessageContent(msg.content)}
                            </p>
                            <div className={`flex items-center gap-1.5 text-[10px] mt-1 font-bold ${msg.from_me ? 'text-brand/70' : 'text-tertiary'}`}>
                              {formatTime(msg.timestamp)}
                              {msg.from_me && (
                                <div className="flex items-center">
                                  {msg.status === 'read' ? <CheckCheck size={14} className="text-[#53bdeb]" /> : msg.status === 'delivered' ? <CheckCheck size={14} /> : <Check size={14} />}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-2 bg-wa-sidebar border-t border-white/5 relative">
              {/* Overlay de Seleção em Massa */}
              {isSelectionMode && (
                <div className="absolute inset-0 bg-wa-sidebar z-20 flex items-center px-6 animate-slide-up border-t border-brand/20">
                  <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          setIsSelectionMode(false);
                          setSelectedMessageIds([]);
                        }}
                        className="p-2 text-text-secondary hover:bg-bg-hover rounded-full transition-colors"
                      >
                        <X size={20} />
                      </button>
                      <span className="text-sm font-semibold text-text-primary">
                        {selectedMessageIds.length} selecionadas
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => setSelectedMessageIds(messages.map(m => m.id))}
                         className="text-xs font-bold text-brand hover:underline px-3 py-2"
                       >
                         Selecionar Tudo
                       </button>
                       <button 
                         onClick={handleDeleteBulk}
                         disabled={selectedMessageIds.length === 0 || isDeleting}
                         className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 shadow-lg"
                       >
                         {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                         Excluir
                       </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-w-6xl mx-auto flex items-center gap-2 lg:px-10">
                <div className="flex items-center gap-1">
                  <button className="p-2.5 text-tertiary hover:text-text-primary transition-all">
                    <Smile size={24} />
                  </button>
                  <button className="p-2.5 text-tertiary hover:text-text-primary transition-all mr-1">
                    <Paperclip size={24} />
                  </button>
                </div>
                                <div className="flex-1 bg-white rounded-lg px-4 py-2.5 border border-white/5 shadow-sm transition-all">
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
              {formatDisplayJid(selectedChat.jid)}
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
