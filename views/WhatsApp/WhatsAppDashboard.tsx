import React, { useState } from 'react';
import './whatsapp.css';
import { useWhatsAppInbox } from './hooks/useWhatsAppInbox';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import InstanceManager from './InstanceManager';
import { QueuesManagerModal } from './QueuesManagerModal';
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
  GitMerge,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  HISTORY_PERIOD_OPTIONS,
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

  const {
    instances,
    selectedInstance,
    setSelectedInstance,
    filteredChats,
    selectedChat,
    handleSelectChat,
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
  } = useWhatsAppInbox(
    deepLinkInstanceId,
    deepLinkChatId,
    deepLinkChatJid
  );

  const [showInstanceManager, setShowInstanceManager] = useState(false);
  const [showQueuesManager, setShowQueuesManager] = useState(false);

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
                  clearSelectedChat();
                }
              }}
              className="wa-instance-select"
            >
              {instances.map((inst) => (
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
            onClick={() => setShowQueuesManager(true)}
            className="wa-settings-btn"
            title="Filas de Atendimento"
          >
            <GitMerge size={18} />
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
            onBack={clearSelectedChat}
          />
        ) : (
          <div className="wa-empty-workspace">
            <div className="wa-empty-state">
              <div className="wa-empty-icon">
                <MessageSquare size={64} strokeWidth={1} />
              </div>
              <h2>Mensagens</h2>
              <p>Selecione uma conversa para começar</p>
              {selectedInstance && selectedInstance.status !== 'connected' && (
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
    </div>
  );
};

export default WhatsAppDashboard;
