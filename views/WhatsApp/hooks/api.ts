import { getRuntimeEnv } from '@/utils/runtimeConfig';

const DEFAULT_WHATSAPP_API_URL = '/api/whatsapp';
const DEFAULT_WHATSAPP_WS_PATH = '/api/whatsapp/ws';

const RAW_WHATSAPP_API_URL = getRuntimeEnv('VITE_WHATSAPP_API_URL', DEFAULT_WHATSAPP_API_URL);
const API_BASE = normalizeWhatsAppApiUrl(RAW_WHATSAPP_API_URL);
const USE_DIRECT_WHATSAPP_API = /^https?:\/\//i.test(API_BASE);
export const WS_URL = normalizeWhatsAppWsUrl(
  getRuntimeEnv('VITE_WHATSAPP_WS_URL', DEFAULT_WHATSAPP_WS_PATH)
);

import { supabase } from '@/services/supabase';

let tenantIdCache: string | null | undefined;
let userTenantContextCache:
  | {
      userId: string;
      role: string | null;
      organizationId: string | null;
    }
  | undefined;

function normalizeWhatsAppApiUrl(url: string): string {
  const clean = (url || '').trim().replace(/\/$/, '');
  if (!clean) return DEFAULT_WHATSAPP_API_URL;

  if (!/^https?:\/\//i.test(clean)) {
    return clean || '/api/whatsapp';
  }

  if (/\/api\/whatsapp$/i.test(clean)) return clean;
  if (/\/api$/i.test(clean)) return `${clean}/whatsapp`;

  return `${clean}/api/whatsapp`;
}

function normalizeWhatsAppWsUrl(url: string): string {
  const clean = (url || '').trim().replace(/\/$/, '');
  if (!clean) return buildSameOriginWsUrl(DEFAULT_WHATSAPP_WS_PATH);

  if (!/^wss?:\/\//i.test(clean)) {
    return buildSameOriginWsUrl(clean || DEFAULT_WHATSAPP_WS_PATH);
  }

  if (/\/api\/whatsapp\/ws$/i.test(clean)) return clean;
  if (/\/api\/whatsapp$/i.test(clean)) return `${clean}/ws`;
  if (/\/api$/i.test(clean)) return `${clean}/whatsapp/ws`;
  if (/\/ws$/i.test(clean)) return clean;

  return `${clean}/api/whatsapp/ws`;
}

function buildSameOriginWsUrl(path: string): string {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${wsProtocol}//${window.location.host}${cleanPath}`;
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const impersonatedOrgId = await getValidImpersonatedOrgId(session?.user?.id);
  const tenantId = USE_DIRECT_WHATSAPP_API
    ? impersonatedOrgId || await getTenantId(session?.user?.id)
    : null;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = buildApiUrl(cleanPath, tenantId);

  const body = withTenantBody(options?.body, tenantId);
  
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session ? `Bearer ${session.access_token}` : '',
        ...(impersonatedOrgId ? { 'x-impersonate-org-id': impersonatedOrgId } : {}),
        ...options?.headers,
      },
      ...options,
      body,
    });
  } catch (networkErr: any) {
    throw new Error(`WHATSAPP_UNAVAILABLE: Serviço não acessível em ${url} - ${networkErr.message}`);
  }

  // Detect proxy failure: server returned HTML instead of JSON
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(`WHATSAPP_UNAVAILABLE: ${url} retornou HTML. O proxy /api nao esta chegando no backend Node.js.`);
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    if (error.code === 'INVALID_TENANT' || error.code === 'INVALID_IMPERSONATED_ORG') {
      sessionStorage.removeItem('impersonated_org_id');
      tenantIdCache = undefined;
    }
    throw new Error(error.error || `API Error: ${res.status}`);
  }

  return res.json();
}

export async function getAuthorizedWhatsAppWsUrl(): Promise<string> {
  const response = await apiRequest<{ token: string }>('/socket-token', { method: 'POST' });
  const url = new URL(WS_URL);
  url.searchParams.set('ws_token', response.token);
  return url.toString();
}

function getImpersonatedOrgId(): string | null {
  const value = sessionStorage.getItem('impersonated_org_id');
  return value && value !== 'null' && value !== 'undefined' ? value : null;
}

async function getValidImpersonatedOrgId(userId?: string): Promise<string | null> {
  const impersonatedOrgId = getImpersonatedOrgId();
  if (!impersonatedOrgId) return null;

  const context = await getUserTenantContext(userId);
  if (context?.role !== 'superadmin') {
    sessionStorage.removeItem('impersonated_org_id');
    return null;
  }

  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', impersonatedOrgId)
    .maybeSingle();

  if (!data?.id) {
    sessionStorage.removeItem('impersonated_org_id');
    return null;
  }

  return data.id;
}

