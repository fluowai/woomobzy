import { callApi } from '@/src/lib/api';

export type EmailAccount = {
  id: string;
  email: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  last_synced_at?: string | null;
  sync_status?: string;
  sync_error?: string | null;
};

export type EmailMessage = {
  id: string;
  account_id: string;
  folder: 'inbox' | 'sent' | 'archived' | string;
  direction: 'incoming' | 'outgoing';
  subject: string;
  from_name?: string | null;
  from_email: string;
  to_email: string[];
  preview?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  date?: string | null;
  is_read: boolean;
  is_archived: boolean;
  message_id?: string | null;
  thread_id: string;
  lead_id?: string | null;
  leads?: { id: string; name: string; email?: string | null } | null;
};

export type ConnectEmailPayload = {
  email: string;
  password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
};

export type EmailAgendaActivity = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low' | string;
  status: 'pending' | 'done' | string;
  subject?: string;
  from_email?: string;
  email_id?: string | null;
  created_at: string;
  leads?: { id: string; name: string; email?: string | null; phone?: string | null; status?: string | null } | null;
  metadata?: Record<string, any>;
};

export const emailService = {
  listAccounts: async () => {
    const data = await callApi('/api/email/accounts');
    return data.accounts as EmailAccount[];
  },

  testAccount: async (payload: ConnectEmailPayload) =>
    callApi('/api/email/accounts/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  connectAccount: async (payload: ConnectEmailPayload) =>
    callApi('/api/email/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sync: async (accountId: string, limit = 50) =>
    callApi('/api/email/sync', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, limit }),
    }),

  listEmails: async (folder: string, page = 1, search = '') => {
    const params = new URLSearchParams({
      folder,
      page: String(page),
      limit: '30',
    });
    if (search) params.set('search', search);
    const data = await callApi(`/api/email/emails?${params.toString()}`);
    return data as { emails: EmailMessage[]; pagination: { total: number; page: number; pages: number } };
  },

  listAgenda: async () => {
    const data = await callApi('/api/email/agenda');
    return data.activities as EmailAgendaActivity[];
  },

  getThread: async (emailId: string) => {
    const data = await callApi(`/api/email/emails/${emailId}/thread`);
    return data.thread as EmailMessage[];
  },

  send: async (payload: {
    account_id?: string;
    to: string;
    subject: string;
    body_html: string;
    lead_id?: string | null;
  }) =>
    callApi('/api/email/send-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reply: async (emailId: string, body_html: string) =>
    callApi(`/api/email/emails/${emailId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body_html }),
    }),

  updateEmail: async (emailId: string, patch: Partial<Pick<EmailMessage, 'is_read' | 'is_archived' | 'lead_id'>>) =>
    callApi(`/api/email/emails/${emailId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
};
