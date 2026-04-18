import React, { useState, useEffect, useRef, useCallback } from 'react';
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
}

interface Message {
  id: string;
  content: string;
  from_me: boolean;
  status: string;
  timestamp: string;
  message_type: string;
  chat_id: string;
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
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const instancesSubscriptionRef = useRef<any>(null);

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────
  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { 
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // ──────────────────────────────────────────────
  // Fetch Data
  // ──────────────────────────────────────────────
  const fetchInstances = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/whatsapp/instances'), { headers });
      const data = await response.json();
      
      if (data.success) {
        console.log(`📱 [Chat] ${data.instances?.length || 0} instâncias encontradas na API.`);
        setInstances(data.instances || []);
        // Se não houver selecionado, pega o primeiro conectado e vivo
        if (!selectedInstance && data.instances?.length > 0) {
          const firstConnected = data.instances.find((i: Instance) => {
             console.log(`   - Verificando: ${i.name} (Status: ${i.status}, Alive: ${i.socket_alive})`);
             return i.status === 'connected' && i.socket_alive;
          });
          if (firstConnected) {
            console.log(`✅ [Chat] Selecionando automaticamente a instância: ${firstConnected.name}`);
            setSelectedInstance(firstConnected);
          } else {
            console.warn('⚠️ [Chat] Nenhuma instância conectada e viva encontrada. Selecionando a primeira da lista como fallback.');
            setSelectedInstance(data.instances[0]);
          }
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
      if (data.success) {
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
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
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [getAuthHeaders]);

  // ──────────────────────────────────────────────
  // Realtime Logic
  // ──────────────────────────────────────────────
  const startRealtime = useCallback((instanceId: string) => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    console.log(`📡 [Chat] Iniciando Realtime para: ${instanceId}`);
    
    subscriptionRef.current = supabase
      .channel(`chat-realtime-${instanceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `instance_id=eq.${instanceId}`
      }, (payload) => {
        console.log('📬 [Chat] NOVAL MENSAGEM VIA REALTIME:', payload.new);
        const newMsg = payload.new as Message;
        
        // Atualiza mensagens se for o chat aberto
        if (selectedChat && newMsg.chat_id === selectedChat.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            console.log('✨ [Chat] Inserindo nova mensagem no estado UI');
            return [...prev, newMsg];
          });
          setTimeout(() => scrollToBottom(), 50);
        }
        
        // Sempre atualiza a lista de chats para mostrar o preview/timestamp correto
        fetchChats(instanceId);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `instance_id=eq.${instanceId}`
      }, (payload) => {
        console.log('🔄 [Chat] MENSAGEM ATUALIZADA (Status):', payload.new);
        const updatedMsg = payload.new as Message;
        if (selectedChat && updatedMsg.chat_id === selectedChat.id) {
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_chats',
        filter: `instance_id=eq.${instanceId}`
      }, () => {
        fetchChats(instanceId);
      })
      .subscribe();
  }, [selectedChat, fetchChats]);

  // Monitora status das instâncias para avisar se cair
  const subscribeToInstanceChanges = useCallback(() => {
    if (!profile?.organization_id) return;
    
    if (instancesSubscriptionRef.current) {
      supabase.removeChannel(instancesSubscriptionRef.current);
    }

    instancesSubscriptionRef.current = supabase
      .channel('chat-instances-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_instances',
        filter: `organization_id=eq.${profile.organization_id}`
      }, (payload) => {
        const updated = payload.new as Instance;
        // Atualiza na lista de instâncias
        setInstances(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
        
        // Se a instância selecionada foi afetada, atualizamos nosso estado
        if (selectedInstance?.id === updated.id) {
          fetchInstances(); // Pega o status real via API (socket_alive)
        }
      })
      .subscribe();
  }, [profile?.organization_id, selectedInstance, fetchInstances]);

  // ──────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────
  useEffect(() => {
    fetchInstances();
    subscribeToInstanceChanges();
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (instancesSubscriptionRef.current) supabase.removeChannel(instancesSubscriptionRef.current);
    };
  }, [profile?.organization_id]);

  useEffect(() => {
    if (selectedInstance) {
      fetchChats(selectedInstance.id);
      startRealtime(selectedInstance.id);
    }
  }, [selectedInstance, startRealtime, fetchChats]);

  useEffect(() => {
    if (selectedInstance && selectedChat) {
      fetchMessages(selectedInstance.id, selectedChat.id);
    }
  }, [selectedInstance, selectedChat, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ──────────────────────────────────────────────
  // Actions
  // ──────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedInstance || !selectedChat || sending) return;

    if (!selectedInstance.socket_alive) {
      setError('Instância desconectada. Aguarde a reconexão.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/whatsapp/instances/${selectedInstance.id}/send`), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jid: selectedChat.jid,
          text: newMessage.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
      } else {
        setError(data.error || 'Erro ao enviar');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Erro de conexão ao enviar');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSending(false);
    }
  };

  // ──────────────────────────────────────────────
  // UI Helpers
  // ──────────────────────────────────────────────
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.jid.includes(searchQuery)
  );

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string, fromMe: boolean) => {
    if (!fromMe) return null;
    switch (status) {
      case 'sent': return <Check className="w-3.5 h-3.5 text-gray-400" />;
      case 'delivered': return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
      case 'read': return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
      default: return <Check className="w-3.5 h-3.5 text-gray-300" />;
    }
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-green-600 mb-2" />
        <p className="text-gray-500 font-medium">Carregando mensagens...</p>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
        <div className="p-6 bg-white rounded-3xl shadow-sm mb-6">
          <MessageSquare className="w-20 h-20 text-gray-200" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Sem conexão WhatsApp</h2>
        <p className="text-gray-500 max-w-md mb-8">
          Você precisa conectar pelo menos uma instância de WhatsApp para começar a conversar.
        </p>
        <a
          href="/whatsapp-instances"
          className="px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-green-200"
        >
          Configurar WhatsApp
        </a>
      </div>
    );
  }

  const isInstanceDead = selectedInstance?.status !== 'connected' || selectedInstance?.socket_alive === false;

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar de Chats */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-gray-100`}>
        {/* Header da Sidebar */}
        <div className="p-4 bg-white border-b border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Conversas</h1>
            <div className="relative group">
               <select 
                title="Escolha uma Instância"
                value={selectedInstance?.id || ''}
                onChange={(e) => {
                  const inst = instances.find(i => i.id === e.target.value);
                  if (inst) setSelectedInstance(inst);
                }}
                className="appearance-none bg-gray-100 border-none rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 pr-8 cursor-pointer hover:bg-gray-200 transition-colors"
               >
                 {instances.map(inst => (
                   <option key={inst.id} value={inst.id}>
                     {inst.name} {inst.status !== 'connected' ? '(Offline)' : ''}
                   </option>
                 ))}
               </select>
               <Smartphone className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar pessoas ou grupos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:border-green-500/30 focus:bg-white focus:ring-4 focus:ring-green-500/5 rounded-2xl outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Lista de Chats */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-gray-400 text-sm font-medium">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`flex items-center gap-3.5 p-4 mx-2 my-1 rounded-2xl cursor-pointer transition-all duration-200 group ${
                  selectedChat?.id === chat.id 
                    ? 'bg-green-50' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                  chat.jid.endsWith('@g.us') ? 'bg-indigo-500' : 'bg-green-500'
                }`}>
                  {chat.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-bold truncate text-sm ${
                      selectedChat?.id === chat.id ? 'text-green-900' : 'text-gray-800'
                    }`}>
                      {chat.name}
                    </h3>
                    {chat.last_message_at && (
                      <span className="text-[10px] font-bold text-gray-400">
                        {formatTime(chat.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate font-medium">
                    {chat.jid.endsWith('@g.us') ? 'Grupo' : 'Mensagem Privada'}
                  </p>
                </div>
                {chat.unread_count > 0 && (
                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-100">
                    <span className="text-[10px] font-black text-white">{chat.unread_count}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className={`${!selectedChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-gray-50 relative`}>
        {selectedChat ? (
          <>
            {/* Header do Chat */}
            <div className="flex items-center gap-4 p-4 bg-white border-b border-gray-100 shadow-sm z-10">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                selectedChat.jid.endsWith('@g.us') ? 'bg-indigo-500' : 'bg-green-500'
              }`}>
                {selectedChat.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-extrabold text-gray-900 text-base leading-tight">{selectedChat.name}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${isInstanceDead ? 'bg-gray-300' : 'bg-emerald-500'}`} />
                  <p className="text-[11px] font-bold text-gray-400 tracking-wide uppercase">
                    {isInstanceDead ? 'Instância Offline' : 'WhatsApp Online'}
                  </p>
                </div>
              </div>
              <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all" title="Mais Opções">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Balão de Alerta de Conexão */}
            {isInstanceDead && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-max max-w-[90%]">
                <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
                  <div className="p-1.5 bg-amber-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-800">Conexão em espera</p>
                    <p className="text-[10px] text-amber-600 font-medium">Reconectando automaticamente com o servidor...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Listagem de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar pattern-bg">
              {messages.map((msg, idx) => {
                const prevMsg = messages[idx - 1];
                const showAvatar = !msg.from_me && (!prevMsg || prevMsg.from_me || (prevMsg as any).metadata?.pushName !== (msg as any).metadata?.pushName);

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${msg.from_me ? 'justify-end' : 'justify-start'}`}
                  >
                    {!msg.from_me && selectedChat.jid.endsWith('@g.us') && showAvatar && (
                       <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0 shadow-sm">
                         {(msg as any).metadata?.pushName?.charAt(0) || '?'}
                       </div>
                    )}
                    <div
                      className={`max-w-[80%] md:max-w-[70%] px-4 py-2 shadow-sm ${
                        msg.from_me
                          ? 'bg-green-600 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100'
                      }`}
                    >
                      {!msg.from_me && selectedChat.jid.endsWith('@g.us') && showAvatar && (
                        <span className="block text-[10px] font-black text-indigo-500 mb-1 tracking-tighter uppercase">
                          {(msg as any).metadata?.pushName || 'Participante'}
                        </span>
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed">
                        {msg.content}
                      </p>
                      <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] font-bold ${
                        msg.from_me ? 'justify-end text-green-100' : 'text-gray-400'
                      }`}>
                        <span>{formatTime(msg.timestamp)}</span>
                        {getStatusIcon(msg.status, msg.from_me)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 bg-white border-t border-gray-100">
               {error && (
                 <div className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-xl">
                      {error}
                    </div>
                 </div>
               )}
              <div className="flex items-center gap-2 max-w-5xl mx-auto">
                <button className="p-3 text-gray-400 hover:bg-gray-50 rounded-2xl transition-all" title="Anexar Imagem">
                  <Image className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    disabled={isInstanceDead}
                    placeholder={isInstanceDead ? "Aguardando conexão..." : "Escreva sua mensagem aqui..."}
                    className="w-full px-5 py-3.5 bg-gray-100 border-none focus:bg-white focus:ring-4 focus:ring-green-500/10 rounded-3xl outline-none transition-all text-sm font-medium"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending || isInstanceDead}
                  className="p-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-green-200"
                  title="Enviar Mensagem"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/50">
            <div className="w-24 h-24 bg-white rounded-[40px] shadow-xl shadow-gray-200/50 flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-green-50 rounded-[30px] flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">Bem-vindo ao Chat</h2>
            <p className="text-gray-500 max-w-sm font-medium text-base leading-relaxed">
              Dê um passo à frente na sua comunicação imobiliária. Selecione um contato à esquerda e comece a fechar negócios.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 20px; }
        .pattern-bg {
          background-image: 
            radial-gradient(#E5E7EB 0.5px, transparent 0.5px),
            radial-gradient(#E5E7EB 0.5px, transparent 0.5px);
          background-size: 20px 20px;
          background-position: 0 0, 10px 10px;
        }
      `}</style>
    </div>
  );
};

export default Chat;
