/**
 * WhatsApp Proxy Routes
 * Proxies WhatsApp/Evolution API calls from the frontend so that secrets
 * (API tokens, base URLs) never reach the browser.
 *
 * POST /api/whatsapp-proxy/send-text
 * POST /api/whatsapp-proxy/test-connection
 */
import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const router = Router();

async function getEvolutionConfig(req) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('site_settings')
    .select('integrations')
    .eq('organization_id', req.orgId)
    .maybeSingle();

  if (error || !data?.integrations?.evolutionApi) {
    return null;
  }

  const ea = data.integrations.evolutionApi;
  if (!ea.enabled || !ea.baseUrl || !ea.token || !ea.instanceName) {
    return null;
  }

  return {
    baseUrl: ea.baseUrl.replace(/\/$/, ''),
    token: ea.token,
    instanceName: ea.instanceName,
  };
}

function normalizePhone(phone) {
  let clean = (phone || '').replace(/\D/g, '');
  if (clean.length > 0 && !clean.startsWith('55') && clean.length <= 11) {
    clean = `55${clean}`;
  }
  return clean;
}

/**
 * POST /api/whatsapp-proxy/send-text
 * Body: { phone: string, message: string }
 */
router.post('/send-text', verifyAuth, requireTenant, async (req, res) => {
  try {
    const config = await getEvolutionConfig(req);
    if (!config) {
      return res.status(503).json({
        error: 'Evolution API não configurada ou desativada.',
        code: 'EVOLUTION_NOT_CONFIGURED',
      });
    }

    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone e message são obrigatórios.' });
    }

    const cleanPhone = normalizePhone(phone);
    let normalizedBaseUrl = config.baseUrl;
    if (!normalizedBaseUrl.startsWith('http')) {
      normalizedBaseUrl = `https://${normalizedBaseUrl}`;
    }

    const response = await fetch(
      `${normalizedBaseUrl}/message/sendText/${config.instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.token,
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: message,
          delay: 1200,
          linkPreview: false,
        }),
      }
    );

    if (response.ok) {
      return res.json({ success: true });
    }

    const errorData = await response.json().catch(() => ({}));
    return res.status(response.status).json({
      error: errorData.message || `Erro na API: ${response.statusText}`,
      code: 'EVOLUTION_API_ERROR',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Falha ao enviar mensagem.' });
  }
});

/**
 * POST /api/whatsapp-proxy/test-connection
 * No body needed - uses stored config for the tenant.
 */
router.post('/test-connection', verifyAuth, requireTenant, async (req, res) => {
  try {
    const config = await getEvolutionConfig(req);
    if (!config) {
      return res.status(503).json({
        ok: false,
        error: 'Evolution API não configurada ou desativada.',
        code: 'EVOLUTION_NOT_CONFIGURED',
      });
    }

    let normalizedBaseUrl = config.baseUrl;
    if (!normalizedBaseUrl.startsWith('http')) {
      normalizedBaseUrl = `https://${normalizedBaseUrl}`;
    }

    const response = await fetch(
      `${normalizedBaseUrl}/instance/connectionState/${config.instanceName}`,
      {
        method: 'GET',
        headers: { apikey: config.token },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `Erro HTTP: ${response.status}`,
      });
    }

    const data = await response.json();
    const state = data?.instance?.state || data?.state;

    return res.json({
      ok: state === 'open' || state === 'connecting',
      state,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Falha na conexão.',
    });
  }
});

export default router;
