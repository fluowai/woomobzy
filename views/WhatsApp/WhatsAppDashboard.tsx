import React, { useState } from 'react';
import {
  Bell,
  History,
  Loader2,
  MessageSquare,
  Plus,
  Smartphone,
  UserRound,
  WifiOff,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import InstanceManager from './InstanceManager';
import { NewConversationModal } from './NewConversationModal';
import { QueuesManagerModal } from './QueuesManagerModal';
import { useWhatsAppInbox } from './hooks/useWhatsAppInbox';
import { formatElapsed } from './WhatsAppDashboard/constants';
import {
  ServiceUnavailableScreen,
  TenantContextErrorScreen,
} from './WhatsAppDashboard/ErrorScreens';
import './whatsapp.css';
import './messages-center.css';

const WhatsAppDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
    instances,
    selectedInstance,
    setSelectedInstance,
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
    historyImportStats,
    recovering,
    handleRecoverOrg,
    loadInstances,
    handleSendMessage,
    handleChatUpdated,
    clearSelectedChat,
    handleImportHistory,
    canImportHistory,
    instanceStatusOverrides,
  } = useWhatsAppInbox(
    searchParams.get('instanceId'),
    searchParams.get('chatId'),
    searchParams.get('chatJid')
  );

  const [showInstanceManager, setShowInstanceManager] = useState(false);
  const [showQueuesManager, setShowQueuesManager] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const attentionCount = filteredChats.filter(
    (chat) => chat.unread_count > 0
  ).length;
  const connectedCount = instances.filter(
    (inst) => inst.status === 'connected'
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-text-secondary">
            Carregando central de mensagens...
          </p>
        </div>
      </div>
    );
  }

  if (serviceUnavailable) {
    return (
      <ServiceUnavailableScreen
        serviceError={serviceError}
        onRetry={loadInstances}
      />
    );
  }

  if (tenantContextError) {
    return (
      <TenantContextErrorScreen
        tenantContextError={tenantContextError}
        recovering={recovering}
        onRetry={loadInstances}
        onRecover={handleRecoverOrg}
      />
    );
  }

  return (
    <div
      className={`wa-dashboard wa-message-center ${selectedChat ? 'wa-chat-open' : ''}`}
      id="whatsapp-dashboard"
    >
      <header className="wa-header wa-center-header">
        <div className="wa-header-left">
          <div>
            <h1 className="wa-header-title">Central de mensagens</h1>
            <p>Atenda WhatsApp, Instagram e leads em tempo real.</p>
          </div>
        </div>

        <div className="wa-header-right">
          <span
            className={`wa-realtime-pill ${isConnected ? 'online' : 'offline'}`}
          >
            <i /> {isConnected ? 'Realtime' : 'Offline'}
          </span>

          <button
            type="button"
            className="wa-instance-selector wa-instance-button"
            onClick={() => setShowInstanceManager(true)}
            title="Gerenciar conexão do WhatsApp"
          >
            <Smartphone size={16} />
            <span>
              {connectedCount > 1
                ? `${connectedCount} WhatsApps conectados`
                : connectedCount === 1
                ? 'WhatsApp conectado'
                : 'Conectar WhatsApp'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleImportHistory}
            className="wa-import-btn"
            disabled={!canImportHistory || importingHistory}
            title="Importar histórico e organizar conversas no CRM"
          >
            {importingHistory ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <History size={17} />
            )}
            <span>Importar histórico</span>
          </button>

          <button
            type="button"
            className="wa-new-chat-btn"
            onClick={() => setShowNewConversation(true)}
          >
            <Plus size={18} /> Nova conversa
          </button>

          <button
            type="button"
            className={`wa-notification-btn ${attentionOnly ? 'active' : ''}`}
            onClick={() => setAttentionOnly((value) => !value)}
            title="Mostrar conversas aguardando resposta"
          >
            <Bell size={21} />
            {attentionCount > 0 && (
              <span>{attentionCount > 99 ? '99+' : attentionCount}</span>
            )}
          </button>

          {(importingHistory || historyImportStats.importedMessages > 0) && (
            <span className="wa-import-live" title="Progresso da importação">
              {formatElapsed(historyImportStats.elapsedSeconds)} ·{' '}
              {historyImportStats.importedMessages}
            </span>
          )}
        </div>
      </header>

      <div className="wa-main">
        <ChatSidebar
          chats={filteredChats}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          attentionOnly={attentionOnly}
          onOpenQueues={() => setShowQueuesManager(true)}
          onOpenInstances={() => setShowInstanceManager(true)}
        />

        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loadingMessages}
            instanceName={instances.find(i => i.id === selectedChat.instance_id)?.name || ''}
            instanceId={selectedChat.instance_id}
            onChatUpdated={handleChatUpdated}
            onBack={clearSelectedChat}
          />
        ) : (
          <div className="wa-empty-workspace">
            <div className="wa-empty-state">
              <div className="wa-empty-icon">
                <MessageSquare size={58} strokeWidth={1.2} />
              </div>
              <h2>Selecione uma conversa</h2>
              <p>
                As mensagens, o histórico e os dados do lead aparecerão aqui.
              </p>
              {connectedCount === 0 && (
                <button
                  className="wa-empty-warning"
                  onClick={() => setShowInstanceManager(true)}
                >
                  <WifiOff size={16} /> Conectar instância do WhatsApp
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showInstanceManager && (
        <InstanceManager
          instances={instances}
          statusOverrides={instanceStatusOverrides}
          onClose={() => {
            setShowInstanceManager(false);
            loadInstances();
          }}
          onInstanceCreated={loadInstances}
        />
      )}
      {showQueuesManager && (
        <QueuesManagerModal onClose={() => setShowQueuesManager(false)} />
      )}
      {showNewConversation && (
        <NewConversationModal
          onClose={() => setShowNewConversation(false)}
          onCreate={handleCreateConversation}
        />
      )}
    </div>
  );
};

export default WhatsAppDashboard;
