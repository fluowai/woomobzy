import { getSupabaseServer } from '../lib/supabase-server.js';
import { logger } from '../utils/logger.js';

const DOCUMENSO_API_URL = process.env.DOCUMENSO_API_URL || 'http://localhost:3000/api/v2';
const DOCUMENSO_API_TOKEN = process.env.DOCUMENSO_API_TOKEN || '';
const DOCUMENSO_INTEGRATION_ENABLED = Boolean(DOCUMENSO_API_URL && DOCUMENSO_API_TOKEN);

class DocumensoApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = 'DocumensoApiError';
    this.status = status;
    this.body = body;
  }
}

async function documensoRequest(path, options = {}) {
  const url = `${DOCUMENSO_API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
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
    let body = null;
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
    return {};
  }

  return response.json();
}

class WooSignService {
  async getEnvelope(envelopeId) {
    if (!DOCUMENSO_INTEGRATION_ENABLED) return null;

    try {
      const envelope = await documensoRequest(`/envelopes/${envelopeId}`);
      if (!envelope?.data) {
        logger.error('Failed to fetch Documenso envelope');
        return null;
      }
      return envelope.data;
    } catch (error) {
      logger.error('Failed to fetch Documenso envelope', error);
      return null;
    }
  }

  async createEnvelope(input) {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      throw new Error('Documenso integration is not configured');
    }

    const envelopePayload = {
      title: input.title,
      recipients: (input.recipients || []).map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
        role: recipient.role || 'SIGNER',
        signingOrder: recipient.signingOrder || 1,
      })),
      fields: (input.fields || []).map((field) => ({
        type: field.type,
        page: field.page,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        recipientEmail: field.recipientEmail,
        required: field.required ?? true,
      })),
      externalId: input.idempotencyKey,
      metadata: {
        ...(input.metadata || {}),
        whiteLabelId: input.whiteLabelId,
        organizationId: input.organizationId,
        teamId: input.teamId,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
    };

    if (input.pdfUrl) {
      envelopePayload.document = { url: input.pdfUrl };
    }

    if (input.templateId) {
      envelopePayload.templateId = input.templateId;
    }

    const envelope = await documensoRequest('/envelopes', {
      method: 'POST',
      body: envelopePayload,
    });

    if (!envelope?.data) {
      logger.error('Failed to create Documenso envelope');
      throw new Error('Failed to create envelope');
    }

    return envelope.data;
  }

  async sendEnvelope(envelopeId) {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      throw new Error('Documenso integration is not configured');
    }

    const envelope = await documensoRequest(`/envelopes/${envelopeId}/send`, {
      method: 'POST',
    });

    if (!envelope?.data) {
      logger.error('Failed to send Documenso envelope');
      throw new Error('Failed to send envelope');
    }

    return envelope.data;
  }

  async cancelEnvelope(envelopeId) {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      throw new Error('Documenso integration is not configured');
    }

    const envelope = await documensoRequest(`/envelopes/${envelopeId}/cancel`, {
      method: 'POST',
    });

    if (!envelope?.data) {
      logger.error('Failed to cancel Documenso envelope');
      throw new Error('Failed to cancel envelope');
    }

    return envelope.data;
  }

  async listEnvelopes(status) {
    if (!DOCUMENSO_INTEGRATION_ENABLED) return [];

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('woosign_envelope_mappings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      logger.error('Failed to list envelope mappings', error);
      return [];
    }

    const envelopeIds = data.map((item) => item.documenso_envelope_id).filter(Boolean);

    if (envelopeIds.length === 0) {
      return [];
    }

    const envelopes = (
      await Promise.all(envelopeIds.map((id) => this.getEnvelope(id)))
    ).filter(Boolean);

    return status ? envelopes.filter((envelope) => envelope.status === status) : envelopes;
  }

  async listTemplates() {
    if (!DOCUMENSO_INTEGRATION_ENABLED) return [];

    const result = await documensoRequest('/templates');
    return (result.data || []).map((template) => ({
      id: String(template.id),
      name: template.name,
    }));
  }

  async listWallets() {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('woosign_wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      logger.error('Failed to list wallets', error);
      return [];
    }

    return data;
  }

  async createContractEnvelope(input) {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      return null;
    }

    const supabase = getSupabaseServer();

    const { data: wallet } = await supabase
      .from('woosign_wallets')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('team_id', input.teamId || null)
      .eq('user_id', input.userId)
      .maybeSingle();

    const walletId = wallet?.id || 'default';
    const idempotencyKey = `contract-${input.contractId}-${Date.now()}`;

    const envelope = await this.createEnvelope({
      whiteLabelId: 'default',
      organizationId: input.organizationId,
      teamId: input.teamId,
      userId: input.userId,
      title: input.title,
      pdfUrl: input.pdfUrl,
      recipients: (input.recipients || []).map((recipient, index) => ({
        email: recipient.email,
        name: recipient.name,
        role: recipient.role || 'SIGNER',
        signingOrder: index + 1,
      })),
      idempotencyKey,
    });

    await supabase.from('woosign_envelope_mappings').insert({
      white_label_id: 'default',
      organization_id: input.organizationId,
      team_id: input.teamId,
      user_id: input.userId,
      documenso_envelope_id: envelope.id,
      wallet_id: walletId,
      credit_amount: 1,
      idempotency_key: idempotencyKey,
      metadata: { contract_id: input.contractId },
    });

    return envelope;
  }
}

export const woosignService = new WooSignService();
