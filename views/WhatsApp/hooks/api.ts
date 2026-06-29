import { getRuntimeEnv } from '@/utils/runtimeConfig';
import { callApi } from '../../../src/lib/api';

const DEFAULT_WHATSAPP_API_URL = '/api/whatsapp';
const DEFAULT_WHATSAPP_WS_PATH = '/api/whatsapp/ws';

const RAW_WHATSAPP_API_URL = getRuntimeEnv('VITE_WHATSAPP_API_URL', DEFAULT_WHATSAPP_API_URL);
const API_BASE = normalizeWhatsAppApiUrl(RAW_WHATSAPP_API_URL);
const USE_DIRECT_WHATSAPP_API = /^https?:\/\//i.test(API_BASE);
const LEGACY_STORAGE_HOSTS = ['n.woopanel.com.br'];
const STORAGE_PUBLIC_URL = getRuntimeEnv('VITE_MINIO_PUBLIC_URL', 'https://nb.consultio.com.br').replace(/\/$/, '');
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

export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'WhatsAppApiError';
  }
}

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
  let session = await getApiSession();
  const impersonatedOrgId = USE_DIRECT_WHATSAPP_API
    ? await getValidImpersonatedOrgId(session?.user?.id)
    : getImpersonatedOrgId();
  const tenantId = USE_DIRECT_WHATSAPP_API
    ? impersonatedOrgId || await getTenantId(session?.user?.id)
    : null;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = buildApiUrl(cleanPath, tenantId);

  const body = withTenantBody(options?.body, tenantId);
  
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: buildApiHeaders(options?.headers, session?.access_token, impersonatedOrgId),
      body,
    });

    if (res.status === 401 && session) {
      session = await getApiSession(true);
      if (session) {
        res = await fetch(url, {
          ...options,
          headers: buildApiHeaders(options?.headers, session.access_token, impersonatedOrgId),
          body,
        });
      }
    }
  } catch (networkErr: any) {
    throw new Error(`WHATSAPP_UNAVAILABLE: Serviço não acessível em ${url} - ${networkErr.message}`);
  }

  // Detect proxy failure: server returned HTML instead of JSON
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(`WHATSAPP_UNAVAILABLE: ${url} retornou HTML. O proxy /api nao esta chegando no backend Node.js.`);
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText, code: undefined }));
    if (res.status === 401) {
      console.warn('[WhatsApp API] Falha 401 apos renovar a sessao.');
    }
    if (error.code === 'INVALID_TENANT' || error.code === 'INVALID_IMPERSONATED_ORG') {
      clearImpersonationStorage();
      tenantIdCache = undefined;
    }

    const message = error.code === 'TENANT_REQUIRED'
      ? 'Selecione uma organização antes de acessar o WhatsApp.'
      : error.error || `API Error: ${res.status}`;
    throw new WhatsAppApiError(message, res.status, error.code);
  }

  return normalizeStorageUrls(await res.json()) as T;
}

function buildApiHeaders(
  customHeaders: HeadersInit | undefined,
  accessToken: string | undefined,
  impersonatedOrgId: string | null
) {
  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (impersonatedOrgId) headers.set('x-impersonate-org-id', impersonatedOrgId);
  return headers;
}

async function getApiSession(forceRefresh = false) {
  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    return error ? null : data.session;
  }

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const expiresAtMs = (session?.expires_at || 0) * 1000;

  if (session && expiresAtMs <= Date.now() + 30_000) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    return error ? session : refreshed.session;
  }

  return session;
}

export async function getAuthorizedWhatsAppWsUrl(): Promise<string> {
  const response = await apiRequest<{ token: string }>('/socket-token', { method: 'POST' });
  const url = new URL(WS_URL);
  url.searchParams.set('ws_token', response.token);
  const payload = decodeJwtPayload(response.token);
  if (payload?.org_id) {
    url.searchParams.set('tenant_id', payload.org_id);
  }
  return url.toString();
}

function decodeJwtPayload(token: string): { org_id?: string } | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed = JSON.parse(atob(padded));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getImpersonatedOrgId(): string | null {
  const value = sessionStorage.getItem('impersonated_org_id');
  if (value && value !== 'null' && value !== 'undefined') return value;

  const legacy = localStorage.getItem('impersonatedOrgId');
  if (legacy && legacy !== 'null' && legacy !== 'undefined') {
    sessionStorage.setItem('impersonated_org_id', legacy);
    return legacy;
  }

  return null;
}

