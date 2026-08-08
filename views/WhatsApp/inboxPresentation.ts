import type { UnifiedChat } from './hooks/unifiedInbox';

export type InboxPlatformFilter = 'all' | 'whatsapp' | 'instagram' | 'site';
export type InboxQueueFilter = 'all' | 'mine' | 'unassigned' | 'sla';

export const SLA_LIMIT_MINUTES = 30;

export function minutesSince(date?: string | null, now = Date.now()): number {
  if (!date) return 0;
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor((now - timestamp) / 60_000));
}

export function isAwaitingResponse(chat: UnifiedChat): boolean {
  return chat.unread_count > 0;
}

export function isSlaOverdue(chat: UnifiedChat, now = Date.now()): boolean {
  return (
    isAwaitingResponse(chat) &&
    minutesSince(chat.last_message_at, now) > SLA_LIMIT_MINUTES
  );
}

export function filterInboxChats(
  chats: UnifiedChat[],
  options: {
    platform: InboxPlatformFilter;
    queue: InboxQueueFilter;
    groups: boolean;
    attentionOnly?: boolean;
    now?: number;
  }
): UnifiedChat[] {
  const now = options.now ?? Date.now();
  return chats.filter((chat) => {
    if (chat.is_group !== options.groups) return false;
    if (options.platform === 'site') return false;
    if (options.platform !== 'all' && chat.platform !== options.platform)
      return false;
    if (options.attentionOnly && !isAwaitingResponse(chat)) return false;
    if (options.queue === 'mine' && !chat.crm_is_mine) return false;
    if (options.queue === 'unassigned' && chat.crm_assigned_to) return false;
    if (options.queue === 'sla' && !isSlaOverdue(chat, now)) return false;
    return true;
  });
}

export function getInboxMetrics(chats: UnifiedChat[], now = Date.now()) {
  const directChats = chats.filter((chat) => !chat.is_group);
  return {
    conversations: directChats.length,
    open: directChats.filter(isAwaitingResponse).length,
    awaiting: directChats.filter(isAwaitingResponse).length,
    overdue: directChats.filter((chat) => isSlaOverdue(chat, now)).length,
    mine: directChats.filter((chat) => chat.crm_is_mine).length,
    unassigned: directChats.filter((chat) => !chat.crm_assigned_to).length,
  };
}

export function formatSla(chat: UnifiedChat, now = Date.now()): string {
  if (!isAwaitingResponse(chat)) return 'Em dia';
  const elapsed = minutesSince(chat.last_message_at, now);
  if (elapsed > SLA_LIMIT_MINUTES) return 'SLA vencido';
  return `SLA ${Math.max(1, SLA_LIMIT_MINUTES - elapsed)}min`;
}
