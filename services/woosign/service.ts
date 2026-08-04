import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';
import { documensoApi } from './documenso';
import type {
  CreateEnvelopeInput,
  CreditLedgerEntry,
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

    const { data: envelope, error } = await documensoApi.createEnvelope(envelopePayload);

    if (error) {
      logger.error('Failed to create Documenso envelope', error);
      throw error;
    }

    return envelope.data;
  }

  async sendEnvelope(envelopeId: string): Promise<DocumensoEnvelope> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      throw new Error('Documenso integration is not configured');
    }

    const { data, error } = await documensoApi.sendEnvelope(envelopeId);

    if (error) {
      logger.error('Failed to send Documenso envelope', error);
      throw error;
    }

    return data.data;
  }

  async cancelEnvelope(envelopeId: string): Promise<DocumensoEnvelope> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      throw new Error('Documenso integration is not configured');
    }

    const { data, error } = await documensoApi.cancelEnvelope(envelopeId);

    if (error) {
      logger.error('Failed to cancel Documenso envelope', error);
      throw error;
    }

    return data.data;
  }

  async getEnvelopeStatus(envelopeId: string): Promise<DocumensoEnvelope | null> {
    if (!DOCUMENSO_INTEGRATION_ENABLED) {
      return null;
    }

    try {
      const { data, error } = await documensoApi.getEnvelope(envelopeId);

      if (error) {
        logger.error('Failed to fetch Documenso envelope', error);
        return null;
      }

      return data.data;
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
}

export const woosignService = new WooSignService();
