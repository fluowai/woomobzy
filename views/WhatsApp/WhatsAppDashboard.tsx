import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './whatsapp.css';
import { useWebSocket } from './hooks/useWebSocket';
import {
  instanceApi,
  chatApi,
  messageApi,
  accountApi,
  isSupportedChat,
  normalizeMessagePreview,
  type Instance,
  type Chat,
  type Message,
  type WhatsAppMediaStatusEvent,
  type WhatsAppMessageReceiptEvent,
} from './hooks/api';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import InstanceManager from './InstanceManager';
import {
  MessageSquare,
  Settings,
  WifiOff,
  Smartphone,
  DownloadCloud,
  Loader2,
  Clock3,
  UserRound,
  ArrowRightLeft,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  HISTORY_PERIOD_OPTIONS,
  resultTypeFromFile,
  isTenantContextError,
  getLatestChatActivityAt,
  hasRecentInstanceActivity,
  withVisualInstanceStatus,
  formatElapsed,
} from './WhatsAppDashboard/constants';
import {
  ServiceUnavailableScreen,
  TenantContextErrorScreen,
} from './WhatsAppDashboard/ErrorScreens';

const WhatsAppDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const deepLinkInstanceId = searchParams.get('instanceId');
  const deepLinkChatId = searchParams.get('chatId');
  const deepLinkChatJid = searchParams.get('chatJid');
  // State
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(
    null
  );
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInstanceManager, setShowInstanceManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [tenantContextError, setTenantContextError] = useState('');
  const [webSocketEnabled, setWebSocketEnabled] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importingHistory, setImportingHistory] = useState(false);
  const [historyPeriodDays, setHistoryPeriodDays] = useState(60);
  const [historyImportStats, setHistoryImportStats] = useState({
    importedMessages: 0,
    importedChats: 0,
    requestedChats: 0,
    elapsedSeconds: 0,
    startedAt: 0,
  });
  const [deletingChats, setDeletingChats] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [instanceActivityAt, setInstanceActivityAt] = useState<
    Record<string, number>
  >({});

  // WebSocket
  const { isConnected, on } = useWebSocket(webSocketEnabled);

  const noteInstanceActivity = useCallback(
    (instanceId?: string, activityAt = Date.now()) => {
      if (!instanceId) return;
      setInstanceActivityAt((prev) => {
        if ((prev[instanceId] || 0) >= activityAt) return prev;
        return { ...prev, [instanceId]: activityAt };
      });
    },
    []
  );

  const clearInstanceActivity = useCallback((instanceId?: string) => {
    if (!instanceId) return;
    setInstanceActivityAt((prev) => {
      if (!prev[instanceId]) return prev;
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
  }, []);

  const latestSelectedChatActivityAt = useMemo(
    () => getLatestChatActivityAt(chats, selectedInstance?.id),
    [chats, selectedInstance?.id]
  );

  const visualInstances = useMemo(
    () =>
      instances.map((inst) =>
        withVisualInstanceStatus(
          inst,
          Boolean(instanceActivityAt[inst.id]) ||
            (inst.id === selectedInstance?.id &&
              hasRecentInstanceActivity(latestSelectedChatActivityAt))
        )
      ),
    [
      instances,
      instanceActivityAt,
      latestSelectedChatActivityAt,
      selectedInstance?.id,
    ]
  );

  const selectedInstanceHasActivity = Boolean(
    selectedInstance &&
    (instanceActivityAt[selectedInstance.id] ||
      hasRecentInstanceActivity(latestSelectedChatActivityAt))
  );
  const visualSelectedInstance = selectedInstance
    ? withVisualInstanceStatus(selectedInstance, selectedInstanceHasActivity)
    : null;

  const instanceStatusOverrides = useMemo(() => {
    const overrides: Record<string, Instance['status']> = {};
    visualInstances.forEach((inst) => {
      const raw = instances.find((item) => item.id === inst.id);
      if (raw && raw.status !== inst.status) overrides[inst.id] = inst.status;
    });
    return overrides;
  }, [instances, visualInstances]);

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

  useEffect(() => {
    const shouldTrackImport =
      historyImportStats.startedAt &&
      (importingHistory || historyImportStats.requestedChats > 0);
    if (!shouldTrackImport) return;

    const timer = window.setInterval(() => {
      setHistoryImportStats((prev) => ({
        ...prev,
        elapsedSeconds: Math.max(
          0,
          Math.floor((Date.now() - prev.startedAt) / 1000)
        ),
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    importingHistory,
    historyImportStats.requestedChats,
    historyImportStats.startedAt,
  ]);

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
      noteInstanceActivity(message?.instance_id || chat?.instance_id);
      if (!isSupportedChat(chat)) return;
      if (
        !selectedInstance ||
        chat.instance_id !== selectedInstance.id ||
        message.instance_id !== selectedInstance.id
      )
        return;

      // Update chat list
      setChats((prev) => {
        const existing = prev.find((c) => c.id === chat.id);
        const unreadCount =
          selectedChat?.id === chat.id ? 0 : chat.unread_count;
        if (existing) {
          return prev
            .map((c) =>
              c.id === chat.id
                ? {
                    ...c,
                    ...chat,
                    last_message: normalizeMessagePreview(chat.last_message),
                    last_message_at: chat.last_message_at,
                    unread_count: unreadCount,
                  }
                : c
            )
            .sort((a, b) => {
              const dateA = a.last_message_at
                ? new Date(a.last_message_at).getTime()
                : 0;
              const dateB = b.last_message_at
                ? new Date(b.last_message_at).getTime()
                : 0;
              return dateB - dateA;
            });
        } else {
          return [
            {
              ...chat,
              unread_count: unreadCount,
              last_message: normalizeMessagePreview(chat.last_message),
            },
            ...prev,
          ];
        }
      });

      // Add message to current conversation
      if (selectedChat && message.chat_id === selectedChat.id) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m.message_id === message.message_id))
            return prev;
          return [...prev, message];
        });

        // Mark as read since chat is open
        chatApi.markRead(selectedChat.id, selectedInstance.id).catch(() => {});
      }
    });

    const unsubStatus = on('instance_status', (data: any) => {
      if (data.status === 'connected') {
        noteInstanceActivity(data.instance_id);
      } else {
        clearInstanceActivity(data.instance_id);
      }
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
          prev
            ? { ...prev, status: data.status, phone: data.phone || prev.phone }
            : prev
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
      noteInstanceActivity(data.instance_id);
      setHistoryImportStats((prev) => ({
        ...prev,
        importedMessages: prev.importedMessages + Number(data.messages || 0),
        importedChats: prev.importedChats + Number(data.chats || 0),
      }));
      loadChats(selectedInstance.id);
      if (selectedChat?.instance_id === selectedInstance.id) {
        loadMessages(selectedChat.id, selectedInstance.id);
      }
      toast.success(
        `Histórico importado: ${data.messages || 0} mensagens em ${data.chats || 0} conversas.`
      );
    });

    const unsubMediaReady = on(
      'media_ready',
      (data: WhatsAppMediaStatusEvent) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === data.message_id
              ? {
                  ...message,
                  media_id: data.media_id || message.media_id,
                  media_status: 'ready',
                  media_url: data.url || message.media_url,
                  media_error: undefined,
                }
              : message
          )
        );
      }
    );

    const unsubMediaFailed = on(
      'media_failed',
      (data: WhatsAppMediaStatusEvent) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === data.message_id
              ? {
                  ...message,
                  media_id: data.media_id || message.media_id,
                  media_status: 'failed',
                  media_error: data.error || message.media_error,
                }
              : message
          )
        );
      }
    );

    const unsubReceipt = on(
      'message_receipt',
      (data: WhatsAppMessageReceiptEvent) => {
        noteInstanceActivity(data.instance_id);
        if (!selectedInstance || data.instance_id !== selectedInstance.id)
          return;
        const ids = new Set(data.message_ids || []);
        setMessages((prev) =>
          prev.map((message) =>
            ids.has(message.message_id)
              ? { ...message, delivery_status: data.status }
              : message
          )
        );
      }
    );

    return () => {
      unsubMessage();
      unsubStatus();
      unsubQR();
      unsubHistoryImported();
      unsubMediaReady();
      unsubMediaFailed();
      unsubReceipt();
    };
  }, [
    clearInstanceActivity,
    noteInstanceActivity,
    on,
    selectedChat,
    selectedInstance,
  ]);

  const handleRecoverOrg = async () => {
    setRecovering(true);
    try {
      const result = await accountApi.recoverOrg();
      toast.success(result.message);
      setTenantContextError('');
      setLoading(true);
      loadInstances();
    } catch (err: any) {
      if (err?.code === 'NO_ORG_FOUND') {
        toast.error(
          'Nenhuma organizacao encontrada para seu email. Crie uma conta em Onboarding.'
        );
      } else {
        toast.error(err?.message || 'Erro ao recuperar organizacao.');
      }
    } finally {
      setRecovering(false);
    }
  };

  const loadInstances = async () => {
    try {
      const data = await instanceApi.list();
      setInstances(data);
      setServiceUnavailable(false);
      setServiceError('');
      setTenantContextError('');
      setWebSocketEnabled(true);
      if (data.length > 0 && !selectedInstance) {
        const linkedInstance = deepLinkInstanceId
          ? data.find((i) => i.id === deepLinkInstanceId)
          : null;
        const connected = data.find((i) => i.status === 'connected');
        setSelectedInstance(linkedInstance || connected || data[0]);
      }
    } catch (err: any) {
      if (err?.message?.includes('WHATSAPP_UNAVAILABLE')) {
        setServiceUnavailable(true);
        setServiceError(err.message.replace('WHATSAPP_UNAVAILABLE: ', ''));
        setTenantContextError('');
        setWebSocketEnabled(false);
      } else if (isTenantContextError(err)) {
        setTenantContextError(
          err.message || 'Organizacao nao identificada para acessar o WhatsApp.'
        );
        setWebSocketEnabled(false);
      } else {
        logger.error('Failed to load instances:', err);
        if (err?.status === 403) {
          toast.error(
            err.message ||
              'Sua conta não possui uma organização válida para o WhatsApp.'
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async (instanceId: string) => {
    try {
      const data = await chatApi.list(instanceId);
      const normalizedChats = (data || [])
        .filter(isSupportedChat)
        .map((chat) => ({
          ...chat,
          last_message: normalizeMessagePreview(chat.last_message),
        }));
      setChats(normalizedChats);
      const linkedChat = normalizedChats.find(
        (chat) =>
          (deepLinkChatId && chat.id === deepLinkChatId) ||
          (deepLinkChatJid && chat.chat_jid === deepLinkChatJid)
      );
      if (linkedChat) setSelectedChat(linkedChat);
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
          const result: any = await messageApi.sendMedia(
            selectedChat.id,
            selectedInstance.id,
            file,
            content
          );
          appendSentMessage(result?.data || result);
          updateChatPreview(
            selectedChat.id,
            content || `[${resultTypeFromFile(file)}]`
          );
          if (result?.data?.media_status === 'failed') {
            toast.error(
              result?.data?.media_error ||
                'Midia enviada, mas nao foi salva no MinIO.'
            );
          } else {
            toast.success('Midia enviada.');
          }
        } else {
          const result: any = await messageApi.send(
            selectedChat.id,
            selectedInstance.id,
            content
          );
          appendSentMessage(result?.data || result);
          updateChatPreview(selectedChat.id, content);
        }
      } catch (err: any) {
        logger.error('Failed to send message:', err);
        toast.error(err?.message || 'Erro ao enviar mensagem.');
        throw err;
      }
    },
    [selectedChat, selectedInstance]
  );

  const handleSelectChat = (chat: Chat) => {
    if (selectedInstance && chat.instance_id !== selectedInstance.id) return;
    setSelectedChat(chat);
    // Clear unread on selection
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c))
    );
  };

  const handleChatUpdated = (chat: Chat) => {
    setSelectedChat(chat);
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, ...chat } : c))
    );
  };

  const handleImportHistory = async () => {
    if (!selectedInstance || importingHistory) return;

    setImportingHistory(true);
    setHistoryImportStats({
      importedMessages: 0,
      importedChats: 0,
      requestedChats: 0,
      elapsedSeconds: 0,
      startedAt: Date.now(),
    });
    try {
      const selectedPeriod =
        HISTORY_PERIOD_OPTIONS.find(
          (option) => option.value === historyPeriodDays
        ) || HISTORY_PERIOD_OPTIONS[2];
      const result = await instanceApi.importHistory(selectedInstance.id, {
        chat_limit: selectedPeriod.chatLimit,
        per_chat: selectedPeriod.perChat,
        since_days: selectedPeriod.value,
      });
      setHistoryImportStats((prev) => ({
        ...prev,
        requestedChats: result.requested || 0,
        importedMessages: result.imported_messages || prev.importedMessages,
        importedChats: result.imported_chats || prev.importedChats,
      }));
      toast.success(result.message || 'Importação e análise iniciadas.');
      await loadChats(selectedInstance.id);
    } catch (err: any) {
      logger.error('Failed to import WhatsApp history:', err);
      toast.error(err?.message || 'Erro ao importar conversas.');
    } finally {
      setImportingHistory(false);
    }
  };

  const handleHistoryPeriodChange = (value: number) => {
    if (importingHistory) return;
    setHistoryPeriodDays(value);
  };

  const getHistoryPeriodLabel = (value = historyPeriodDays) => {
    return (
      HISTORY_PERIOD_OPTIONS.find((option) => option.value === value)?.label ||
      '60 dias'
    );
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

  const canImportHistory = Boolean(
    visualSelectedInstance && visualSelectedInstance.status === 'connected'
  );
  const canDeleteChats = Boolean(selectedInstance);

  const filteredChats = searchQuery
    ? chats.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.display_name || '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (c.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.phone_display || '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          normalizeMessagePreview(c.last_message)
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : chats;

  const appendSentMessage = (message?: Message) => {
    if (!message) return;
    setMessages((prev) =>
      prev.some((item) => item.message_id === message.message_id)
        ? prev
        : [...prev, message]
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
          const dateA = a.last_message_at
            ? new Date(a.last_message_at).getTime()
            : 0;
          const dateB = b.last_message_at
            ? new Date(b.last_message_at).getTime()
            : 0;
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
      <ServiceUnavailableScreen
        serviceError={serviceError}
        onRetry={() => {
          setLoading(true);
          setServiceUnavailable(false);
          loadInstances();
        }}
      />
    );
  }

  if (tenantContextError) {
    return (
      <TenantContextErrorScreen
        tenantContextError={tenantContextError}
        recovering={recovering}
        onRetry={() => {
          setLoading(true);
          setTenantContextError('');
          loadInstances();
        }}
        onRecover={handleRecoverOrg}
      />
    );
  }

  return (
    <div
      className={`wa-dashboard ${selectedChat ? 'wa-chat-open' : ''}`}
      id="whatsapp-dashboard"
    >
      {/* Header Bar */}
      <header className="wa-header">
        <div className="wa-header-left">
          <MessageSquare size={20} className="text-[#25D366]" />
          <h1 className="wa-header-title">Mensagens</h1>
          <span
            className={`wa-status-dot ${isConnected ? 'online' : 'offline'}`}
          />
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
              {visualInstances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} {inst.status === 'connected' ? '🟢' : '🔴'}
                </option>
              ))}
              {instances.length === 0 && (
                <option value="">Nenhuma instância</option>
              )}
            </select>
          </div>

          <div
            className="wa-period-selector"
            title="Periodo do historico a importar"
          >
            <Clock3 size={14} />
            <select
              value={historyPeriodDays}
              onChange={(e) =>
                handleHistoryPeriodChange(Number(e.target.value))
              }
              className="wa-period-select"
              disabled={importingHistory}
            >
              {HISTORY_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleImportHistory}
            className="wa-import-btn"
            disabled={!canImportHistory || importingHistory}
            title="Importar conversas e organizar no CRM com IA"
          >
            {importingHistory ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <DownloadCloud size={16} />
            )}
            <span>Importar</span>
          </button>

          {(importingHistory ||
            historyImportStats.importedMessages > 0 ||
            historyImportStats.requestedChats > 0) && (
            <div className="wa-import-status" title="Progresso da importacao">
              <span>{formatElapsed(historyImportStats.elapsedSeconds)}</span>
              <strong>{historyImportStats.importedMessages}</strong>
            </div>
          )}

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
          historyPeriodDays={historyPeriodDays}
          historyPeriodOptions={HISTORY_PERIOD_OPTIONS}
          onHistoryPeriodChange={handleHistoryPeriodChange}
          historyImportStats={historyImportStats}
          historyPeriodLabel={getHistoryPeriodLabel()}
          formatImportElapsed={formatElapsed}
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
          <div className="wa-empty-workspace">
            <div className="wa-empty-state">
              <div className="wa-empty-icon">
                <MessageSquare size={64} strokeWidth={1} />
              </div>
              <h2>Mensagens</h2>
              <p>Selecione uma conversa para começar</p>
              {visualSelectedInstance &&
                visualSelectedInstance.status !== 'connected' && (
                  <div className="wa-empty-warning">
                    <WifiOff size={16} />
                    <span>
                      Instância desconectada. Vá em configurações para conectar.
                    </span>
                  </div>
                )}
            </div>

            <aside className="wa-empty-contact-panel">
              <div className="wa-contact-panel-head">
                <span>Atendimento</span>
              </div>
              <div className="wa-empty-contact-body">
                <div className="wa-empty-contact-avatar">
                  <UserRound size={28} />
                </div>
                <h3>Card do lead</h3>
                <p>
                  Ao clicar em uma conversa, este painel mostra contato, CRM,
                  tags, responsavel e acoes rapidas.
                </p>
              </div>
              <div className="wa-empty-actions-preview">
                <span>
                  <UserRound size={15} /> Editar/vincular lead
                </span>
                <span>
                  <ArrowRightLeft size={15} /> Transferir chat
                </span>
                <span>
                  <Tag size={15} /> Criar tag
                </span>
                <span>
                  <Clock3 size={15} /> Criar tarefa
                </span>
                <span>
                  <ShieldCheck size={15} /> Prioridade
                </span>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Instance Manager Modal */}
      {showInstanceManager && (
        <InstanceManager
          instances={visualInstances}
          statusOverrides={instanceStatusOverrides}
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
