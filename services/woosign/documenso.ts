import type { DocumensoEnvelope, DocumensoField } from './types';

const DOCUMENSO_API_URL = process.env.DOCUMENSO_API_URL || 'http://localhost:3000/api/v2';
const DOCUMENSO_API_TOKEN = process.env.DOCUMENSO_API_TOKEN || '';
const DOCUMENSO_WEBHOOK_SECRET = process.env.DOCUMENSO_WEBHOOK_SECRET || '';

export interface DocumensoApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export class DocumensoApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = 'DocumensoApiError';
  }
}

async function request<T>(path: string, options: DocumensoApiOptions = {}): Promise<T> {
  const url = `${DOCUMENSO_API_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (DOCUMENSO_API_TOKEN) {
    headers['Authorization'] = `Bearer ${DOCUMENSO_API_TOKEN}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new DocumensoApiError(
      response.status,
      `Documenso API error: ${response.status} ${response.statusText}`,
      body
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const documensoApi = {
  async getOrganisations() {
    return request<{ data: Array<{ id: string; name: string; createdAt: string }> }>('/organisations');
  },

  async getTeams(organisationId: string) {
    return request<{ data: Array<{ id: number; name: string; createdAt: string }> }>(
      `/organisations/${organisationId}/teams`
    );
  },

  async getEnvelopes(params?: { status?: string; teamId?: number; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.teamId) query.set('teamId', String(params.teamId));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ data: DocumensoEnvelope[]; total?: number }>(`/envelopes${qs ? `?${qs}` : ''}`);
  },

  async getEnvelope(id: string) {
    return request<{ data: DocumensoEnvelope }>(`/envelopes/${id}`);
  },

  async createEnvelope(payload: Record<string, unknown>) {
    return request<{ data: DocumensoEnvelope }>('/envelopes', {
      method: 'POST',
      body: payload,
    });
  },

  async sendEnvelope(id: string) {
    return request<{ data: DocumensoEnvelope }>(`/envelopes/${id}/send`, {
      method: 'POST',
    });
  },

  async cancelEnvelope(id: string) {
    return request<{ data: DocumensoEnvelope }>(`/envelopes/${id}/cancel`, {
      method: 'POST',
    });
  },

  async deleteEnvelope(id: string) {
    return request<{ data: DocumensoEnvelope }>(`/envelopes/${id}`, {
      method: 'DELETE',
    });
  },

  async getTemplates(params?: { teamId?: number; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.teamId) query.set('teamId', String(params.teamId));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ data: Array<{ id: number; name: string; createdAt: string }> }>(
      `/templates${qs ? `?${qs}` : ''}`
    );
  },

  async getTemplate(id: number) {
    return request<{ data: { id: number; name: string; fields: DocumensoField[] } }>(`/templates/${id}`);
  },

  async createTemplate(payload: Record<string, unknown>) {
    return request<{ data: { id: number; name: string } }>('/templates', {
      method: 'POST',
      body: payload,
    });
  },

  async getDocument(id: string) {
    return request<{ data: { id: string; downloadUrl?: string; certificateUrl?: string } }>(
      `/documents/${id}`
    );
  },

  async getWebhooks(teamId: number) {
    return request<{ data: Array<{ id: string; url: string; eventTriggers: string[]; enabled: boolean }> }>(
      `/teams/${teamId}/webhooks`
    );
  },

  async createWebhook(teamId: number, payload: Record<string, unknown>) {
    return request<{ data: { id: string; url: string } }>(`/teams/${teamId}/webhooks`, {
      method: 'POST',
      body: payload,
    });
  },
};

export function verifyDocumensoWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signature === expected;
}

export function getDocumensoWebhookSecret(): string {
  return DOCUMENSO_WEBHOOK_SECRET;
}
