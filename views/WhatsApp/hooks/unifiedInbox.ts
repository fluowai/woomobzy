import type { Chat, Message } from './api';

export type Platform = 'whatsapp';

export interface UnifiedChat extends Chat {
  platform: Platform;
}

export interface UnifiedMessage extends Message {
  platform: Platform;
}

export function whatsappChatToUnified(chat: Chat): UnifiedChat {
  // Try to map any alternative avatar properties from the backend if avatar_url is missing
  const backendChat: any = chat;
  const avatarUrl =
    backendChat.avatar_url ||
    backendChat.profile_pic_url ||
    backendChat.profilePictureUrl ||
    backendChat.picture ||
    backendChat.avatar ||
    '';

  return {
    ...chat,
    avatar_url: avatarUrl,
    platform: 'whatsapp',
  };
}

export function sortUnifiedChats(chats: UnifiedChat[]): UnifiedChat[] {
  return [...chats].sort((a, b) => {
    const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return dateB - dateA;
  });
}

export function deduplicateAndSortChats(chats: UnifiedChat[]): UnifiedChat[] {
  const seen = new Map<string, UnifiedChat>();

  for (const chat of chats) {
    // Para chats do WhatsApp, usar o chat_jid, phone, ou id para unificar.
    // Grupos geralmente tem chat_jid unico que pode se repetir entre instancias
    // Contatos normais podem ser unificados pelo telefone.
    let key = chat.id;
    if (chat.platform === 'whatsapp') {
      const phoneOnly = chat.phone ? String(chat.phone).replace(/\D/g, '') : '';
      if (chat.is_group && chat.chat_jid) {
        key = `group_${chat.chat_jid}`;
      } else if (phoneOnly) {
        key = `contact_${phoneOnly}`;
      } else if (chat.chat_jid) {
        key = `jid_${chat.chat_jid.split('@')[0]}`;
      }
    }

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, chat);
    } else {
      const existingDate = existing.last_message_at
        ? new Date(existing.last_message_at).getTime()
        : 0;
      const newDate = chat.last_message_at
        ? new Date(chat.last_message_at).getTime()
        : 0;
      // Manter a instancia com a mensagem mais recente, OU que tem contagem de nao lida
      if (newDate > existingDate) {
        seen.set(key, chat);
      } else if (
        newDate === existingDate &&
        chat.unread_count > existing.unread_count
      ) {
        seen.set(key, chat);
      }
    }
  }

  return sortUnifiedChats(Array.from(seen.values()));
}

export function getUnifiedChatName(chat: UnifiedChat): string {
  return chat.name || 'Contato sem telefone';
}

export function getUnifiedChatSubtitle(chat: UnifiedChat): string {
  return chat.phone_display || '';
}
