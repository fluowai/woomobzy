import React from 'react';
import { type Chat } from './hooks/api';
import { Search, Users, User, MessageCircle } from 'lucide-react';

interface ChatSidebarProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  selectedChat,
  onSelectChat,
  searchQuery,
  onSearchChange,
}) => {
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

      {/* Chat List */}
      <div className="wa-chat-list" id="chat-list">
        {chats.length === 0 ? (
          <div className="wa-no-chats">
            <MessageCircle size={32} strokeWidth={1} />
            <p>Nenhuma conversa</p>
            <span>As mensagens aparecerão aqui</span>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`wa-chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat)}
              id={`chat-${chat.id}`}
            >
              {/* Avatar */}
              <div
                className="wa-avatar"
                style={{ backgroundColor: getAvatarColor(chat.name) }}
              >
                {chat.is_group ? (
                  <Users size={18} color="white" />
                ) : (
                  <span className="wa-avatar-text">{getInitials(chat.name)}</span>
                )}
              </div>

              {/* Info */}
              <div className="wa-chat-info">
                <div className="wa-chat-top">
                  <span className="wa-chat-name">
                    {chat.is_group && <Users size={12} className="wa-group-icon" />}
                    {chat.name || 'Desconhecido'}
                  </span>
                  <span className="wa-chat-time">{formatTime(chat.last_message_at)}</span>
                </div>
                <div className="wa-chat-bottom">
                  <p className="wa-chat-preview">{chat.last_message || '...'}</p>
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
