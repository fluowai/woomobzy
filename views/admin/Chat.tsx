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
  PanelLeftClose,
  PanelRightClose,
  CheckSquare,
  Square,
  XCircle
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
  const [filterType, setFilterType] = useState<'private' | 'groups'>(
    'private'
  );
  const [error, setError] = useState<string | null>(null);
  
  // States para Redesign & Bulk Delete
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showInfoSidebar, setShowInfoSidebar] = useState(true);

  const { profile } = useAuth();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const instancesSubscriptionRef = useRef<any>(null);

  // ──────────────────────────────────────────────
  // Helpers
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
          const firstConnected = data.instances.find((i: Instance) => 
            (i.status === 'connected' || i.status === 'connecting') && i.socket_alive !== false
          );
          if (firstConnected) setSelectedInstance(firstConnected);
          else setSelectedInstance(data.instances[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching instances:', err);
      setError('Falha ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, selectedInstance]);

  const fetchChats = useCallback(async (instanceId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/whatsapp/instances/${instanceId}/chats`), { headers });
      const data = await response.json();
      if (data.success) setChats(data.chats || []);
    } catch (err) { console.error('Error fetching chats:', err); }
  }, [getAuthHeaders]);

  const fetchMessages = useCallback(async (instanceId: string, chatId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/whatsapp/instances/${instanceId}/chats/${chatId}/messages`), { headers });
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
        setTimeout(() => scrollToBottom('auto'), 100);
      }
    } catch (err) { console.error('Error fetching messages:', err); }
  }, [getAuthHeaders]);

  const startRealtime = useCallback((instanceId: string) => {
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    subscriptionRef.current = supabase.channel(`chat-realtime-${instanceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `instance_id=eq.${instanceId}` }, payload => {
        const newMsg = payload.new as Message;
        if (selectedChat && newMsg.chat_id === selectedChat.id) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          setTimeout(() => scrollToBottom(), 50);
        }
        fetchChats(instanceId);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages', filter: `instance_id=eq.${instanceId}` }, payload => {
        const updatedMsg = payload.new as Message;
        if (selectedChat && updatedMsg.chat_id === selectedChat.id) {
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_chats', filter: `instance_id=eq.${instanceId}` }, () => fetchChats(instanceId))
      .subscribe();
  }, [selectedChat, fetchChats]);

  useEffect(() => {
    fetchInstances();
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [profile?.organization_id]);

  useEffect(() => {
    if (selectedInstance) {
      fetchChats(selectedInstance.id);
      startRealtime(selectedInstance.id);
    }
  }, [selectedInstance]);

  useEffect(() => {
    if (selectedInstance && selectedChat) fetchMessages(selectedInstance.id, selectedChat.id);
  }, [selectedChat]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedInstance || !selectedChat || sending) return;
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/whatsapp/instances/${selectedInstance.id}/send`), {
        method: 'POST',
        headers,
        body: JSON.stringify({ jid: selectedChat.jid, text: newMessage.trim() })
      });
      const data = await response.json();
      if (data.success) setNewMessage('');
      else setError(data.error || 'Erro ao enviar');
    } catch (err) { setError('Erro de conexão'); } finally { setSending(false); }
  };

  const clearChat = async () => {
    if (!selectedChat || !window.confirm('Apagar todo o histórico?')) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/whatsapp/chats/${selectedChat.id}/messages`), { method: 'DELETE', headers });
      if ((await response.json()).success) setMessages([]);
    } catch (err) { setError('Erro ao limpar'); }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  };

  const deleteSelectedMessages = async () => {
    if (selectedIds.length === 0 || !window.confirm(`Excluir ${selectedIds.length} mensagens?`)) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/whatsapp/messages/bulk`), { method: 'DELETE', headers, body: JSON.stringify({ ids: selectedIds }) });
      if ((await response.json()).success) {
        setMessages(prev => prev.filter(m => !selectedIds.includes(m.id)));
        setSelectedIds([]);
        setIsSelectionMode(false);
      }
    } catch (err) { setError('Erro ao deletar'); }
  };

  const filteredChats = chats.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    (filterType === 'private' ? !chat.jid.endsWith('@g.us') : chat.jid.endsWith('@g.us'))
  );

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatJidToPhone = (jid: string) => `+${jid.split('@')[0].split(':')[0]}`;
  const getDisplayName = (chat: Chat) => chat.name && !chat.name.includes('@') && !chat.name.match(/^\d+$/) ? chat.name : formatJidToPhone(chat.jid);
  const getStatusIcon = (status: string, fromMe: boolean) => {
    if (!fromMe) return null;
    if (status === 'read') return <CheckCheck size={14} className="text-emerald-500" />;
    if (status === 'delivered') return <CheckCheck size={14} className="text-slate-400" />;
    return <Check size={14} className="text-slate-400" />;
  };

  if (loading) return <div className="flex flex-col items-center justify-center h-full bg-[#F8FAFC]"><Loader2 className="animate-spin text-emerald-600 mb-2" /><p className="text-[10px] font-black uppercase">Carregando 360 Hub...</p></div>;
  if (!instances.length) return <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#F8FAFC]"><div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6"><MessageSquare className="text-slate-200" size={40} /></div><Link to="/whatsapp-instances" className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg">Conectar WhatsApp</Link></div>;

  const isInstanceDead = selectedInstance?.socket_alive === false || (selectedInstance?.socket_alive == null && selectedInstance?.status !== 'connected');

  return (
    <div className="flex h-full bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <div className={`${selectedChat ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[350px] bg-white border-r border-slate-100`}>
        <div className="p-6">
          <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase mb-6">Mensagens</h1>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl outline-none text-sm font-medium" />
          </div>
          <div className="flex gap-2">
            {['private', 'groups'].map((type: any) => (
              <button key={type} onClick={() => setFilterType(type)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${filterType === type ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-400'}`}>
                {type === 'private' ? 'Privado' : 'Grupos'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {filteredChats.map(chat => (
            <button key={chat.id} onClick={() => setSelectedChat(chat)} className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${selectedChat?.id === chat.id ? 'bg-emerald-50 shadow-sm' : 'hover:bg-slate-50'}`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-lg border-2 border-white shadow-sm overflow-hidden">
                {chat.profile_photo_url ? <img src={chat.profile_photo_url} className="w-full h-full object-cover" /> : getDisplayName(chat).charAt(0)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-sm font-bold truncate text-slate-800">{getDisplayName(chat)}</span>
                  {chat.last_message_at && <span className="text-[10px] text-slate-400">{formatTime(chat.last_message_at)}</span>}
                </div>
                <p className="text-xs text-slate-500 truncate">{chat.jid.endsWith('@g.us') ? 'Grupo' : 'Privada'}</p>
              </div>
              {chat.unread_count > 0 && <span className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">{chat.unread_count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedChat ? 'hidden lg:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            <header className="h-[80px] px-8 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedChat(null)} className="lg:hidden p-2 text-slate-400"><ArrowLeft size={20} /></button>
                <div>
                  <h2 className="text-lg font-black text-slate-900 italic uppercase leading-none">{getDisplayName(selectedChat)}</h2>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatJidToPhone(selectedChat.jid)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }} className={`p-2.5 rounded-xl ${isSelectionMode ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}>
                  {isSelectionMode ? <XCircle size={20} /> : <CheckSquare size={20} />}
                </button>
                <button onClick={() => setShowInfoSidebar(!showInfoSidebar)} className={`p-2.5 rounded-xl ${showInfoSidebar ? 'bg-slate-100' : 'text-slate-400'}`}><Info size={20} /></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC] custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg, i) => {
                  const isSelected = selectedIds.includes(msg.id);
                  return (
                    <div key={msg.id} className={`flex group ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                      {isSelectionMode && (
                        <button onClick={() => toggleSelection(msg.id)} className={`mx-4 p-1 rounded-md border-2 ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                          {isSelected && <Check size={12} />}
                        </button>
                      )}
                      <div className={`max-w-[70%] px-5 py-3 rounded-3xl shadow-sm ${msg.from_me ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'} ${isSelected ? 'ring-4 ring-emerald-500/20' : ''}`}>
                        <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                        <div className="flex justify-end items-center gap-1.5 mt-1">
                          <span className="text-[9px] opacity-60 font-bold">{formatTime(msg.timestamp)}</span>
                          {getStatusIcon(msg.status, msg.from_me)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {isSelectionMode && selectedIds.length > 0 && (
              <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50">
                <span className="text-xs font-black uppercase tracking-widest">{selectedIds.length} selecionadas</span>
                <button onClick={deleteSelectedMessages} className="text-red-400 font-black uppercase text-xs">Excluir</button>
                <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="text-white/40 uppercase text-xs">Cancelar</button>
              </div>
            )}

            <div className="p-6 bg-white border-t border-slate-100">
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-full border border-slate-100">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="Escreva..." className="flex-1 bg-transparent px-4 py-2 outline-none text-sm font-medium" />
                <button onClick={sendMessage} disabled={!newMessage.trim() || sending} className={`p-3 rounded-full ${newMessage.trim() && !sending ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC]">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6"><MessageSquare className="text-emerald-500" size={32} /></div>
            <h2 className="text-xl font-black italic uppercase italic">Hub 360</h2>
            <p className="text-slate-500 text-sm text-center max-w-xs font-medium">Selecione uma conversa para começar.</p>
          </div>
        )}
      </div>

      {/* Info Sidebar */}
      {selectedChat && showInfoSidebar && (
        <div className="hidden xl:flex flex-col w-[350px] bg-white border-l border-slate-100 p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-4xl shadow-xl mb-6">{getDisplayName(selectedChat).charAt(0)}</div>
            <h4 className="text-xl font-black italic uppercase mb-1">{getDisplayName(selectedChat)}</h4>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{formatJidToPhone(selectedChat.jid)}</p>
            {selectedChat.lead_info?.classification && (
              <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">Lead: {selectedChat.lead_info.classification}</span>
            )}
          </div>
          <div className="mt-12 space-y-4">
            <button onClick={clearChat} className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-2xl text-slate-600 text-xs font-bold"><Trash2 size={16} /> Limpar Conversa</button>
            <button className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-2xl text-slate-600 text-xs font-bold"><User size={16} /> Ver no CRM</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
