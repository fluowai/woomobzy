import { getSupabaseServer } from '../lib/supabase-server.js';
import { logger } from '../utils/logger.js';

const DOCUMENSO_API_URL =
  process.env.DOCUMENSO_API_URL || 'http://localhost:3000/api/v2';
const DOCUMENSO_API_TOKEN = process.env.DOCUMENSO_API_TOKEN || '';
const DOCUMENSO_INTEGRATION_ENABLED = Boolean(
  DOCUMENSO_API_URL && DOCUMENSO_API_TOKEN
);

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

    const envelopeIds = data
      .map((item) => item.documenso_envelope_id)
      .filter(Boolean);

    if (envelopeIds.length === 0) {
      return [];
    }

    const envelopes = (
      await Promise.all(envelopeIds.map((id) => this.getEnvelope(id)))
    ).filter(Boolean);

    return status
      ? envelopes.filter((envelope) => envelope.status === status)
      : envelopes;
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

  async handleDocumensoWebhook(payload) {
    logger.info('Received Documenso webhook', {
      event: payload.event,
      envelopeId: payload.envelopeId,
    });

    const supabase = getSupabaseServer();

    if (payload.event === 'DOCUMENT_COMPLETED') {
      const envelopeId = payload.envelopeId;
      const { data: mapping, error } = await supabase
        .from('woosign_envelope_mappings')
        .select('*')
        .eq('documenso_envelope_id', envelopeId)
        .single();

      if (error || !mapping) {
        logger.warn('Envelope mapping not found', { envelopeId });
        return;
      }

      await this.confirmCreditConsumption(
        mapping.wallet_id,
        envelopeId,
        mapping.credit_amount,
        mapping.idempotency_key
      );
    } else if (
      payload.event === 'DOCUMENT_CANCELLED' ||
      payload.event === 'DOCUMENT_REJECTED'
    ) {
      const envelopeId = payload.envelopeId;
      const { data: mapping, error } = await supabase
        .from('woosign_envelope_mappings')
        .select('*')
        .eq('documenso_envelope_id', envelopeId)
        .single();

      if (error || !mapping) {
        logger.warn('Envelope mapping not found', { envelopeId });
        return;
      }

      await this.releaseCreditReservation(
        mapping.wallet_id,
        envelopeId,
        `Envelope ${payload.event.toLowerCase()}`
      );
    }
  }

  async reserveCredit(walletId, envelopeId, amount, idempotencyKey) {
    const supabase = getSupabaseServer();

    const { data: wallet, error: walletError } = await supabase
      .from('woosign_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    const availableBalance = wallet.balance - wallet.reservedBalance;

    if (availableBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const { data: reservation, error: reservationError } = await supabase
      .from('woosign_credit_reservations')
      .insert({
        wallet_id: walletId,
        envelope_id: envelopeId,
        amount,
        status: 'reserved',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      logger.error('Failed to create credit reservation', reservationError);
      throw reservationError || new Error('Failed to create reservation');
    }

    const { error: updateError } = await supabase
      .from('woosign_wallets')
      .update({ reserved_balance: wallet.reservedBalance + amount })
      .eq('id', walletId);

    if (updateError) {
      logger.error('Failed to update wallet reserved balance', updateError);
      await supabase
        .from('woosign_credit_reservations')
        .update({ status: 'expired' })
        .eq('id', reservation.id);
      throw updateError;
    }

    await this.createLedgerEntry({
      walletId,
      type: 'reservation',
      amount: -amount,
      description: `Reserva para envelope ${envelopeId}`,
      referenceType: 'envelope',
      referenceId: envelopeId,
      idempotencyKey: `${idempotencyKey}-reservation`,
    });

    return true;
  }

  async confirmCreditConsumption(walletId, envelopeId, amount, idempotencyKey) {
    const supabase = getSupabaseServer();

    const { data: reservation, error: reservationError } = await supabase
      .from('woosign_credit_reservations')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('envelope_id', envelopeId)
      .eq('status', 'reserved')
      .single();

    if (reservationError || !reservation) {
      throw new Error('Reservation not found');
    }

    await supabase
      .from('woosign_credit_reservations')
      .update({ status: 'confirmed' })
      .eq('id', reservation.id);

    const { data: wallet, error: walletError } = await supabase
      .from('woosign_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    const newBalance = wallet.balance - amount;
    const newReservedBalance = wallet.reservedBalance - amount;

    const { error: updateError } = await supabase
      .from('woosign_wallets')
      .update({
        balance: newBalance,
        reserved_balance: newReservedBalance,
      })
      .eq('id', walletId);

    if (updateError) {
      logger.error('Failed to confirm credit consumption', updateError);
      throw updateError;
    }

    await this.createLedgerEntry({
      walletId,
      type: 'consumption',
      amount: -amount,
      description: `Consumo confirmado para envelope ${envelopeId}`,
      referenceType: 'envelope',
      referenceId: envelopeId,
      idempotencyKey,
    });
  }

  async releaseCreditReservation(walletId, envelopeId, reason) {
    const supabase = getSupabaseServer();

    const { data: reservation, error: reservationError } = await supabase
      .from('woosign_credit_reservations')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('envelope_id', envelopeId)
      .eq('status', 'reserved')
      .single();

    if (reservationError || !reservation) {
      return;
    }

    await supabase
      .from('woosign_credit_reservations')
      .update({ status: 'released' })
      .eq('id', reservation.id);

    const { data: wallet, error: walletError } = await supabase
      .from('woosign_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      return;
    }

    const newReservedBalance = wallet.reservedBalance - reservation.amount;

    await supabase
      .from('woosign_wallets')
      .update({ reserved_balance: newReservedBalance })
      .eq('id', walletId);

    await this.createLedgerEntry({
      walletId,
      type: 'release',
      amount: reservation.amount,
      description: `Reserva liberada para envelope ${envelopeId}${reason ? `: ${reason}` : ''}`,
      referenceType: 'envelope',
      referenceId: envelopeId,
      idempotencyKey: `${reservation.id}-release`,
    });
  }

  async createLedgerEntry(input) {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('woosign_credit_ledger')
      .insert({
        wallet_id: input.walletId,
        type: input.type,
        amount: input.amount,
        description: input.description,
        reference_type: input.referenceType,
        reference_id: input.referenceId,
        source_wallet_id: input.sourceWalletId,
        target_wallet_id: input.targetWalletId,
        idempotency_key: input.idempotencyKey,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create credit ledger entry', error);
      throw error;
    }

    return data;
  }
}

export const woosignService = new WooSignService();
