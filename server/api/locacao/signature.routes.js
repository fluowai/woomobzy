/**
 * Signature Routes - Assinatura digital
 * /api/locacao/signatures
 */
import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { SignatureInvitationService } from '../../services/signatureInvitationService.js';

import { isValidUUID } from '../../lib/shared-utils.js';

const router = Router();

const signerSchema = z.object({
  lease_id: z.string().uuid(),
  signer_type: z.enum([
    'locador',
    'locatario',
    'fiador',
    'co_locatario',
    'testemunha_1',
    'testemunha_2',
  ]),
  signer_name: z.string().min(3),
  signer_email: z.string().email().optional(),
  signer_phone: z.string().optional(),
  signer_cpf: z.string().optional(),
});

export function getSignatureWebhookSecret(provider) {
  const genericSecret = String(
    process.env.SIGNATURE_WEBHOOK_SECRET || ''
  ).trim();
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
    if (!isValidUUID(lease_id))
      return res.status(400).json({ error: 'ID inválido' });

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
    logger.error('[SignatureRoutes] List error:', error);
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
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: validation.error.issues });
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
    logger.error('[SignatureRoutes] Create error:', error);
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
    if (!data)
      return res.status(404).json({ error: 'Signatário não encontrado' });

    // Check if all signers have signed
    const { data: allSignatures } = await supabase
      .from('signatures')
      .select('status')
      .eq('lease_id', data.lease_id);

    const totalSigners = allSignatures?.length || 0;
    const signedCount =
      allSignatures?.filter((s) => s.status === 'signed').length || 0;

    if (totalSigners > 0 && signedCount === totalSigners) {
      await supabase
        .from('rental_contracts')
        .update({
          signature_status: 'signed',
          signed_at: new Date().toISOString(),
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('id', data.lease_id);
    } else if (signedCount > 0) {
      await supabase
        .from('rental_contracts')
        .update({ signature_status: 'partially_signed' })
        .eq('id', data.lease_id);
    }

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[SignatureRoutes] Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/signatures/:id/send-invitation
 * Legacy: atualiza status para sent
 */
router.post(
  '/:id/send-invitation',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { method = 'ambos' } = req.body;

      if (!isValidUUID(id))
        return res.status(400).json({ error: 'ID inválido' });

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
      if (!signature)
        return res.status(404).json({ error: 'Signatário não encontrado' });

      await supabase
        .from('rental_contracts')
        .update({ signature_status: 'sent' })
        .eq('id', signature.lease_id)
        .eq('organization_id', req.orgId);

      res.json({ success: true, data: signature });
    } catch (error) {
      logger.error('[SignatureRoutes] Send invitation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/locacao/signatures/invite/:signature_id
 * Envia convite com email/whatsapp via SignatureInvitationService
 */
router.post(
  '/invite/:signature_id',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { signature_id } = req.params;
      if (!isValidUUID(signature_id))
        return res.status(400).json({ error: 'ID inválido' });

      const result = await SignatureInvitationService.sendInvitation(
        signature_id,
        req.orgId,
        req.user?.id
      );
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[SignatureRoutes] Invite error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/locacao/signatures/invite/bulk/:lease_id
 * Envia convite para todos os signatários de um contrato
 */
router.post(
  '/invite/bulk/:lease_id',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { lease_id } = req.params;
      if (!isValidUUID(lease_id))
        return res.status(400).json({ error: 'ID inválido' });

      const results = await SignatureInvitationService.sendBulkInvitations(
        lease_id,
        req.orgId,
        req.user?.id
      );
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/locacao/signatures/check-provider/:lease_id
 * Verifica status das assinaturas no provedor externo
 */
router.get(
  '/check-provider/:lease_id',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { lease_id } = req.params;
      if (!isValidUUID(lease_id))
        return res.status(400).json({ error: 'ID inválido' });

      const statuses =
        await SignatureInvitationService.checkProviderSignatureStatus(lease_id);
      res.json({ success: true, data: statuses });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

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

    const result = await SignatureInvitationService.handleWebhook(
      provider,
      req.body
    );
    res.json(result);
  } catch (error) {
    logger.error('[SignatureWebhook] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locacao/public/signature/:signatureId
 * Público: retorna dados da assinatura para a página de assinatura externa
 */
router.get('/public/signature/:signatureId', async (req, res) => {
  try {
    const { signatureId } = req.params;
    if (!isValidUUID(signatureId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const supabase = getSupabaseServer();
    const { data: sig, error } = await supabase
      .from('signatures')
      .select('*, lease:lease_id(*)')
      .eq('id', signatureId)
      .single();

    if (error || !sig) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    const { data: lease } = await supabase
      .from('rental_contracts')
      .select('*')
      .eq('id', sig.lease_id)
      .single();

    res.json({
      success: true,
      data: {
        signature: {
          id: sig.id,
          signer_name: sig.signer_name,
          signer_type: sig.signer_type,
          signer_email: sig.signer_email,
          signer_phone: sig.signer_phone,
          signer_cpf: sig.signer_cpf,
          status: sig.status,
          invitation_method: sig.invitation_method,
          signed_at: sig.signed_at,
          signature_hash: sig.signature_hash,
          signature_provider: sig.signature_provider,
          provider_signature_id: sig.provider_signature_id,
        },
        lease: lease || null,
      },
    });
  } catch (error) {
    logger.error('[PublicSignature] Error:', error);
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

/**
 * POST /api/locacao/public/signature/:signatureId/sign
 * Público: registra assinatura digital própria
 */
router.post('/public/signature/:signatureId/sign', async (req, res) => {
  try {
    const { signatureId } = req.params;
    const { signer_name, signer_cpf, ip_address, user_agent, signature_hash, acceptance_method } = req.body;

    if (!isValidUUID(signatureId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (!signer_name || !signature_hash) {
      return res.status(400).json({ error: 'Nome e hash da assinatura são obrigatórios' });
    }

    const supabase = getSupabaseServer();

    const { data: sig, error } = await supabase
      .from('signatures')
      .select('*, lease:lease_id(*)')
      .eq('id', signatureId)
      .single();

    if (error || !sig) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    if (sig.status === 'signed') {
      return res.status(400).json({ error: 'Documento já assinado' });
    }

    const updates = {
      status: 'signed',
      signed_at: new Date().toISOString(),
      ip_address: ip_address || req.ip,
      user_agent: user_agent || req.headers['user-agent'] || '',
      signature_hash,
      acceptance_method: acceptance_method || 'digital',
      signer_name: signer_name || sig.signer_name,
      signer_cpf: signer_cpf || sig.signer_cpf,
    };

    const { data: updated, error: updateError } = await supabase
      .from('signatures')
      .update(updates)
      .eq('id', signatureId)
      .select()
      .single();

    if (updateError) throw updateError;

    const { data: allSignatures } = await supabase
      .from('signatures')
      .select('status')
      .eq('lease_id', sig.lease_id);

    const totalSigners = allSignatures?.length || 0;
    const signedCount = allSignatures?.filter((s) => s.status === 'signed').length || 0;

    if (totalSigners > 0 && signedCount === totalSigners) {
      await supabase
        .from('rental_contracts')
        .update({
          signature_status: 'signed',
          signed_at: new Date().toISOString(),
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('id', sig.lease_id);
    } else if (signedCount > 0) {
      await supabase
        .from('rental_contracts')
        .update({ signature_status: 'partially_signed' })
        .eq('id', sig.lease_id);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('[PublicSign] Error:', error);
    res.status(500).json({ error: 'Erro ao registrar assinatura' });
  }
});

router.get('/providers/config', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('signature_provider_configs')
      .select('*')
      .eq('organization_id', req.orgId)
      .or('user_id.is.null,user_id.eq.' + (req.user?.id || '00000000-0000-0000-0000-000000000000'))
      .order('provider', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    logger.error('[SignatureProviders] List config error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/providers/config', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { provider, api_key, webhook_secret, api_url, is_active } = req.body;

    if (!provider || !['clicksign', 'zapsign', 'docusign', 'woosign'].includes(provider)) {
      return res.status(400).json({ error: 'Provedor inv�lido' });
    }

    const supabase = getSupabaseServer();
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('signature_provider_configs')
      .upsert({
        organization_id: req.orgId,
        user_id: userId,
        provider,
        api_key: api_key || null,
        webhook_secret: webhook_secret || null,
        api_url: api_url || null,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: ['organization_id', 'user_id', 'provider'],
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[SignatureProviders] Save config error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/providers/config/:provider', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { provider } = req.params;
    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from('signature_provider_configs')
      .delete()
      .eq('organization_id', req.orgId)
      .eq('user_id', req.user?.id)
      .eq('provider', provider);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    logger.error('[SignatureProviders] Delete config error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

