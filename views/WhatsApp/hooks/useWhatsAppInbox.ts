import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from './useWebSocket';
import {
  instanceApi,
  chatApi,
  messageApi,
  accountApi,
  crmContactApi,
  isSupportedChat,
  normalizeMessagePreview,
  type Instance,
  type WhatsAppMediaStatusEvent,
  type WhatsAppMessageReceiptEvent,
} from './api';
import {
  type UnifiedChat,
  type UnifiedMessage,
  whatsappChatToUnified,
  sortUnifiedChats,
  deduplicateAndSortChats,
} from './unifiedInbox';
import { toast } from 'sonner';
import {
  resultTypeFromFile,
  isTenantContextError,
  getLatestChatActivityAt,
  hasRecentInstanceActivity,
  withVisualInstanceStatus,
  HISTORY_PERIOD_OPTIONS,
} from '../WhatsAppDashboard/constants';
import { logger } from '@/utils/logger';

export function useWhatsAppInbox(
  deepLinkInstanceId?: string | null,
  deepLinkChatId?: string | null,
  deepLinkChatJid?: string | null
) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(
    null
  );
  const [chats, setChats] = useState<UnifiedChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<UnifiedChat | null>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
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

  const { isConnected, on } = useWebSocket(webSocketEnabled);

  const crmContextSignature = useMemo(
    () =>
      chats
        .filter((chat) => chat.platform === 'whatsapp' && !chat.is_group)
        .map((chat) => String(chat.phone || '').replace(/\D/g, ''))
        .filter(Boolean)
        .sort()
        .join(','),
    [chats]
  );

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

  // Load chats when connected instances change
  const connectedInstanceIds = useMemo(
    () => instances.filter(i => i.status === 'connected').map(i => i.id).sort().join(','),
    [instances]
  );

  useEffect(() => {
    const connectedInstances = instances.filter(i => i.status === 'connected');
    if (connectedInstances.length > 0) {
      setSelectedChat(null);
      setMessages([]);
      loadChats(connectedInstances);
    } else {
      setChats((prev) => []);
    }
  }, [connectedInstanceIds]);

  useEffect(() => {
    if (!crmContextSignature) return;
    let active = true;
    const phones = crmContextSignature.split(',');
    crmContactApi
      .inboxContext(phones)
      .then(({ contacts }) => {
        if (!active) return;
        setChats((previous) =>
          previous.map((chat) => {
            const phone = String(chat.phone || '').replace(/\D/g, '');
            const context = contacts[phone];
            if (!context) return chat;
            return {
              ...chat,
              crm_lead_id: context.lead_id,
              crm_assigned_to: context.assigned_to,
              crm_is_mine: context.is_mine,
              crm_status: context.status,
              crm_classification: context.classification,
              crm_lead_score: context.lead_score,
              crm_tags: context.tags || [],
            };
          })
        );
      })
      .catch((error) => {
        logger.warn('Falha ao carregar contexto CRM da central', error);
      });
    return () => {
      active = false;
    };
  }, [crmContextSignature]);

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
      chatApi.markRead(selectedChat.id, selectedInstance.id).catch(() => {});
    } else {
      setMessages([]);
    }
    if (selectedChat) {
      loadMessages(selectedChat.id, selectedChat.instance_id);
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  // WebSocket event handlers
  useEffect(() => {
    if (!isConnected || !webSocketEnabled) return;

    const unsubMessage = on('new_message', (data: any) => {
      const { message, chat } = data;
      // Accept messages from any connected instance in this tenant
      noteInstanceActivity(message?.instance_id || chat?.instance_id);
      if (!isSupportedChat(chat)) return;

      const unifiedChat = whatsappChatToUnified({
        ...chat,
        last_message: normalizeMessagePreview(chat.last_message),
      });
      const unifiedMsg: UnifiedMessage = {
        ...message,
        platform: 'whatsapp',
        media_status: message.media_id ? 'ready' : undefined,
      };

      // Update chat list
      setChats((prev) => {
        const existing = prev.find((c) => c.id === chat.id);
        const unreadCount =
          selectedChat?.id === chat.id ? 0 : chat.unread_count;
        if (existing) {
          return deduplicateAndSortChats(
            prev.map((c) =>
              c.id === chat.id
                ? {
                    ...c,
                    ...unifiedChat,
                    last_message: normalizeMessagePreview(chat.last_message),
                    last_message_at: chat.last_message_at,
                    unread_count: unreadCount,
                  }
                : c
            )
          );
        } else {
          return deduplicateAndSortChats([
            {
              ...unifiedChat,
              unread_count: unreadCount,
              last_message: normalizeMessagePreview(chat.last_message),
            },
            ...prev,
          ]);
        }
      });

      // Add message to current conversation
      if (selectedChat && message.chat_id === selectedChat.id) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m.message_id === message.message_id))
            return prev;
          return [...prev, unifiedMsg];
        });

        // Mark as read since chat is open
        chatApi.markRead(selectedChat.id, selectedChat.instance_id).catch(() => {});
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
      noteInstanceActivity(data.instance_id);
      setHistoryImportStats((prev) => ({
        ...prev,
        importedMessages: prev.importedMessages + Number(data.messages || 0),
        importedChats: prev.importedChats + Number(data.chats || 0),
      }));
      toast.success(
        `Histórico importado: ${data.messages || 0} mensagens em ${data.chats || 0} conversas.`
      );
      loadChats(instances.filter(i => i.status === 'connected'));
      if (selectedChat?.instance_id === data.instance_id) {
        loadMessages(selectedChat.id, selectedChat.instance_id);
      }
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
    isConnected,
    webSocketEnabled,
    instances
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
      if (data.length > 0) {
        const linkedInstance = deepLinkInstanceId
          ? data.find((i) => i.id === deepLinkInstanceId)
          : null;
        const connected = data.find((i) => i.status === 'connected');
        const nextInstance = linkedInstance || connected || data[0];
        if (
          !selectedInstance ||
          nextInstance.id !== selectedInstance.id ||
          nextInstance.status === 'connected'
        ) {
          setSelectedInstance(nextInstance);
        }
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

  const loadChats = async (connectedInstances: Instance[]) => {
    try {
      const promises = connectedInstances.map(inst => chatApi.list(inst.id).catch(() => []));
      const results = await Promise.all(promises);
      const allChats = results.flat();

      const normalizedChats = allChats.filter(isSupportedChat).map((chat) =>
        whatsappChatToUnified({
          ...chat,
          last_message: normalizeMessagePreview(chat.last_message),
        })
      );
      setChats(deduplicateAndSortChats(normalizedChats));
      
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
      if (err?.status === 403) {
        toast.error(
          err.message ||
            'Sem permissao para carregar conversas desta instancia.'
        );
      }
      if (err?.message?.includes('WHATSAPP_UNAVAILABLE')) {
        setChats((prev) => []);
      }
    }
  };

  const loadMessages = async (chatId: string, instanceId: string) => {
    setLoadingMessages(true);
    try {
      const data = await messageApi.list(chatId, instanceId, 100);
      setMessages(
        (data.messages || []).map((m) => ({
          ...m,
          platform: 'whatsapp' as const,
        }))
      );
    } catch (err: any) {
      if (!err?.message?.includes('WHATSAPP_UNAVAILABLE')) {
        logger.error('Failed to load messages:', err);
      }
      if (err?.status === 403) {
        toast.error(
          err.message || 'Sem permissao para carregar mensagens desta conversa.'
        );
      }
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = useCallback(
    async (content: string, file?: File) => {
      if (!selectedChat) return;

      try {
        if (file) {
          const result: any = await messageApi.sendMedia(
            selectedChat.id,
            selectedChat.instance_id,
            file,
            content
          );
          const unifiedMsg: UnifiedMessage = {
            ...(result?.data || result),
            platform: 'whatsapp',
          };
          appendSentMessage(unifiedMsg);
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
            selectedChat.instance_id,
            content
          );
          const unifiedMsg: UnifiedMessage = {
            ...(result?.data || result),
            platform: 'whatsapp',
          };
          appendSentMessage(unifiedMsg);
          updateChatPreview(selectedChat.id, content);
        }
      } catch (err: any) {
        logger.error('Failed to send message:', err);
        toast.error(err?.message || 'Erro ao enviar mensagem.');
        throw err;
      }
    },
    [selectedChat]
  );

  const handleSelectChat = (chat: UnifiedChat) => {
    setSelectedChat(chat);
    // Clear unread on selection
    if (chat.unread_count && chat.unread_count > 0) {
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c))
      );
      chatApi.markRead(chat.id, chat.instance_id).catch(() => {});
    }
    loadMessages(chat.id, chat.instance_id);
  };

  const handleCreateConversation = async (phone: string, name?: string) => {
    const connectedInstances = instances.filter(i => i.status === 'connected');
    if (connectedInstances.length === 0) {
      throw new Error('Conecte ao menos uma instância do WhatsApp.');
    }
    const instanceId = connectedInstances[0].id;
    const created = await chatApi.ensureDirect(instanceId, {
      phone,
      name,
    });
    const unified = whatsappChatToUnified(created);
    setChats((previous) =>
      sortUnifiedChats([
        unified,
        ...previous.filter((chat) => chat.id !== unified.id),
      ])
    );
    handleSelectChat(unified);
    return unified;
  };

  const handleChatUpdated = (chat: UnifiedChat) => {
    setSelectedChat(chat);
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, ...chat } : c))
    );
  };

  const clearSelectedChat = useCallback(() => {
    setSelectedChat(null);
  }, []);

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
      toast.success(result.message || 'Importação iniciada.');
      await loadChats(instances.filter((i) => i.id === selectedInstance.id));
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

  const appendSentMessage = (message?: UnifiedMessage) => {
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

  return {
    instances: visualInstances,
    selectedInstance: visualSelectedInstance,
    setSelectedInstance,
    chats,
    filteredChats,
    selectedChat,
    handleSelectChat,
    handleCreateConversation,
    messages,
    loading,
    serviceUnavailable,
    serviceError,
    tenantContextError,
    isConnected,
    loadingMessages,
    searchQuery,
    setSearchQuery,
    importingHistory,
    historyPeriodDays,
    historyImportStats,
    deletingChats,
    recovering,
    handleRecoverOrg,
    loadInstances,
    handleSendMessage,
    handleChatUpdated,
    clearSelectedChat,
    handleImportHistory,
    handleHistoryPeriodChange,
    getHistoryPeriodLabel,
    handleDeleteAllChats,
    canImportHistory,
    canDeleteChats,
    instanceStatusOverrides,
  };
}