async function getValidImpersonatedOrgId(userId?: string): Promise<string | null> {
  const impersonatedOrgId = getImpersonatedOrgId();
  if (!impersonatedOrgId) return null;

  const context = await getUserTenantContext(userId);
  if (context?.role !== 'superadmin') {
    clearImpersonationStorage();
    return null;
  }

  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', impersonatedOrgId)
    .maybeSingle();

  if (!data?.id) {
    clearImpersonationStorage();
    return null;
  }

  return data.id;
}

function clearImpersonationStorage() {
  sessionStorage.removeItem('impersonated_org_id');
  localStorage.removeItem('impersonatedOrgId');
  localStorage.removeItem('isImpersonating');
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

function normalizeStorageUrls(value: unknown): unknown {
  if (typeof value === 'string') return normalizeStorageUrl(value);
  if (Array.isArray(value)) return value.map(normalizeStorageUrls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, normalizeStorageUrls(entry)])
    );
  }
  return value;
}

function normalizeStorageUrl(value: string): string {
  if (!value || !/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    if (!LEGACY_STORAGE_HOSTS.includes(url.hostname)) return value;
    const target = new URL(STORAGE_PUBLIC_URL);
    url.protocol = target.protocol;
    url.hostname = target.hostname;
    url.port = target.port;
    return url.toString();
  } catch {
    return value;
  }
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

export interface HistoryImportResponse {
  message: string;
  requested: number;
  analyzing: boolean;
  since_days?: number;
  imported_chats?: number;
  imported_messages?: number;
}

export interface Chat {
  id: string;
  instance_id: string;
  chat_jid: string;
  name: string;
  display_name?: string;
  phone?: string;
  phone_display?: string;
  push_name?: string;
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
  delivery_status?: 'sent' | 'delivered' | 'read' | 'played' | 'failed';
  media_url?: string;
  media_id?: string;
  media_mimetype?: string;
  media_filename?: string;
  media_status?: 'none' | 'pending' | 'downloading' | 'processing' | 'ready' | 'failed' | 'expired';
  media_error?: string;
  media_retry_count?: number;
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

export interface DeleteChatsResponse {
  deleted_chats: number;
  deleted_direct: number;
  deleted_groups: number;
  deleted_messages: number;
}

export interface CrmContactResponse {
  lead: any | null;
  tags: string[];
}

export interface CrmAssignee {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface CrmAssigneesResponse {
  users: CrmAssignee[];
}

export interface WhatsAppMediaUrlResponse {
  id: string;
  url: string;
  status: string;
  mime_type?: string;
  filename?: string;
  expires_in?: number | null;
}

export interface WhatsAppMediaRetryResponse {
  id: string;
  status: string;
  retry_count: number;
  message: string;
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

export interface WhatsAppMediaStatusEvent {
  message_id: string;
  media_id?: string;
  status: 'pending' | 'downloading' | 'processing' | 'ready' | 'failed' | 'expired';
  url?: string;
  error?: string;
}

export interface WhatsAppMessageReceiptEvent {
  instance_id: string;
  chat_jid: string;
  message_ids: string[];
  status: 'sent' | 'delivered' | 'read' | 'played' | 'failed';
  timestamp: string;
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
    apiRequest<{ qr_code?: string; status: string; expires_at?: string }>(`/instances/${id}/qrcode`),

  connect: (id: string) =>
    apiRequest(`/instances/${id}/connect`, { method: 'POST' }),

  logout: (id: string) =>
    apiRequest(`/instances/${id}/logout`, { method: 'POST' }),

  importHistory: (id: string, options: { chat_limit?: number; per_chat?: number; since_days?: number } = {}) =>
    apiRequest<HistoryImportResponse>(`/instances/${id}/import-history`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),
};

// ---- Chat API ----
export const chatApi = {
  list: (instanceId: string) =>
    apiRequest<Chat[]>(`/chats?instance_id=${instanceId}`),

  ensureDirect: (instanceId: string, payload: { phone: string; name?: string }) =>
    apiRequest<Chat>(`/chats/ensure?instance_id=${instanceId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteAll: (instanceId: string) =>
    apiRequest<DeleteChatsResponse>(`/chats?instance_id=${instanceId}`, { method: 'DELETE' }),

  markRead: (chatId: string, instanceId: string) =>
    apiRequest(`/chats/${chatId}/read?instance_id=${instanceId}`, { method: 'POST' }),

  updateContactName: (chatId: string, instanceId: string, displayName: string) =>
    apiRequest<Chat>(`/chats/${chatId}/contact?instance_id=${instanceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    }),
};

export const crmContactApi = {
  get: (phone: string) =>
    callApi(`/api/crm/whatsapp/contact?phone=${encodeURIComponent(phone)}`) as Promise<CrmContactResponse>,

  assignees: () =>
    callApi('/api/crm/whatsapp/assignees') as Promise<CrmAssigneesResponse>,

  link: (payload: { phone: string; name?: string; chat_jid?: string; source?: string }) =>
    callApi('/api/crm/whatsapp/link-contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<CrmContactResponse>,

  update: (payload: { phone: string; name?: string; email?: string; chat_jid?: string; source?: string }) =>
    callApi('/api/crm/whatsapp/contact-profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }) as Promise<CrmContactResponse>,

  addTags: (payload: { phone: string; name?: string; chat_jid?: string; tags: string[]; source?: string }) =>
    callApi('/api/crm/whatsapp/contact-tags', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<CrmContactResponse>,

  markPriority: (payload: { phone: string; name?: string; chat_jid?: string; source?: string }) =>
    callApi('/api/crm/whatsapp/priority', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<CrmContactResponse>,

  transfer: (payload: { phone: string; name?: string; chat_jid?: string; source?: string; assigned_to: string }) =>
    callApi('/api/crm/whatsapp/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<CrmContactResponse & { assignee?: CrmAssignee }>,

  createTask: (payload: { phone: string; name?: string; chat_jid?: string; title?: string; due_at?: string; source?: string }) =>
    callApi('/api/crm/whatsapp/task', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<CrmContactResponse & { task?: any }>,
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
      if (res.status === 401) {
        console.warn('[WhatsApp API] Falha 401 na midia. Servidor Node.js pode estar com a Service Role Key incorreta.');
      }
      throw new Error(error.error || `API Error: ${res.status}`);
    }

    return res.json();
  },
};

export const mediaApi = {
  getUrl: (mediaId: string, expiresInSeconds = 300) =>
    apiRequest<WhatsAppMediaUrlResponse>(`/media/${mediaId}/url?expiresInSeconds=${expiresInSeconds}`),

  retry: (mediaId: string) =>
    apiRequest<WhatsAppMediaRetryResponse>(`/media/${mediaId}/retry`, { method: 'POST' }),
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

export function formatPhoneFriendly(phone: string): string {
  const normalized = formatPhone(phone);
  if (!isValidBrazilianPhone(normalized)) return normalized;
  const local = normalized.slice(2);
  if (local.length === 11) {
    return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return `+55 (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
}

export function getDisplayName(pushName: string | null, number: string): string {
  if (pushName && !isPlaceholderName(pushName)) return pushName.trim();
  if (number) {
    const cleaned = formatPhone(number);
    if (isValidBrazilianPhone(cleaned)) return formatPhoneFriendly(cleaned);
  }
  return 'Contato sem telefone';
}

export function getChatDisplayName(chat: Pick<Chat, 'name' | 'chat_jid' | 'is_group'>): string {
  const richChat = chat as Partial<Chat>;
  if (chat.is_group) return chat.name || 'Grupo';
  if (richChat.display_name && !isPlaceholderName(richChat.display_name)) return richChat.display_name;
  if (chat.name && !isPlaceholderName(chat.name)) return chat.name;
  if (richChat.phone_display) return richChat.phone_display;
  const phoneFromJid = getPhoneFromJid(chat.chat_jid);
  return phoneFromJid || chat.name || 'Contato sem telefone';
}

export function getPhoneFromJid(jid: string): string {
  if (!jid || jid.includes('@g.us') || jid.includes('@lid') || jid.includes('@broadcast')) return '';
  const raw = jid.split('@')[0]?.replace(/\D/g, '') || '';
  return isValidBrazilianPhone(raw) ? formatPhoneFriendly(raw) : '';
}

function mediaTypeFromFile(file: File): string {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}

export function isPlaceholderName(value?: string | null): boolean {
  const clean = String(value || '').trim();
  if (!clean) return true;
  const lower = clean.toLowerCase();
  if (['~', 'me', 'contato sem telefone', 'telefone nao identificado', 'telefone não identificado', 'lead whatsapp'].includes(lower)) {
    return true;
  }
  if (/@(s\.whatsapp\.net|c\.us|g\.us|lid|broadcast)$/i.test(clean) || clean.includes('@lid')) return true;
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 2 && (/[-*•…]{2,}/.test(clean) || clean.includes('...'))) return true;
  if (digits.length >= 8 && digits.length === clean.length) return true;
  if (/^[A-Za-zÀ-ÿ]{1,3}$/.test(clean)) return true;
  return false;
}
