import { Router } from 'express';
import { licensingLimiter } from '../../middleware/rateLimit.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  activateInstallation,
  LicenseEndpointError,
  sendHeartbeat,
  validateInstallation,
} from '../../lib/licensing/installation-service.js';

const router = Router();

const supabase = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseServer();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

function handleError(res, error, context) {
  if (error instanceof LicenseEndpointError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
  console.error(`[Licensing] ${context}:`, error);
  return res.status(500).json({
    success: false,
    error: 'Erro interno de licenciamento',
    code: 'LICENSE_INTERNAL',
  });
}

/**
 * GET /api/licensing/v1/status — informação pública do serviço de licenças.
 * Permite que a instalação verifique conectividade e configuração.
 */
router.get('/status', licensingLimiter, (req, res) => {
  res.json({
    success: true,
    service: 'imobzy-licensing',
    version: 1,
    time: new Date().toISOString(),
    signing:
      process.env.LICENSE_SIGNING_PUBLIC_KEY &&
      process.env.LICENSE_SIGNING_PRIVATE_KEY
        ? 'configured'
        : 'not_configured',
  });
});

/**
 * POST /api/licensing/v1/activate — ativa a licença na instalação.
 */
router.post('/activate', licensingLimiter, async (req, res) => {
  try {
    const result = await activateInstallation(supabase, {
      ...req.body,
      ipAddress: req.ip,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, 'activate');
  }
});

/**
 * POST /api/licensing/v1/validate — valida a licença online.
 */
router.post('/validate', licensingLimiter, async (req, res) => {
  try {
    const result = await validateInstallation(supabase, {
      ...req.body,
      ipAddress: req.ip,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, 'validate');
  }
});

/**
 * POST /api/licensing/v1/heartbeat — heartbeat da instalação.
 */
router.post('/heartbeat', licensingLimiter, async (req, res) => {
  try {
    const result = await sendHeartbeat(supabase, {
      ...req.body,
      ipAddress: req.ip,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, 'heartbeat');
  }
});

export default router;
