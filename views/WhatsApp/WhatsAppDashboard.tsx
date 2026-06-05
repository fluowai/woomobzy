import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import './whatsapp.css';
import { useWebSocket } from './hooks/useWebSocket';
import {
  instanceApi,
  chatApi,
  messageApi,
  isSupportedChat,
  normalizeMessagePreview,
  type Instance,
  type Chat,
  type Message,
} from './hooks/api';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import InstanceManager from './InstanceManager';
import { MessageSquare, Settings, Wifi, WifiOff, Smartphone, DownloadCloud, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const WhatsAppDashboard: React.FC = () => {
  // State
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInstanceManager, setShowInstanceManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [webSocketEnabled, setWebSocketEnabled] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importingHistory, setImportingHistory] = useState(false);
  const [deletingChats, setDeletingChats] = useState(false);

  // WebSocket
  const { isConnected, on } = useWebSocket(webSocketEnabled);

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
    if (selectedChat && selectedInstance) {
      setMessages([]);
      loadMessages(selectedChat.id, selectedInstance.id);
      // Mark as read
      chatApi.markRead(selectedChat.id, selectedInstance.id).catch(() => {});
    } else {
      setMessages([]);
    }
  }, [selectedChat, selectedInstance]);

  // WebSocket event handlers
  useEffect(() => {
    const unsubMessage = on('new_message', (data: any) => {
      const { message, chat } = data;
      if (!isSupportedChat(chat)) return;
      if (!selectedInstance || chat.instance_id !== selectedInstance.id || message.instance_id !== selectedInstance.id) return;

      // Update chat list
      setChats((prev) => {
        const existing = prev.find((c) => c.id === chat.id);
        if (existing) {
          return prev
            .map((c) =>
              c.id === chat.id
                ? {
                    ...c,
                    last_message: normalizeMessagePreview(chat.last_message),
                    last_message_at: chat.last_message_at,
                    unread_count: chat.unread_count,
                  }
                : c
            )
            .sort((a, b) => {
              const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return dateB - dateA;
            });
        } else {
          return [{ ...chat, last_message: normalizeMessagePreview(chat.last_message) }, ...prev];
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
        chatApi.markRead(selectedChat.id, selectedInstance.id).catch(() => {});
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

    const unsubHistoryImported = on('history_imported', (data: any) => {
      if (!selectedInstance || data.instance_id !== selectedInstance.id) return;
      loadChats(selectedInstance.id);
      toast.success(`Histórico importado: ${data.messages || 0} mensagens em ${data.chats || 0} conversas.`);
    });

    return () => {
      unsubMessage();
      unsubStatus();
      unsubQR();
      unsubHistoryImported();
    };
  }, [on, selectedChat, selectedInstance]);

  const loadInstances = async () => {
    try {
      const data = await instanceApi.list();
      setInstances(data);
      setServiceUnavailable(false);
      setServiceError('');
      setWebSocketEnabled(true);
      if (data.length > 0 && !selectedInstance) {
        const connected = data.find((i) => i.status === 'connected');
        setSelectedInstance(connected || data[0]);
      }
    } catch (err: any) {
      if (err?.message?.includes('WHATSAPP_UNAVAILABLE')) {
        setServiceUnavailable(true);
        setServiceError(err.message.replace('WHATSAPP_UNAVAILABLE: ', ''));
        setWebSocketEnabled(false);
      } else {
        logger.error('Failed to load instances:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async (instanceId: string) => {
    try {
      const data = await chatApi.list(instanceId);
      setChats((data || []).filter(isSupportedChat).map((chat) => ({
        ...chat,
        last_message: normalizeMessagePreview(chat.last_message),
      })));
    } catch (err: any) {
      if (!err?.message?.includes('WHATSAPP_UNAVAILABLE')) {
        logger.error('Failed to load chats:', err);
      }
      setChats([]);
    }
  };

  const loadMessages = async (chatId: string, instanceId: string) => {
    setLoadingMessages(true);
    try {
      const data = await messageApi.list(chatId, instanceId, 100);
      setMessages(data.messages || []);
    } catch (err: any) {
      if (!err?.message?.includes('WHATSAPP_UNAVAILABLE')) {
        logger.error('Failed to load messages:', err);
      }
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = useCallback(
    async (content: string, file?: File) => {
      if (!selectedChat || !selectedInstance) return;
      try {
        if (file) {
          const result: any = await messageApi.sendMedia(selectedChat.id, selectedInstance.id, file, content);
          appendSentMessage(result?.data);
          updateChatPreview(selectedChat.id, content || `[${resultTypeFromFile(file)}]`);
        } else {
          const result: any = await messageApi.send(selectedChat.id, selectedInstance.id, content);
          appendSentMessage(result?.data);
          updateChatPreview(selectedChat.id, content);
        }
      } catch (err) {
        logger.error('Failed to send message:', err);
      }
    },
    [selectedChat, selectedInstance]
  );

  const handleSelectChat = (chat: Chat) => {
    if (selectedInstance && chat.instance_id !== selectedInstance.id) return;
    setSelectedChat(chat);
    // Clear unread on selection
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c)));
  };

  const handleChatUpdated = (chat: Chat) => {
    setSelectedChat(chat);
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, ...chat } : c)));
  };

  const handleImportHistory = async () => {
    if (!selectedInstance || importingHistory) return;

    setImportingHistory(true);
    try {
      const result = await instanceApi.importHistory(selectedInstance.id, {
        chat_limit: 100,
        per_chat: 50,
      });
      toast.success(result.message || 'Importação e análise iniciadas.');
      await loadChats(selectedInstance.id);
    } catch (err: any) {
      logger.error('Failed to import WhatsApp history:', err);
      toast.error(err?.message || 'Erro ao importar conversas.');
    } finally {
      setImportingHistory(false);
    }
  };

  const handleDeleteAllChats = async () => {
    if (!selectedInstance || deletingChats) return;

    const confirmed = window.confirm(
      'Excluir todas as conversas desta instancia? Isso remove conversas individuais, grupos e mensagens importadas do banco. Depois voce pode importar tudo novamente.'
    );
    if (!confirmed) return;

    setDeletingChats(true);
    try {
      const result = await chatApi.deleteAll(selectedInstance.id);
      setSelectedChat(null);
      setMessages([]);
      setChats([]);
      toast.success(
        `Limpeza concluida: ${result.deleted_chats} chats e ${result.deleted_messages} mensagens removidos.`
      );
    } catch (err: any) {
      logger.error('Failed to delete WhatsApp chats:', err);
      toast.error(err?.message || 'Erro ao excluir conversas.');
    } finally {
      setDeletingChats(false);
    }
  };

  const canImportHistory = Boolean(selectedInstance && selectedInstance.status === 'connected');
  const canDeleteChats = Boolean(selectedInstance);

  const filteredChats = searchQuery
    ? chats.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          normalizeMessagePreview(c.last_message).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  const appendSentMessage = (message?: Message) => {
    if (!message) return;
    setMessages((prev) =>
      prev.some((item) => item.message_id === message.message_id) ? prev : [...prev, message]
    );
  };

  const updateChatPreview = (chatId: string, preview: string) => {
    setChats((prev) =>
      prev
        .map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                last_message: normalizeMessagePreview(preview),
                last_message_at: new Date().toISOString(),
              }
            : chat
        )
        .sort((a, b) => {
          const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return dateB - dateA;
        })
    );
  };

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

  if (serviceUnavailable) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-6">
            <WifiOff size={48} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">WhatsApp Indisponível</h2>
          <p className="text-text-secondary mb-6 leading-relaxed">
            O painel não conseguiu consultar a API do WhatsApp. Verifique se o backend Node.js está online e se o proxy /api/whatsapp está chegando no servidor.
          </p>
          <div className="bg-bg-hover rounded-xl p-4 text-left text-sm text-text-secondary border border-border mb-6">
            <p className="font-semibold text-text-primary mb-2">Checklist da conexão:</p>
            <ul className="space-y-1.5">
              <li>✅ Frontend chamando /api/whatsapp pelo mesmo domínio</li>
              <li>✅ Backend Node.js online na Railway</li>
              <li>✅ WhatsMeow (Go) rodando internamente em 127.0.0.1:3100</li>
            </ul>
            {serviceError && (
              <p className="mt-3 rounded-lg bg-white/70 border border-border px-3 py-2 text-xs break-words">
                {serviceError}
              </p>
            )}
          </div>
          <button
            onClick={() => { setLoading(true); setServiceUnavailable(false); loadInstances(); }}
            className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`wa-dashboard ${selectedChat ? 'wa-chat-open' : ''}`} id="whatsapp-dashboard">
      {/* Header Bar */}
      <header className="wa-header">
        <div className="wa-header-left">
          <MessageSquare size={20} className="text-[#25D366]" />
          <h1 className="wa-header-title">Mensagens</h1>
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
            onClick={handleImportHistory}
            className="wa-import-btn"
            disabled={!canImportHistory || importingHistory}
            title="Importar conversas e organizar no CRM com IA"
          >
            {importingHistory ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
            <span>Importar</span>
          </button>

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
          onImportHistory={handleImportHistory}
          importingHistory={importingHistory}
          canImportHistory={canImportHistory}
          onDeleteAllChats={handleDeleteAllChats}
          deletingChats={deletingChats}
          canDeleteChats={canDeleteChats}
        />

        {/* Chat Window */}
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loadingMessages}
            instanceName={selectedInstance?.name || ''}
            instanceId={selectedInstance?.id || ''}
            onChatUpdated={handleChatUpdated}
            onBack={() => setSelectedChat(null)}
          />
        ) : (
          <div className="wa-empty-state">
            <div className="wa-empty-icon">
              <MessageSquare size={64} strokeWidth={1} />
            </div>
            <h2>Mensagens</h2>
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

function resultTypeFromFile(file: File): string {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}

export default WhatsAppDashboard;
