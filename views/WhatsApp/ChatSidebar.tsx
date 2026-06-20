import React, { useState } from 'react';
import { formatPhoneDisplay, getChatDisplayName, type Chat } from './hooks/api';
import { Search, Users, MessageCircle, DownloadCloud, Loader2, Trash2, Clock3 } from 'lucide-react';

/** WhatsApp CDN profile-pic URLs expire and require WA session — never load in browser. */
function isWhatsAppCdnUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('pps.whatsapp.net') || url.includes('mmg.whatsapp.net');
}

interface ChatSidebarProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onImportHistory: () => void;
  importingHistory: boolean;
  canImportHistory: boolean;
  historyPeriodDays: number;
  historyPeriodOptions: Array<{ value: number; label: string }>;
  onHistoryPeriodChange: (value: number) => void;
  historyImportStats: {
    importedMessages: number;
    importedChats: number;
    requestedChats: number;
    elapsedSeconds: number;
  };
  historyPeriodLabel: string;
  formatImportElapsed: (seconds: number) => string;
  onDeleteAllChats: () => void;
  deletingChats: boolean;
  canDeleteChats: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  selectedChat,
  onSelectChat,
  searchQuery,
  onSearchChange,
  onImportHistory,
  importingHistory,
  canImportHistory,
  historyPeriodDays,
  historyPeriodOptions,
  onHistoryPeriodChange,
  historyImportStats,
  historyPeriodLabel,
  formatImportElapsed,
  onDeleteAllChats,
  deletingChats,
  canDeleteChats,
}) => {
  const [activeType, setActiveType] = React.useState<'direct' | 'group'>('direct');
  const [erroredAvatars, setErroredAvatars] = useState<Set<string>>(new Set());
  const visibleChats = chats.filter((chat) => (activeType === 'group' ? chat.is_group : !chat.is_group));

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      '#25D366', '#128C7E', '#075E54', '#34B7F1',
      '#00A884', '#D97706', '#7C3AED', '#DC2626',
      '#059669', '#0284C7', '#9333EA', '#E11D48',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getChatName = (chat: Chat) => {
    return getChatDisplayName(chat) || formatPhoneDisplay(chat.chat_jid) || 'Contato sem telefone';
  };

  return (
    <aside className="wa-sidebar" id="chat-sidebar">
      {/* Search */}
      <div className="wa-search">
        <div className="wa-search-input-wrapper">
          <Search size={16} className="wa-search-icon" />
          <input
            type="text"
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="wa-search-input"
            id="chat-search"
          />
        </div>
      </div>

      <div className="wa-chat-tabs">
        <button
          type="button"
          className={`wa-chat-tab ${activeType === 'direct' ? 'active' : ''}`}
          onClick={() => setActiveType('direct')}
        >
          Conversas
        </button>
        <button
          type="button"
          className={`wa-chat-tab ${activeType === 'group' ? 'active' : ''}`}
          onClick={() => setActiveType('group')}
        >
          Grupos
        </button>
      </div>

      <div className="wa-sidebar-actions">
        <div className="wa-history-controls">
          <label className="wa-history-period-label" htmlFor="wa-history-period">
            <Clock3 size={14} />
            <span>Periodo</span>
          </label>
          <select
            id="wa-history-period"
            className="wa-history-period-select"
            value={historyPeriodDays}
            onChange={(event) => onHistoryPeriodChange(Number(event.target.value))}
            disabled={importingHistory}
          >
            {historyPeriodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {(importingHistory || historyImportStats.importedMessages > 0 || historyImportStats.requestedChats > 0) && (
          <div className="wa-history-progress">
            <div>
              <span>Tempo</span>
              <strong>{formatImportElapsed(historyImportStats.elapsedSeconds)}</strong>
            </div>
            <div>
              <span>Mensagens</span>
              <strong>{historyImportStats.importedMessages}</strong>
            </div>
            <div>
              <span>Chats</span>
              <strong>{historyImportStats.importedChats}/{historyImportStats.requestedChats || '-'}</strong>
            </div>
          </div>
        )}
        <button
          type="button"
          className="wa-sidebar-import-btn"
          onClick={onImportHistory}
          disabled={!canImportHistory || importingHistory}
          title="Importar conversas do WhatsApp e organizar no CRM com IA"
        >
          {importingHistory ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
          <span>{importingHistory ? `Importando ${historyPeriodLabel}...` : `Importar ${historyPeriodLabel}`}</span>
        </button>
        <button
          type="button"
          className="wa-sidebar-clear-btn"
          onClick={onDeleteAllChats}
          disabled={!canDeleteChats || deletingChats}
          title="Excluir todas as conversas individuais, grupos e mensagens desta instancia"
        >
          {deletingChats ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          <span>{deletingChats ? 'Excluindo...' : 'Excluir todos os chats'}</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="wa-chat-list" id="chat-list">
        {visibleChats.length === 0 ? (
          <div className="wa-no-chats">
            <MessageCircle size={32} strokeWidth={1} />
            <p>Nenhuma {activeType === 'group' ? 'conversa em grupo' : 'conversa individual'}</p>
            <span>As mensagens aparecerão aqui</span>
          </div>
        ) : (
          visibleChats.map((chat) => (
            <div
              key={chat.id}
              className={`wa-chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat)}
              id={`chat-${chat.id}`}
            >
              {/* Avatar */}
              <div
                className="wa-avatar"
                style={{ backgroundColor: getAvatarColor(getChatName(chat)) }}
              >
                {chat.avatar_url && !isWhatsAppCdnUrl(chat.avatar_url) && !erroredAvatars.has(chat.id) ? (
                  <img
                    src={chat.avatar_url}
                    alt=""
                    className="wa-avatar-img"
                    onError={() => setErroredAvatars(prev => new Set(prev).add(chat.id))}
                  />
                ) : chat.is_group ? (
                  <Users size={18} color="white" />
                ) : (
                  <span className="wa-avatar-text">{getInitials(getChatName(chat))}</span>
                )}
              </div>

              {/* Info */}
              <div className="wa-chat-info">
                <div className="wa-chat-top">
                  <span className="wa-chat-name">
                    {chat.is_group && <Users size={12} className="wa-group-icon" />}
                    {getChatName(chat)}
                  </span>
                  <span className="wa-chat-time">{formatTime(chat.last_message_at)}</span>
                </div>
                <div className="wa-chat-bottom">
                  <p className="wa-chat-preview">{formatChatPreview(chat.last_message) || formatPhoneDisplay(chat.chat_jid) || '...'}</p>
                  {chat.unread_count > 0 && (
                    <span className="wa-unread-badge">{chat.unread_count > 99 ? '99+' : chat.unread_count}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;

function formatChatPreview(value?: string) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (/^\[(image|audio|video|document|sticker)\]$/i.test(clean)) return '';
  if (/^(imagem|audio|áudio|video|vídeo|pdf|documento)$/i.test(clean)) return '';
  return clean;
}
