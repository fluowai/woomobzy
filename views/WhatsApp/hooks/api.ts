const RAW_BACKEND_URL =
  import.meta.env.VITE_WHATSAPP_API_URL ||
  import.meta.env.VITE_API_URL ||
  '';

const BACKEND_URL = normalizeBackendUrl(RAW_BACKEND_URL);
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api/whatsapp` : '/api/whatsapp';
export const WS_URL = BACKEND_URL 
  ? `${BACKEND_URL.replace('http', 'ws')}/api/whatsapp/ws`
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/whatsapp/ws`;

import { supabase } from '@/services/supabase';

function normalizeBackendUrl(url: string): string {
  const clean = (url || '').trim().replace(/\/$/, '');
  if (!clean) return '';

  if (clean.includes('web-production-7c3f0.up.railway.app')) {
    return 'https://woomobzy-production.up.railway.app';
  }

  return clean;
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;
  
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session ? `Bearer ${session.access_token}` : '',
        ...options?.headers,
      },
      ...options,
    });
  } catch (networkErr: any) {
    throw new Error(`WHATSAPP_UNAVAILABLE: Serviço não acessível - ${networkErr.message}`);
  }

  // Detect proxy failure: server returned HTML instead of JSON
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('WHATSAPP_UNAVAILABLE: O servidor WhatsApp não está respondendo. O backend Node.js pode não estar ativo.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }

  return res.json();
}

// ---- Types ----
export interface Instance {
  id: string;
  tenant_id?: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_pending';
  qr_code?: string;
  phone?: string;
  jid?: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  instance_id: string;
  chat_jid: string;
  name: string;
  is_group: boolean;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  instance_id: string;
  chat_id: string;
  message_id: string;
  sender_phone: string;
  sender_name: string;
  sender_avatar_url?: string;
  is_from_me: boolean;
  is_group: boolean;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contact' | 'unknown';
  content?: string;
  media_url?: string;
  media_mimetype?: string;
  media_filename?: string;
  quoted_message_id?: string;
  timestamp: string;
  created_at: string;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

// ---- Instance API ----
export const instanceApi = {
  create: (name: string) =>
    apiRequest<Instance>('/instances', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  list: () => apiRequest<Instance[]>('/instances'),

  get: (id: string) => apiRequest<Instance>(`/instances/${id}`),

  delete: (id: string) =>
    apiRequest(`/instances/${id}`, { method: 'DELETE' }),

  getQRCode: (id: string) =>
    apiRequest<{ qr_code?: string; status: string }>(`/instances/${id}/qrcode`),

  connect: (id: string) =>
    apiRequest(`/instances/${id}/connect`, { method: 'POST' }),

  logout: (id: string) =>
    apiRequest(`/instances/${id}/logout`, { method: 'POST' }),
};

// ---- Chat API ----
export const chatApi = {
  list: (instanceId: string) =>
    apiRequest<Chat[]>(`/chats?instance_id=${instanceId}`),

  markRead: (chatId: string) =>
    apiRequest(`/chats/${chatId}/read`, { method: 'POST' }),
};

// ---- Message API ----
export const messageApi = {
  list: (chatId: string, limit = 50, offset = 0) =>
    apiRequest<MessageListResponse>(`/messages/${chatId}?limit=${limit}&offset=${offset}`),

  send: (chatId: string, instanceId: string, content: string, type: string = 'text') =>
    apiRequest(`/messages/${chatId}/send?instance_id=${instanceId}`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    }),

  sendMedia: async (chatId: string, instanceId: string, file: File, content = '') => {
    const { data: { session } } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('content', content);
    formData.append('type', mediaTypeFromFile(file));

    const res = await fetch(`${API_BASE}/messages/${chatId}/send-media?instance_id=${instanceId}`, {
      method: 'POST',
      headers: {
        Authorization: session ? `Bearer ${session.access_token}` : '',
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || `API Error: ${res.status}`);
    }

    return res.json();
  },
};

// ---- Phone Utils ----
export function formatPhone(number: string): string {
  const cleaned = number.replace(/\D/g, '').replace(/^0+/, '');
  if (cleaned.length === 10 || cleaned.length === 11) return `55${cleaned}`;
  return cleaned;
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = formatPhone(phone);
  return normalized ? `+${normalized}` : '';
}

export function getDisplayName(pushName: string | null, number: string): string {
  return pushName && pushName.trim() !== '' ? pushName : formatPhone(number);
}

function mediaTypeFromFile(file: File): string {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}