async function getTenantId(userId?: string): Promise<string | null> {
  if (!userId) return null;
  if (tenantIdCache !== undefined) return tenantIdCache;

  const context = await getUserTenantContext(userId);
  tenantIdCache = context?.organizationId || null;
  return tenantIdCache;
}

async function getUserTenantContext(userId?: string) {
  if (!userId) return null;
  if (userTenantContextCache?.userId === userId) return userTenantContextCache;

  const { data } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', userId)
    .single();

  userTenantContextCache = {
    userId,
    role: data?.role || null,
    organizationId: data?.organization_id || null,
  };
  return userTenantContextCache;
}

function buildApiUrl(path: string, tenantId?: string | null): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (USE_DIRECT_WHATSAPP_API && tenantId && !url.searchParams.has('tenant_id')) {
    url.searchParams.set('tenant_id', tenantId);
  }
  return url.toString();
}

function withTenantBody(body: BodyInit | null | undefined, tenantId?: string | null): BodyInit | null | undefined {
  if (!USE_DIRECT_WHATSAPP_API || !tenantId || typeof body !== 'string') return body;

  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !parsed.tenant_id) {
      return JSON.stringify({ ...parsed, tenant_id: tenantId });
    }
  } catch {
    return body;
  }

  return body;
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

const LEGACY_MEDIA_PREVIEWS: Record<string, string> = {
  '[image]': 'Imagem',
  '[audio]': 'Audio',
  '[video]': 'Video',
  '[document]': 'Documento',
  '[sticker]': 'Figurinha',
  '[location]': 'Localizacao',
  '[contact]': 'Contato',
  '[unknown]': 'Mensagem',
};

export function normalizeMessagePreview(value?: string): string {
  const clean = (value || '').trim();
  if (!clean) return '';
  return LEGACY_MEDIA_PREVIEWS[clean.toLowerCase()] || clean;
}

export function isTechnicalMediaPlaceholder(value?: string): boolean {
  const clean = (value || '').trim().toLowerCase();
  return Boolean(clean && LEGACY_MEDIA_PREVIEWS[clean]);
}

export function isSupportedChat(chat: Pick<Chat, 'chat_jid' | 'is_group'>): boolean {
  const jid = (chat.chat_jid || '').toLowerCase();
  if (chat.is_group) return jid.includes('@g.us');
  return jid.includes('@s.whatsapp.net') && Boolean(formatPhoneDisplay(jid));
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

  markRead: (chatId: string, instanceId: string) =>
    apiRequest(`/chats/${chatId}/read?instance_id=${instanceId}`, { method: 'POST' }),

  updateContactName: (chatId: string, instanceId: string, displayName: string) =>
    apiRequest<Chat>(`/chats/${chatId}/contact?instance_id=${instanceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    }),
};

// ---- Message API ----
export const messageApi = {
  list: (chatId: string, instanceId: string, limit = 50, offset = 0) =>
    apiRequest<MessageListResponse>(`/messages/${chatId}?instance_id=${instanceId}&limit=${limit}&offset=${offset}`),

  send: (chatId: string, instanceId: string, content: string, type: string = 'text') =>
    apiRequest(`/messages/${chatId}/send?instance_id=${instanceId}`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    }),

  sendMedia: async (chatId: string, instanceId: string, file: File, content = '') => {
    const { data: { session } } = await supabase.auth.getSession();
    const impersonatedOrgId = getImpersonatedOrgId();
    const tenantId = USE_DIRECT_WHATSAPP_API
      ? impersonatedOrgId || await getTenantId(session?.user?.id)
      : null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('content', content);
    formData.append('type', mediaTypeFromFile(file));

    const res = await fetch(buildApiUrl(`/messages/${chatId}/send-media?instance_id=${instanceId}`, tenantId), {
      method: 'POST',
      headers: {
        Authorization: session ? `Bearer ${session.access_token}` : '',
        ...(impersonatedOrgId ? { 'x-impersonate-org-id': impersonatedOrgId } : {}),
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

export function isValidBrazilianPhone(number: string): boolean {
  const normalized = formatPhone(number);
  return normalized.startsWith('55') && (normalized.length === 12 || normalized.length === 13);
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = formatPhone(phone);
  return isValidBrazilianPhone(normalized) ? `+${normalized}` : '';
}

export function getDisplayName(pushName: string | null, number: string): string {
  if (pushName && pushName.trim() !== '') return pushName;
  return isValidBrazilianPhone(number) ? formatPhone(number) : 'Contato sem telefone';
}

function mediaTypeFromFile(file: File): string {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}
