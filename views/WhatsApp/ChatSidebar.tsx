import React, { useMemo, useState, useEffect } from 'react';
import {
  ChevronDown,
  Globe2,
  Inbox,
  ListFilter,
  MessageCircle,
  Search,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  TimerOff,
  UserMinus,
  Users,
} from 'lucide-react';

import { formatPhoneDisplay, getChatDisplayName } from './hooks/api';
import type { UnifiedChat } from './hooks/unifiedInbox';
import {
  filterInboxChats,
  formatSla,
  getInboxMetrics,
  isSlaOverdue,
  type InboxPlatformFilter,
  type InboxQueueFilter,
} from './inboxPresentation';

interface ChatSidebarProps {
  chats: UnifiedChat[];
  selectedChat: UnifiedChat | null;
  onSelectChat: (chat: UnifiedChat) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  attentionOnly: boolean;
  onOpenQueues: () => void;
  onOpenInstances: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  selectedChat,
  onSelectChat,
  searchQuery,
  onSearchChange,
  attentionOnly,
  onOpenQueues,
  onOpenInstances,
}) => {
  const [platform, setPlatform] = useState<InboxPlatformFilter>('all');
  const [queue, setQueue] = useState<InboxQueueFilter>('all');
  const [groups, setGroups] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [erroredAvatars, setErroredAvatars] = useState<Set<string>>(new Set());
  const [displayedChatsCount, setDisplayedChatsCount] = useState(50);
  const metrics = useMemo(() => getInboxMetrics(chats), [chats]);
  const visibleChats = useMemo(() => {
    const filtered = filterInboxChats(chats, {
      platform,
      queue,
      groups,
      attentionOnly,
    });
    return newestFirst ? filtered : [...filtered].reverse();
  }, [attentionOnly, chats, groups, newestFirst, platform, queue]);

  useEffect(() => {
    setDisplayedChatsCount(50);
  }, [searchQuery, platform, queue, groups, attentionOnly]);

  const resetFilters = () => {
    setPlatform('all');
    setQueue('all');
    setGroups(false);
    onSearchChange('');
    setDisplayedChatsCount(50);
  };

  return (
    <aside className="wa-sidebar wa-center-sidebar" id="chat-sidebar">
      <div className="wa-center-search-row">
        <label className="wa-search-input-wrapper" htmlFor="chat-search">
          <Search size={17} />
          <input
            id="chat-search"
            type="search"
            placeholder="Buscar conversas, contatos ou imóveis..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="wa-square-control"
          onClick={onOpenQueues}
          title="Configurar filas"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      <div className="wa-channel-tabs" role="tablist" aria-label="Canais">
        <ChannelTab
          active={platform === 'all'}
          onClick={() => setPlatform('all')}
          label="Todos"
        />
        <ChannelTab
          active={platform === 'whatsapp'}
          onClick={() => setPlatform('whatsapp')}
          label="WhatsApp"
          icon={<MessageCircle size={15} />}
        />
        <ChannelTab
          active={platform === 'instagram'}
          onClick={() => setPlatform('instagram')}
          label="Instagram"
          icon={<InstagramIcon />}
        />
        <ChannelTab
          active={platform === 'site'}
          onClick={() => setPlatform('site')}
          label="Site"
          icon={<Globe2 size={15} />}
        />
      </div>

      <div className="wa-queue-tabs">
        <QueueButton
          active={queue === 'mine'}
          onClick={() => setQueue(queue === 'mine' ? 'all' : 'mine')}
          icon={<Inbox size={14} />}
          label="Minha fila"
          count={metrics.mine}
        />
        <QueueButton
          active={queue === 'unassigned'}
          onClick={() =>
            setQueue(queue === 'unassigned' ? 'all' : 'unassigned')
          }
          icon={<UserMinus size={14} />}
          label="Sem responsável"
          count={metrics.unassigned}
        />
        <QueueButton
          active={queue === 'sla'}
          onClick={() => setQueue(queue === 'sla' ? 'all' : 'sla')}
          icon={<TimerOff size={14} />}
          label="SLA vencido"
          count={metrics.overdue}
        />
      </div>

      <div className="wa-inbox-metrics">
        <Metric value={metrics.conversations} label="conversas" />
        <Metric value={metrics.open} label="abertas" />
        <Metric value={metrics.awaiting} label="aguardando resposta" />
        <Metric value={metrics.overdue} label="SLA vencido" danger />
      </div>

      <div className="wa-inbox-toolbar">
        <button type="button" onClick={() => setNewestFirst((value) => !value)}>
          Ordenar: {newestFirst ? 'Mais recentes' : 'Mais antigas'}{' '}
          <ChevronDown size={14} />
        </button>
        <div>
          <button
            type="button"
            onClick={() => setGroups((value) => !value)}
            className={groups ? 'active' : ''}
            title="Alternar grupos"
          >
            <Users size={17} />
          </button>
          <button
            type="button"
            onClick={onOpenInstances}
            title="Gerenciar canais"
          >
            <Settings2 size={17} />
          </button>
          <ListFilter size={17} />
        </div>
      </div>

      <div className="wa-chat-list" id="chat-list">
        {visibleChats.length === 0 ? (
          <div className="wa-no-chats">
            <MessageCircle size={32} strokeWidth={1.2} />
            <p>Nenhuma conversa neste filtro</p>
            <button type="button" onClick={resetFilters}>
              Ver todas as conversas
            </button>
          </div>
        ) : (
          visibleChats.slice(0, displayedChatsCount).map((chat) => {
            const name = getChatName(chat);
            const overdue = isSlaOverdue(chat);
            return (
              <button
                type="button"
                key={chat.id}
                className={`wa-chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => onSelectChat(chat)}
                id={`chat-${chat.id}`}
              >
                <span
                  className="wa-avatar"
                  style={{ backgroundColor: avatarColor(name) }}
                >
                  {chat.avatar_url &&
                  !isWhatsAppCdnUrl(chat.avatar_url) &&
                  !erroredAvatars.has(chat.id) ? (
                    <img
                      src={chat.avatar_url}
                      alt=""
                      onError={() =>
                        setErroredAvatars((current) =>
                          new Set(current).add(chat.id)
                        )
                      }
                    />
                  ) : chat.is_group ? (
                    <Users size={18} />
                  ) : (
                    initials(name)
                  )}
                </span>

                <span className="wa-chat-info">
                  <span className="wa-chat-top">
                    <strong className="wa-chat-name">
                      {name}
                      <PlatformIcon platform={chat.platform} />
                    </strong>
                    <time>{formatTime(chat.last_message_at)}</time>
                  </span>
                  <span className="wa-chat-bottom">
                    <span className="wa-chat-preview">
                      {formatChatPreview(chat.last_message) ||
                        formatPhoneDisplay(chat.chat_jid) ||
                        'Sem mensagens'}
                    </span>
                    {chat.unread_count > 0 && (
                      <b className="wa-unread-badge">
                        {Math.min(chat.unread_count, 99)}
                      </b>
                    )}
                  </span>
                  <span className="wa-chat-meta-row">
                    <span className="wa-chat-tags">
                      {(chat.crm_tags || []).slice(0, 2).map((tag) => (
                        <i key={tag}>{tag}</i>
                      ))}
                      {!chat.crm_assigned_to && <i>Sem responsável</i>}
                    </span>
                    <em className={overdue ? 'danger' : ''}>
                      {formatSla(chat)}
                    </em>
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="wa-sidebar-footer">
        {visibleChats.length > displayedChatsCount && (
          <button
            type="button"
            className="wa-load-more"
            onClick={() => setDisplayedChatsCount((prev) => prev + 50)}
          >
            Carregar mais conversas <ChevronDown size={14} />
          </button>
        )}
        <button type="button" className="wa-view-all" onClick={resetFilters}>
          Ver todas as conversas
        </button>
      </div>
    </aside>
  );
};

function ChannelTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? 'active' : ''}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function QueueButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button type="button" className={active ? 'active' : ''} onClick={onClick}>
      {icon}
      <span>{label}</span>
      <b>{count}</b>
    </button>
  );
}

function Metric({
  value,
  label,
  danger = false,
}: {
  value: number;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className={danger ? 'danger' : ''}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PlatformIcon({ platform }: { platform: UnifiedChat['platform'] }) {
  return platform === 'instagram' ? (
    <InstagramIcon />
  ) : (
    <MessageCircle size={14} className="wa-platform-whatsapp-icon" />
  );
}

function InstagramIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function isWhatsAppCdnUrl(url?: string) {
  return Boolean(
    url &&
    (url.includes('pps.whatsapp.net') || url.includes('mmg.whatsapp.net'))
  );
}

function getChatName(chat: UnifiedChat) {
  if (chat.platform === 'instagram')
    return (
      chat.instagram_contact_full_name ||
      (chat.instagram_contact_username
        ? `@${chat.instagram_contact_username}`
        : 'Contato Instagram')
    );
  return (
    getChatDisplayName(chat) ||
    formatPhoneDisplay(chat.chat_jid) ||
    'Contato sem telefone'
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function avatarColor(name: string) {
  const colors = [
    '#128c67',
    '#0f7a5b',
    '#2775a9',
    '#9a5b28',
    '#7c4b9e',
    '#a8445d',
  ];
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatChatPreview(value?: string) {
  const clean = String(value || '').trim();
  const media: Record<string, string> = {
    '[image]': 'Imagem',
    '[audio]': 'Áudio',
    '[video]': 'Vídeo',
    '[document]': 'Documento',
    '[sticker]': 'Figurinha',
  };
  return media[clean.toLowerCase()] || clean;
}

export default ChatSidebar;
