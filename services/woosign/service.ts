import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';
import { documensoApi } from './documenso';
import type {
  CreateEnvelopeInput,
  CreditLedgerEntry,
  CreditPackage,
  DocumensoEnvelope,
  DocumensoWebhookPayload,
  WhiteLabel,
  Wallet,
} from './types';

const DOCUMENSO_INTEGRATION_ENABLED =
  process.env.DOCUMENSO_API_URL && process.env.DOCUMENSO_API_TOKEN;

export class WooSignService {
  async getWhiteLabelById(id: string): Promise<WhiteLabel | null> {
    const { data, error } = await supabase
      .from('white_labels')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as WhiteLabel;
  }

  async resolveWhiteLabelByHostname(hostname: string): Promise<WhiteLabel | null> {
    const { data, error } = await supabase
      .from('white_labels')
      .select('*')
      .eq('domain', hostname)
      .eq('status', 'active')
      .single();

    if (error || !data) return null;
    return data as WhiteLabel;
  }

  async createEnvelope(input: CreateEnvelopeInput): Promise<DocumensoEnvelope> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      throw new Error('Documenso integration is not configured');
    }

    const envelopePayload: Record<string, unknown> = {
      title: input.title,
      recipients: input.recipients.map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
        role: recipient.role || 'SIGNER',
        signingOrder: recipient.signingOrder || 1,
      })),
      fields: input.fields?.map((field) => ({
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
        ...input.metadata,
        whiteLabelId: input.whiteLabelId,
        organizationId: input.organizationId,
        teamId: input.teamId,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
    };

    if (input.pdfUrl) {
      envelopePayload.document = {
        url: input.pdfUrl,
      };
    }

    if (input.templateId) {
      envelopePayload.templateId = input.templateId;
    }

    const envelope = await documensoApi.createEnvelope(envelopePayload);

    if (!envelope?.data) {
      logger.error('Failed to create Documenso envelope');
      throw new Error('Failed to create envelope');
    }

    return envelope.data;
  }

  async sendEnvelope(envelopeId: string): Promise<DocumensoEnvelope> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      throw new Error('Documenso integration is not configured');
    }

    const envelope = await documensoApi.sendEnvelope(envelopeId);

    if (!envelope?.data) {
      logger.error('Failed to send Documenso envelope');
      throw new Error('Failed to send envelope');
    }

    return envelope.data;
  }

  async cancelEnvelope(envelopeId: string): Promise<DocumensoEnvelope> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      throw new Error('Documenso integration is not configured');
    }

    const envelope = await documensoApi.cancelEnvelope(envelopeId);

    if (!envelope?.data) {
      logger.error('Failed to cancel Documenso envelope');
      throw new Error('Failed to cancel envelope');
    }

    return envelope.data;
  }

  async getEnvelopeStatus(envelopeId: string): Promise<DocumensoEnvelope | null> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      return null;
    }

    try {
      const envelope = await documensoApi.getEnvelope(envelopeId);

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

  async reserveCredit(
    walletId: string,
    envelopeId: string,
    amount: number,
    idempotencyKey: string
  ): Promise<boolean> {
    const { data: wallet, error: walletError } = await supabase
      .from('woosign_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    const availableBalance = (wallet as Wallet).balance - (wallet as Wallet).reservedBalance;

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
      .update({ reserved_balance: (wallet as Wallet).reservedBalance + amount })
      .eq('id', walletId);

    if (updateError) {
      logger.error('Failed to update wallet reserved balance', updateError);
      await supabase
        .from('woosign_credit_reservations')
        .update({ status: 'expired' })
        .eq('id', (reservation as { id: string }).id);
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

  async confirmCreditConsumption(
    walletId: string,
    envelopeId: string,
    amount: number,
    idempotencyKey: string
  ): Promise<void> {
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
      .eq('id', (reservation as { id: string }).id);

    const { data: wallet, error: walletError } = await supabase
      .from('woosign_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    const newBalance = (wallet as Wallet).balance - amount;
    const newReservedBalance = (wallet as Wallet).reservedBalance - amount;

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

  async releaseCreditReservation(walletId: string, envelopeId: string, reason?: string): Promise<void> {
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
      .eq('id', (reservation as { id: string }).id);

    const { data: wallet, error: walletError } = await supabase
      .from('woosign_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      return;
    }

    const newReservedBalance = (wallet as Wallet).reservedBalance - (reservation as { amount: number }).amount;

    await supabase
      .from('woosign_wallets')
      .update({ reserved_balance: newReservedBalance })
      .eq('id', walletId);

    await this.createLedgerEntry({
      walletId,
      type: 'release',
      amount: (reservation as { amount: number }).amount,
      description: `Reserva liberada para envelope ${envelopeId}${reason ? `: ${reason}` : ''}`,
      referenceType: 'envelope',
      referenceId: envelopeId,
      idempotencyKey: `${(reservation as { id: string }).id}-release`,
    });
  }

  async createLedgerEntry(input: {
    walletId: string;
    type: CreditLedgerEntry['type'];
    amount: number;
    description?: string;
    referenceType?: string;
    referenceId?: string;
    sourceWalletId?: string;
    targetWalletId?: string;
    idempotencyKey: string;
  }): Promise<CreditLedgerEntry> {
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

    return data as CreditLedgerEntry;
  }

  async listEnvelopes(status?: string): Promise<DocumensoEnvelope[]> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      return [];
    }

    const { data, error } = await supabase
      .from('woosign_envelope_mappings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    const envelopeIds = (data as Array<{ documenso_envelope_id: string }>)
      .map((item) => item.documenso_envelope_id)
      .filter(Boolean);

    if (envelopeIds.length === 0) {
      return [];
    }

    const envelopes = await Promise.all(
      envelopeIds.map((id) => this.getEnvelopeStatus(id))
    );

    return envelopes.filter((envelope): envelope is DocumensoEnvelope => Boolean(envelope));
  }

  async listTemplates(): Promise<Array<{ id: string; name: string }>> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      return [];
    }

    const result = await documensoApi.getTemplates();
    return (result.data || []).map((template) => ({
      id: String(template.id),
      name: template.name,
    }));
  }

  async listWallets(): Promise<Wallet[]> {
    const { data, error } = await supabase
      .from('woosign_wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data as Wallet[];
  }

  async listCreditPackages(): Promise<CreditPackage[]> {
    const { data, error } = await supabase
      .from('woosign_credit_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data as CreditPackage[];
  }

  async handleDocumensoWebhook(
    payload: DocumensoWebhookPayload
  ): Promise<void> {
    logger.info('Received Documenso webhook', { event: payload.event, envelopeId: payload.envelopeId });

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

      await this.releaseCreditReservation(mapping.wallet_id, envelopeId, `Envelope ${payload.event.toLowerCase()}`);
    }
  }

  async createContractEnvelope(input: {
    contractId: string;
    organizationId: string;
    teamId?: string;
    userId: string;
    pdfUrl: string;
    recipients: Array<{ email: string; name: string; role?: string }>;
    title: string;
  }): Promise<DocumensoEnvelope | null> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      return null;
    }

    const { data: wallet } = await supabase
      .from('woosign_wallets')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('team_id', input.teamId || null)
      .eq('user_id', input.userId)
      .maybeSingle();

    const walletId = wallet?.id || 'default';

    const envelope = await this.createEnvelope({
      whiteLabelId: 'default',
      organizationId: input.organizationId,
      teamId: input.teamId,
      userId: input.userId,
      title: input.title,
      pdfUrl: input.pdfUrl,
      recipients: input.recipients.map((recipient, index) => ({
        email: recipient.email,
        name: recipient.name,
        role: recipient.role || 'SIGNER',
        signingOrder: index + 1,
      })),
      idempotencyKey: `contract-${input.contractId}-${Date.now()}`,
    });

    await supabase.from('woosign_envelope_mappings').insert({
      white_label_id: 'default',
      organization_id: input.organizationId,
      team_id: input.teamId,
      user_id: input.userId,
      documenso_envelope_id: envelope.id,
      wallet_id: walletId,
      credit_amount: 1,
      idempotency_key: `contract-${input.contractId}-${Date.now()}`,
      metadata: { contract_id: input.contractId },
    });

    return envelope;
  }
}

export const woosignService = new WooSignService();
