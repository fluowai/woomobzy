import { type Chat, type Instance } from './hooks/api';

export const HISTORY_PERIOD_OPTIONS = [
  { value: 7, label: '7 dias', chatLimit: 80, perChat: 40 },
  { value: 30, label: '30 dias', chatLimit: 120, perChat: 60 },
  { value: 60, label: '60 dias', chatLimit: 160, perChat: 80 },
  { value: 90, label: '90 dias', chatLimit: 180, perChat: 80 },
  { value: 365, label: '1 ano', chatLimit: 200, perChat: 100 },
  { value: 0, label: 'Tudo', chatLimit: 200, perChat: 100 },
];

export const INSTANCE_ACTIVITY_WINDOW_MS = 30 * 60 * 1000;

export function resultTypeFromFile(file: File): string {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}

export function isTenantContextError(error: any): boolean {
  return [
    'TENANT_REQUIRED',
    'PROFILE_NO_ORG',
    'PROFILE_ORG_NOT_FOUND',
    'PROFILE_ORG_INACTIVE',
    'INVALID_TENANT',
    'INVALID_REQUESTED_ORG',
  ].includes(error?.code);
}

export function getLatestChatActivityAt(chats: Chat[], instanceId?: string): number {
  return chats.reduce((latest, chat) => {
    if (instanceId && chat.instance_id !== instanceId) return latest;
    const activityAt = chat.last_message_at ? new Date(chat.last_message_at).getTime() : 0;
    if (!Number.isFinite(activityAt)) return latest;
    return Math.max(latest, activityAt);
  }, 0);
}

export function hasRecentInstanceActivity(activityAt = 0): boolean {
  return activityAt > 0 && Date.now() - activityAt <= INSTANCE_ACTIVITY_WINDOW_MS;
}

export function withVisualInstanceStatus(instance: Instance, hasActivity = false): Instance {
  if (instance.status === 'connected') return instance;
  if (hasActivity) {
    return { ...instance, status: 'connected' };
  }
  return instance;
}

export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
