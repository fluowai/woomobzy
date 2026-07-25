import { Router } from 'express';
import { getSupabaseServer } from '../../../lib/supabase-server.js';
import { verifyAuth } from '../../../middleware/auth.js';
import { requireTenant } from '../../../middleware/tenant.js';
import { onrService } from '../../../services/onrService.js';
import { isValidUUID } from '../../../lib/shared-utils.js';

const router = Router();

// Função auxiliar para obter as credenciais ONR da organização logada
async function getOrgOnrConfig(supabase, orgId) {
  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();

  if (error || !data) {
    throw new Error('Organização não encontrada.');
  }

  const settings = data.settings || {};
  return {
    onr_client_id: settings.onr_client_id,
    onr_client_secret: settings.onr_client_secret,
  };
}

/**
 * POST /api/documents/onr/request
 * Solicita uma nova certidão (ex: Inteiro Teor) para um imóvel
 */
router.post('/request', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { propertyId, registrationNumber, cns, certificateType } = req.body;
    
    if (!registrationNumber || !cns) {
      return res.status(400).json({ error: 'Número de matrícula e CNS do cartório são obrigatórios.' });
    }

    const supabase = getSupabaseServer();
    const orgConfig = await getOrgOnrConfig(supabase, req.orgId);

    // Valida se o cliente já configurou as credenciais ONR
    if (!orgConfig.onr_client_id || !orgConfig.onr_client_secret) {
      return res.status(403).json({ 
        error: 'Credenciais do ONR não configuradas.',
        code: 'ONR_NOT_CONFIGURED' 
      });
    }

    // Chama o serviço do ONR para solicitar a certidão
    const onrResponse = await onrService.requestCertificate(orgConfig, {
      registrationNumber,
      cns,
      certificateType,
    });

    // Se o ONR retornou o protocolo, podemos registrar no nosso banco (se houver a tabela)
    // Exemplo:
    /*
    await supabase.from('onr_requests').insert([{
      organization_id: req.orgId,
      property_id: propertyId,
      protocol: onrResponse.protocolo,
      status: 'PENDENTE',
      requested_by: req.user.id
    }]);
    */

    res.json({ 
      success: true, 
      message: 'Certidão solicitada com sucesso.',
      protocol: onrResponse.protocolo || onrResponse.id || onrResponse
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
router.get('/status/:protocolId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { protocolId } = req.params;
    
    if (!protocolId) {
      return res.status(400).json({ error: 'ID do Protocolo é obrigatório.' });
    }

    const supabase = getSupabaseServer();
    const orgConfig = await getOrgOnrConfig(supabase, req.orgId);

    const statusResponse = await onrService.checkProtocolStatus(orgConfig, protocolId);

    res.json({ success: true, data: statusResponse });
  } catch (error) {
    console.error('[ONR Route] Erro ao consultar protocolo:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
