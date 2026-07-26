import type { Chat, Message } from './api';
import type {
  InstagramConversation,
  InstagramMessage,
} from '@/views/Instagram/hooks/api';

export type Platform = 'whatsapp' | 'instagram';

export interface UnifiedChat extends Chat {
  platform: Platform;
  instagram_conversation_id?: string;
  instagram_account_username?: string;
  instagram_contact_username?: string;
  instagram_contact_full_name?: string;
  instagram_contact_avatar_url?: string;
}

export interface UnifiedMessage extends Message {
  platform: Platform;
  instagram_conversation_id?: string;
}

export function whatsappChatToUnified(chat: Chat): UnifiedChat {
  return {
    ...chat,
    platform: 'whatsapp',
  };
}

export function instagramConversationToUnified(
  conv: InstagramConversation
): UnifiedChat {
  const contact = conv.contact;
  const account = conv.account;
  const contactName =
    contact?.full_name ||
    contact?.username ||
    'Contato Instagram';
  const jid = `instagram:${conv.id}`;

  return {
    id: conv.id,
    instance_id: `ig-${conv.account_id}`,
    chat_jid: jid,
    name: contactName,
    display_name: contactName,
    phone: undefined,
    phone_display: undefined,
    push_name: contact?.username ? `@${contact.username}` : undefined,
    is_group: false,
    last_message: conv.last_message_preview || undefined,
    last_message_at: conv.last_message_at || null,
    unread_count: conv.unread_count,
    avatar_url: contact?.profile_picture_url || undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    platform: 'instagram',
    instagram_conversation_id: conv.id,
    instagram_account_username: account?.username,
    instagram_contact_username: contact?.username || undefined,
    instagram_contact_full_name: contact?.full_name || undefined,
    instagram_contact_avatar_url: contact?.profile_picture_url || undefined,
  };
}

const INSTAGRAM_TYPE_MAP: Record<string, Message['type']> = {
  text: 'text',
  image: 'image',
  video: 'video',
  audio: 'audio',
  document: 'document',
  sticker: 'sticker',
  carousel: 'image',
  reaction: 'text',
  system: 'text',
};

export function instagramMessageToUnified(
  msg: InstagramMessage,
  conversationId: string
): UnifiedMessage {
  const isFromMe = msg.direction === 'outbound';
  const mappedType = INSTAGRAM_TYPE_MAP[msg.message_type] || 'text';

  let content = msg.content || '';
  if (msg.message_type === 'reaction') {
    content = msg.content || '';
  }
  if (msg.message_type === 'system') {
    content = msg.content || '';
  }

  return {
    id: msg.id,
    instance_id: `ig-${msg.account_id}`,
    chat_id: conversationId,
    message_id: msg.instagram_message_id || msg.id,
    sender_phone: '',
    sender_name: isFromMe ? 'Voce' : 'Contato',
    sender_avatar_url: undefined,
    is_from_me: isFromMe,
    is_group: false,
    type: mappedType,
    content,
    delivery_status: isFromMe ? 'sent' : undefined,
    media_url: msg.media_url || undefined,
    media_id: undefined,
    media_mimetype: undefined,
    media_filename: undefined,
    media_status: msg.media_url ? 'ready' : 'none',
    media_error: undefined,
    media_retry_count: undefined,
    quoted_message_id: undefined,
    timestamp: msg.created_at,
    created_at: msg.created_at,
    platform: 'instagram',
    instagram_conversation_id: conversationId,
  };
}

export function sortUnifiedChats(chats: UnifiedChat[]): UnifiedChat[] {
  return [...chats].sort((a, b) => {
    const dateA = a.last_message_at
      ? new Date(a.last_message_at).getTime()
      : 0;
    const dateB = b.last_message_at
      ? new Date(b.last_message_at).getTime()
      : 0;
    return dateB - dateA;
  });
}

export function getUnifiedChatName(chat: UnifiedChat): string {
  if (chat.platform === 'instagram') {
    return (
      chat.instagram_contact_full_name ||
      (chat.instagram_contact_username
        ? `@${chat.instagram_contact_username}`
        : chat.name || 'Contato Instagram')
    );
  }
  return chat.name || 'Contato sem telefone';
}

export function getUnifiedChatSubtitle(chat: UnifiedChat): string {
  if (chat.platform === 'instagram') {
    if (chat.instagram_contact_username) {
      return `@${chat.instagram_contact_username}`;
    }
    return chat.instagram_account_username
      ? `via @${chat.instagram_account_username}`
      : 'Instagram';
  }
  return chat.phone_display || '';
}
