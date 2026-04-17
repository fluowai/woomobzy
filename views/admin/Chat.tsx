import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
}

interface Instance {
  id: string;
  name: string;
  phone_number: string;
  status: string;
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
  const { profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    fetchInstances();
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .eq('status', 'connected');

      if (error) throw error;
      setInstances(data || []);
      if (data?.length) {
        setSelectedInstance(data[0]);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async (instanceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/whatsapp/instances/${instanceId}/chats`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      console.log('📬 [Chat] Resposta da API de Chats:', data);
      if (data.success) {
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchMessages = async (instanceId: string, chatId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/whatsapp/instances/${instanceId}/chats/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      console.log('💬 [Chat] Resposta da API de Mensagens:', data);
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedInstance || !selectedChat || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/whatsapp/instances/${selectedInstance.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          jid: selectedChat.jid,
          text: newMessage.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        fetchMessages(selectedInstance.id, selectedChat.id);
      } else {
        alert(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (selectedInstance) {
      fetchChats(selectedInstance.id);
      startRealtime();
    }
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, [selectedInstance]);

  useEffect(() => {
    if (selectedInstance && selectedChat) {
      fetchMessages(selectedInstance.id, selectedChat.id);
    }
  }, [selectedInstance, selectedChat]);

  const startRealtime = () => {
    if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    console.log(`📡 [Chat] Iniciando Realtime para Instância: ${selectedInstance?.id}`);
    
    subscriptionRef.current = supabase
      .channel('whatsapp-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `instance_id=eq.${selectedInstance?.id}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        console.log('📩 [Chat] Nova mensagem recebida via Realtime:', newMsg);
        
        if (selectedChat && (newMsg as any).chat_id === selectedChat.id) {
          console.log('✅ [Chat] Mensagem pertence ao chat aberto, atualizando UI.');
          setMessages(prev => [...prev, newMsg]);
        } else {
          console.log('ℹ️ [Chat] Mensagem pertence a outro chat ou nenhum chat selecionado.');
        }
        
        if (selectedInstance) {
          console.log('🔄 [Chat] Atualizando lista de conversas...');
          fetchChats(selectedInstance.id);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `instance_id=eq.${selectedInstance?.id}`
      }, (payload) => {
        const updatedMsg = payload.new as Message;
        console.log('🆙 [Chat] Status de mensagem atualizado:', updatedMsg);
        
        if (selectedChat && (updatedMsg as any).chat_id === selectedChat.id) {
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_chats',
        filter: `instance_id=eq.${selectedInstance?.id}`
      }, (payload) => {
        console.log('🗂️ [Chat] Conversa atualizada:', payload.new);
        if (selectedInstance) fetchChats(selectedInstance.id);
      })
      .subscribe((status) => {
        console.log('📡 [Chat] Status da inscrição Realtime:', status);
      });
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.jid.includes(searchQuery)
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getStatusIcon = (status: string, fromMe: boolean) => {
    if (!fromMe) return null;
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Nenhuma instância conectada</h2>
        <p className="text-gray-500 mb-4">
          Conecte uma instância WhatsApp para começar a usar o chat
        </p>
        <a
          href="/whatsapp-instances"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Gerenciar Instâncias
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-100">
      {/* Chat List */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 bg-white border-r border-gray-200`}>
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 mb-3">Conversas</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                  selectedChat?.id === chat.id ? 'bg-green-50' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
                  {chat.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-800 truncate">{chat.name}</h3>
                    {chat.last_message_at && (
                      <span className="text-xs text-gray-500">
                        {formatTime(chat.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{chat.jid}</p>
                </div>
                {chat.unread_count > 0 && (
                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">{chat.unread_count}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
                {selectedChat.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800">{selectedChat.name}</h2>
                <p className="text-sm text-gray-500">{selectedChat.jid}</p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      msg.from_me
                        ? 'bg-green-600 text-white rounded-br-md'
                        : 'bg-white text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${msg.from_me ? 'justify-end text-green-100' : 'text-gray-500'}`}>
                      <span>{formatTime(msg.timestamp)}</span>
                      {getStatusIcon(msg.status, msg.from_me)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                  <Image className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                  <File className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:ring-2 focus:ring-green-500 outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50"
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="w-24 h-24 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              Selecione uma conversa
            </h2>
            <p className="text-gray-500">
              Escolha uma conversa na lista ao lado para começar
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
