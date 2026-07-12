/**
 * Signature Routes - Assinatura digital
 * /api/locacao/signatures
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { SignatureInvitationService } from '../../services/signatureInvitationService.js';

import { isValidUUID } from '../../lib/shared-utils.js';

const router = Router();

const signerSchema = z.object({
  lease_id: z.string().uuid(),
  signer_type: z.enum(['locador', 'locatario', 'fiador', 'co_locatario', 'testemunha_1', 'testemunha_2']),
  signer_name: z.string().min(3),
  signer_email: z.string().email().optional(),
  signer_phone: z.string().optional(),
  signer_cpf: z.string().optional(),
});

export function getSignatureWebhookSecret(provider) {
  const genericSecret = String(process.env.SIGNATURE_WEBHOOK_SECRET || '').trim();
  const providerSecret =
    provider === 'clicksign'
      ? String(process.env.CLICKSIGN_WEBHOOK_SECRET || '').trim()
      : provider === 'zapsign'
        ? String(process.env.ZAPSIGN_WEBHOOK_SECRET || '').trim()
        : '';

  return providerSecret || genericSecret;
}

export function getIncomingSignatureWebhookSecret(req) {
  return String(
    req.query.token ||
      req.query.secret ||
      req.headers['x-signature-webhook-secret'] ||
      req.headers['x-webhook-secret'] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
      ''
  ).trim();
}

export function assertSignatureWebhookAuthorized(req, provider) {
  const expectedSecret = getSignatureWebhookSecret(provider);
  if (!expectedSecret) {
    const error = new Error('Webhook de assinatura nao configurado');
    error.statusCode = 503;
    throw error;
  }

  const receivedSecret = getIncomingSignatureWebhookSecret(req);
  if (!receivedSecret || receivedSecret !== expectedSecret) {
    const error = new Error('Webhook de assinatura nao autorizado');
    error.statusCode = 401;
    throw error;
  }
}

/**
 * GET /api/locacao/signatures/:lease_id
 */
router.get('/:lease_id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id } = req.params;
    if (!isValidUUID(lease_id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('lease_id', lease_id)
      .eq('organization_id', req.orgId)
      .order('signer_type', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[SignatureRoutes] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/signatures
 */
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = signerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('signatures')
      .insert({
        organization_id: req.orgId,
        ...validation.data,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[SignatureRoutes] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/locacao/signatures/:id/status
 */
router.patch('/:id/status', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ip_address, user_agent, signature_hash } = req.body;

    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const validStatuses = ['pending', 'sent', 'signed', 'refused', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const supabase = getSupabaseServer();
    const updates = { status };

    if (status === 'signed') {
      updates.signed_at = new Date().toISOString();
      updates.ip_address = ip_address || req.ip;
      updates.user_agent = user_agent;
      updates.signature_hash = signature_hash;
    }

    const { data, error } = await supabase
      .from('signatures')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Signatário não encontrado' });

    // Check if all signers have signed
    const { data: allSignatures } = await supabase
      .from('signatures')
      .select('status')
      .eq('lease_id', data.lease_id);

    const totalSigners = allSignatures?.length || 0;
    const signedCount = allSignatures?.filter(s => s.status === 'signed').length || 0;

    if (totalSigners > 0 && signedCount === totalSigners) {
      await supabase
        .from('leases')
        .update({
          signature_status: 'signed',
          signed_at: new Date().toISOString(),
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('id', data.lease_id);
    } else if (signedCount > 0) {
      await supabase
        .from('leases')
        .update({ signature_status: 'partially_signed' })
        .eq('id', data.lease_id);
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('[SignatureRoutes] Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/signatures/:id/send-invitation
 * Legacy: atualiza status para sent
 */
router.post('/:id/send-invitation', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { method = 'ambos' } = req.body;

    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();

    const { data: signature, error } = await supabase
      .from('signatures')
      .update({
        status: 'sent',
        invitation_sent_at: new Date().toISOString(),
        invitation_method: method,
      })
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;
    if (!signature) return res.status(404).json({ error: 'Signatário não encontrado' });

    // Update lease signature status
    await supabase
      .from('leases')
      .update({ signature_status: 'sent' })
      .eq('id', signature.lease_id)
      .eq('organization_id', req.orgId);

    res.json({ success: true, data: signature });
  } catch (error) {
    console.error('[SignatureRoutes] Send invitation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/signatures/invite/:signature_id
 * Envia convite com email/whatsapp via SignatureInvitationService
 */
router.post('/invite/:signature_id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { signature_id } = req.params;
    if (!isValidUUID(signature_id)) return res.status(400).json({ error: 'ID inválido' });

    const result = await SignatureInvitationService.sendInvitation(signature_id, req.orgId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[SignatureRoutes] Invite error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/signatures/invite/bulk/:lease_id
 * Envia convite para todos os signatários de um contrato
 */
router.post('/invite/bulk/:lease_id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id } = req.params;
    if (!isValidUUID(lease_id)) return res.status(400).json({ error: 'ID inválido' });

    const results = await SignatureInvitationService.sendBulkInvitations(lease_id, req.orgId);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locacao/signatures/check-provider/:lease_id
 * Verifica status das assinaturas no provedor externo
 */
router.get('/check-provider/:lease_id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id } = req.params;
    if (!isValidUUID(lease_id)) return res.status(400).json({ error: 'ID inválido' });

    const statuses = await SignatureInvitationService.checkProviderSignatureStatus(lease_id);
    res.json({ success: true, data: statuses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/signatures/webhook/:provider
 * Webhook para receber atualizações de provedores externos
 */
router.post('/webhook/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    if (!['clicksign', 'zapsign'].includes(provider)) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    assertSignatureWebhookAuthorized(req, provider);

    const result = await SignatureInvitationService.handleWebhook(provider, req.body);
    res.json(result);
  } catch (error) {
    console.error('[SignatureWebhook] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
