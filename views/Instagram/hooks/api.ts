import { supabase } from '@/services/supabase';
import {
  getImpersonatedOrganizationId,
  getImpersonationHeaders,
} from '@/src/lib/impersonation';

const INSTAGRAM_API = '/api/instagram';

async function getCompanyId(): Promise<string | null> {
  const impersonatedOrgId = getImpersonatedOrganizationId();
  if (impersonatedOrgId) return impersonatedOrgId;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  return profile?.organization_id || null;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const companyId = await getCompanyId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (companyId) headers['x-company-id'] = companyId;

  const impersonationHeaders = getImpersonationHeaders();
  if (Object.keys(impersonationHeaders).length > 0) {
    Object.assign(headers, impersonationHeaders);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${INSTAGRAM_API}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface InstagramAccount {
  id: string;
  company_id: string;
  username: string;
  instagram_user_id: string | null;
  display_name: string | null;
  profile_picture_url: string | null;
  followers_count: number;
  following_count: number;
  media_count: number;
  is_business_account: boolean;
  status:
    | 'pending'
    | 'connecting'
    | 'active'
    | 'challenge_required'
    | 'login_required'
    | 'error'
    | 'disabled';
  last_login_at: string | null;
  last_activity_at: string | null;
  created_at: string;
}

export interface InstagramContact {
  id: string;
  company_id: string;
  account_id: string;
  instagram_user_id: string;
  username: string | null;
  full_name: string | null;
  profile_picture_url: string | null;
  is_business: boolean;
  is_verified: boolean;
  follower_count: number | null;
  bio: string | null;
  lead_score: number;
  tags: string[];
  custom_fields: Record<string, unknown>;
  last_message_at: string | null;
}

export interface InstagramConversation {
  id: string;
  company_id: string;
  account_id: string;
  contact_id: string;
  status: 'open' | 'pending' | 'resolved' | 'archived';
  assigned_to: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  contact?: InstagramContact;
  account?: { id: string; username: string };
}

export interface InstagramMessage {
  id: string;
  company_id: string;
  conversation_id: string;
  account_id: string;
  contact_id: string;
  instagram_message_id: string | null;
  direction: 'inbound' | 'outbound';
  message_type:
    | 'text'
    | 'image'
    | 'video'
    | 'audio'
    | 'document'
    | 'sticker'
    | 'carousel'
    | 'reaction'
    | 'system';
  content: string | null;
  media_url: string | null;
  is_read: boolean;
  sent_by_automation: boolean;
  created_at: string;
}

export interface InstagramTemplate {
  id: string;
  company_id: string;
  account_id: string;
  name: string;
  category: string;
  body: string;
  media_url: string | null;
  buttons: Array<{ label: string; url?: string }>;
  variables: Array<{
    variable_name: string;
    variable_type: string;
    default_value: string | null;
    is_required: boolean;
  }>;
  usage_count: number;
  created_at: string;
}

export interface InstagramBroadcast {
  id: string;
  company_id: string;
  account_id: string;
  name: string;
  status:
    | 'draft'
    | 'scheduled'
    | 'sending'
    | 'completed'
    | 'paused'
    | 'failed'
    | 'cancelled';
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  template?: { id: string; name: string };
  created_at: string;
}

export const instagramApi = {
  accounts: {
    list: () => apiFetch('/accounts') as Promise<{ data: InstagramAccount[] }>,
    get: (id: string) =>
      apiFetch(`/accounts/${id}`) as Promise<{ data: InstagramAccount }>,
    connect: (username: string, is_business_account?: boolean) =>
      apiFetch('/accounts/connect', {
        method: 'POST',
        body: JSON.stringify({ username, is_business_account }),
      }),
    delete: (id: string) => apiFetch(`/accounts/${id}`, { method: 'DELETE' }),
  },
  contacts: {
    list: (params?: { search?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset) qs.set('offset', String(params.offset));
      return apiFetch(`/contacts?${qs}`) as Promise<{
        data: InstagramContact[];
      }>;
    },
    get: (id: string) =>
      apiFetch(`/contacts/${id}`) as Promise<{ data: InstagramContact }>,
    update: (
      id: string,
      patch: Partial<
        Pick<InstagramContact, 'lead_score' | 'tags' | 'custom_fields'>
      >
    ) =>
      apiFetch(`/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
  },
  conversations: {
    list: (params?: { status?: string; assigned_to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.assigned_to) qs.set('assigned_to', params.assigned_to);
      return apiFetch(`/conversations?${qs}`) as Promise<{
        data: InstagramConversation[];
      }>;
    },
    get: (id: string) =>
      apiFetch(`/conversations/${id}`) as Promise<{
        data: InstagramConversation;
      }>,
    update: (
      id: string,
      patch: Partial<
        Pick<
          InstagramConversation,
          'status' | 'assigned_to' | 'priority' | 'tags'
        >
      >
    ) =>
      apiFetch(`/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
  },
  messages: {
    list: (
      conversationId: string,
      params?: { limit?: number; before?: string }
    ) => {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.before) qs.set('before', params.before);
      return apiFetch(`/messages/${conversationId}?${qs}`) as Promise<{
        data: InstagramMessage[];
      }>;
    },
    send: (payload: {
      conversation_id: string;
      content: string;
      message_type?: string;
      media_url?: string;
      template_id?: string;
      variables?: Record<string, string>;
    }) =>
      apiFetch('/messages', { method: 'POST', body: JSON.stringify(payload) }),
    markRead: (conversation_id: string) =>
      apiFetch('/messages/mark-read', {
        method: 'POST',
        body: JSON.stringify({ conversation_id }),
      }),
  },
  templates: {
    list: (params?: { category?: string; account_id?: string }) => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set('category', params.category);
      if (params?.account_id) qs.set('account_id', params.account_id);
      return apiFetch(`/templates?${qs}`) as Promise<{
        data: InstagramTemplate[];
      }>;
    },
    get: (id: string) =>
      apiFetch(`/templates/${id}`) as Promise<{ data: InstagramTemplate }>,
    create: (
      payload: Omit<
        InstagramTemplate,
        'id' | 'company_id' | 'usage_count' | 'created_at'
      >
    ) =>
      apiFetch('/templates', { method: 'POST', body: JSON.stringify(payload) }),
    update: (
      id: string,
      patch: Partial<Omit<InstagramTemplate, 'id' | 'company_id'>>
    ) =>
      apiFetch(`/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    delete: (id: string) => apiFetch(`/templates/${id}`, { method: 'DELETE' }),
  },
  broadcasts: {
    list: (params?: { status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      return apiFetch(`/broadcasts?${qs}`) as Promise<{
        data: InstagramBroadcast[];
      }>;
    },
    get: (id: string) =>
      apiFetch(`/broadcasts/${id}`) as Promise<{ data: InstagramBroadcast }>,
    create: (payload: {
      name: string;
      account_id: string;
      template_id?: string;
      description?: string;
      filter_criteria?: Record<string, unknown>;
      scheduled_at?: string;
    }) =>
      apiFetch('/broadcasts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    send: (id: string) =>
      apiFetch(`/broadcasts/${id}/send`, { method: 'POST' }),
    cancel: (id: string) =>
      apiFetch(`/broadcasts/${id}/cancel`, { method: 'POST' }),
  },
};
