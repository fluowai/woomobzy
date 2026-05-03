import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import './whatsapp.css';
import { useWebSocket } from './hooks/useWebSocket';
import { instanceApi, chatApi, messageApi, type Instance, type Chat, type Message } from './hooks/api';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import InstanceManager from './InstanceManager';
import { MessageSquare, Settings, Wifi, WifiOff, Smartphone } from 'lucide-react';

const WhatsAppDashboard: React.FC = () => {
  // State
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInstanceManager, setShowInstanceManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // WebSocket
  const { isConnected, on } = useWebSocket();

  // Load instances on mount
  useEffect(() => {
    loadInstances();
  }, []);

  // Load chats when instance changes
  useEffect(() => {
    if (selectedInstance) {
      loadChats(selectedInstance.id);
    } else {
      setChats([]);
    }
  }, [selectedInstance]);

  // Load messages when chat changes
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      // Mark as read
      chatApi.markRead(selectedChat.id).catch(() => {});
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  // WebSocket event handlers
  useEffect(() => {
    const unsubMessage = on('new_message', (data: any) => {
      const { message, chat } = data;

      // Update chat list
      setChats((prev) => {
        const existing = prev.find((c) => c.id === chat.id);
        if (existing) {
          return prev
            .map((c) =>
              c.id === chat.id
                ? { ...c, last_message: chat.last_message, last_message_at: chat.last_message_at, unread_count: chat.unread_count }
                : c
            )
            .sort((a, b) => {
              const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return dateB - dateA;
            });
        } else {
          return [chat, ...prev];
        }
      });

      // Add message to current conversation
      if (selectedChat && message.chat_id === selectedChat.id) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m.message_id === message.message_id)) return prev;
          return [...prev, message];
        });

        // Mark as read since chat is open
        chatApi.markRead(selectedChat.id).catch(() => {});
      }
    });

    const unsubStatus = on('instance_status', (data: any) => {
      setInstances((prev) =>
        prev.map((inst) =>
          inst.id === data.instance_id
            ? { ...inst, status: data.status, phone: data.phone || inst.phone }
            : inst
        )
      );
      // Update selected instance
      if (selectedInstance?.id === data.instance_id) {
        setSelectedInstance((prev) =>
          prev ? { ...prev, status: data.status, phone: data.phone || prev.phone } : prev
        );
      }
    });

    const unsubQR = on('qr_code', (data: any) => {
      setInstances((prev) =>
        prev.map((inst) =>
          inst.id === data.instance_id
            ? { ...inst, qr_code: data.qr_code, status: 'qr_pending' }
            : inst
        )
      );
    });

    return () => {
      unsubMessage();
      unsubStatus();
      unsubQR();
    };
  }, [on, selectedChat, selectedInstance]);

  const loadInstances = async () => {
    try {
      const data = await instanceApi.list();
      setInstances(data);
      if (data.length > 0 && !selectedInstance) {
        const connected = data.find((i) => i.status === 'connected');
        setSelectedInstance(connected || data[0]);
      }
    } catch (err) {
      logger.error('Failed to load instances:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async (instanceId: string) => {
    try {
      const data = await chatApi.list(instanceId);
      setChats(data || []);
    } catch (err) {
      logger.error('Failed to load chats:', err);
      setChats([]);
    }
  };

  const loadMessages = async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const data = await messageApi.list(chatId, 100);
      setMessages(data.messages || []);
    } catch (err) {
      logger.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedChat || !selectedInstance) return;
      try {
        await messageApi.send(selectedChat.id, selectedInstance.id, content);
      } catch (err) {
        logger.error('Failed to send message:', err);
      }
    },
    [selectedChat, selectedInstance]
  );

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    // Clear unread on selection
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c)));
  };

  const filteredChats = searchQuery
    ? chats.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
          <p className="text-text-secondary">Carregando WhatsApp...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wa-dashboard" id="whatsapp-dashboard">
      {/* Header Bar */}
      <header className="wa-header">
        <div className="wa-header-left">
          <MessageSquare size={20} className="text-[#25D366]" />
          <h1 className="wa-header-title">WhatsApp</h1>
          <span className={`wa-status-dot ${isConnected ? 'online' : 'offline'}`} />
          <span className="wa-status-text">
            {isConnected ? 'Realtime' : 'Offline'}
          </span>
        </div>

        <div className="wa-header-right">
          {/* Instance Selector */}
          <div className="wa-instance-selector">
            <Smartphone size={14} />
            <select
              value={selectedInstance?.id || ''}
              onChange={(e) => {
                const inst = instances.find((i) => i.id === e.target.value);
                if (inst) {
                  setSelectedInstance(inst);
                  setSelectedChat(null);
                }
              }}
              className="wa-instance-select"
            >
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} {inst.status === 'connected' ? '🟢' : '🔴'}
                </option>
              ))}
              {instances.length === 0 && <option value="">Nenhuma instância</option>}
            </select>
          </div>

          <button
            onClick={() => setShowInstanceManager(true)}
            className="wa-settings-btn"
            title="Gerenciar Instâncias"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="wa-main">
        {/* Sidebar */}
        <ChatSidebar
          chats={filteredChats}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Chat Window */}
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loadingMessages}
            instanceName={selectedInstance?.name || ''}
          />
        ) : (
          <div className="wa-empty-state">
            <div className="wa-empty-icon">
              <MessageSquare size={64} strokeWidth={1} />
            </div>
            <h2>WhatsApp Atendimento</h2>
            <p>Selecione uma conversa para começar</p>
            {selectedInstance?.status !== 'connected' && (
              <div className="wa-empty-warning">
                <WifiOff size={16} />
                <span>Instância desconectada. Vá em configurações para conectar.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instance Manager Modal */}
      {showInstanceManager && (
        <InstanceManager
          instances={instances}
          onClose={() => {
            setShowInstanceManager(false);
            loadInstances();
          }}
          onInstanceCreated={loadInstances}
        />
      )}
    </div>
  );
};

export default WhatsAppDashboard;
