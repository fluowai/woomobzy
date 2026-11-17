import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { onrService } from '../../services/onrService.js';
import { isValidUUID } from '../../lib/shared-utils.js';

const router = Router();

// Função auxiliar para obter as credenciais ONR da organização logada
async function getOrgOnrConfig(supabase, orgId) {
  try {
    const { data } = await supabase
      .from('organizations')
      .select('id, feature_flags')
      .eq('id', orgId)
      .maybeSingle();

    const flags = data?.feature_flags || {};
    return {
      onr_client_id: flags.onr_client_id || flags.onr?.client_id || process.env.ONR_CLIENT_ID || null,
      onr_client_secret: flags.onr_client_secret || flags.onr?.client_secret || process.env.ONR_CLIENT_SECRET || null,
    };
  } catch {
    return {
      onr_client_id: process.env.ONR_CLIENT_ID || null,
      onr_client_secret: process.env.ONR_CLIENT_SECRET || null,
    };
  }
}

/**
 * POST /api/documents/onr/request
 * Solicita uma nova certidão (ex: Inteiro Teor) para um imóvel
 */
router.post('/request', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { propertyId, registrationNumber, cns, certificateType } = req.body;

    if (!registrationNumber || !cns) {
      return res
        .status(400)
        .json({
          error: 'Número de matrícula e CNS do cartório são obrigatórios.',
        });
    }

    const supabase = getSupabaseServer();
    const orgConfig = await getOrgOnrConfig(supabase, req.orgId);

    // Valida se o cliente já configurou as credenciais ONR
    if (!orgConfig.onr_client_id || !orgConfig.onr_client_secret) {
      return res.status(403).json({
        error: 'Credenciais do ONR não configuradas.',
        code: 'ONR_NOT_CONFIGURED',
      });
    }

    // Chama o serviço do ONR para solicitar a certidão
    const onrResponse = await onrService.requestCertificate(orgConfig, {
      registrationNumber,
      cns,
      certificateType,
    });

    const protocol =
      onrResponse.protocolo || onrResponse.id || String(onrResponse);

    try {
      await supabase.from('onr_requests').insert([
        {
          organization_id: req.orgId,
          property_id: isValidUUID(propertyId) ? propertyId : null,
          registration_number: registrationNumber,
          cns,
          certificate_type: certificateType || 'INTEIRO_TEOR',
          protocol,
          status: 'PENDENTE',
          requested_by: req.authUserId || req.user?.id || null,
          result_data: typeof onrResponse === 'object' ? onrResponse : { raw: onrResponse },
        },
      ]);
    } catch (persistErr) {
      console.warn(
        '[ONR Route] Falha nao critica ao persistir onr_requests:',
        persistErr?.message
      );
    }

    res.json({
      success: true,
      message: 'Certidão solicitada com sucesso.',
      protocol,
    });
  } catch (error) {
    console.error('[ONR Route] Erro ao solicitar certidao:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/onr/status/:protocolId
 * Consulta o status de uma certidão previamente solicitada
 */
router.get(
  '/status/:protocolId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { protocolId } = req.params;

      if (!protocolId) {
        return res
          .status(400)
          .json({ error: 'ID do Protocolo é obrigatório.' });
      }

      const supabase = getSupabaseServer();
      const orgConfig = await getOrgOnrConfig(supabase, req.orgId);

      const statusResponse = await onrService.checkProtocolStatus(
        orgConfig,
        protocolId
      );

      res.json({ success: true, data: statusResponse });
    } catch (error) {
      console.error('[ONR Route] Erro ao consultar protocolo:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
