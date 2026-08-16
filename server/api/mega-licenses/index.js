/**
 * Mega Admin — Central de Licenciamento (API administrativa).
 * Protegido por verifyMegaAdmin. Montado em /api/mega/licenses.
 */

import { Router } from 'express';
import { verifyMegaAdmin } from '../../middleware/auth.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  createLicense,
  getLicenseDetail,
  LicenseAdminError,
  listAuditEvents,
  listHeartbeats,
  listLicenses,
  reissueLicenseKey,
  revokeInstallation,
  setLicenseStatus,
  updateLicense,
} from '../../lib/licensing/admin-service.js';

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

function adminContext(req) {
  return {
    actorId: req.authUserId || null,
    ipAddress: req.ip || null,
  };
}

function handleError(res, error) {
  if (error instanceof LicenseAdminError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
  console.error('[MegaLicenses] Erro inesperado:', error);
  return res.status(500).json({
    success: false,
    error: 'Erro interno ao processar licenciamento',
    code: 'LICENSE_INTERNAL_ERROR',
  });
}

// GET /api/mega/licenses — listar licenças (com filtros e paginação)
router.get('/', verifyMegaAdmin, async (req, res) => {
  try {
    const result = await listLicenses(supabase, {
      status: req.query.status || undefined,
      organizationId: req.query.organization_id || undefined,
      edition: req.query.edition || undefined,
      search: req.query.search || undefined,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
});

// GET /api/mega/licenses/:id — detalhe completo da licença
router.get('/:id', verifyMegaAdmin, async (req, res) => {
  try {
    const result = await getLicenseDetail(supabase, req.params.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/mega/licenses — criar licença para uma organização
router.post('/', verifyMegaAdmin, async (req, res) => {
  try {
    const result = await createLicense(
      supabase,
      req.body || {},
      adminContext(req)
    );
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
});

// PUT /api/mega/licenses/:id — atualizar licença
router.put('/:id', verifyMegaAdmin, async (req, res) => {
  try {
    const license = await updateLicense(
      supabase,
      req.params.id,
      req.body || {},
      adminContext(req)
    );
    return res.json({ success: true, license });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/mega/licenses/:id/heartbeats — heartbeats (paginado)
router.get('/:id/heartbeats', verifyMegaAdmin, async (req, res) => {
  try {
    const result = await listHeartbeats(supabase, req.params.id, {
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
});

// GET /api/mega/licenses/:id/audit — eventos de auditoria (paginado)
router.get('/:id/audit', verifyMegaAdmin, async (req, res) => {
  try {
    const result = await listAuditEvents(supabase, req.params.id, {
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/mega/licenses/:id/reissue-key — reemitir a chave de licença
router.post('/:id/reissue-key', verifyMegaAdmin, async (req, res) => {
  try {
    const result = await reissueLicenseKey(
      supabase,
      req.params.id,
      adminContext(req)
    );
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/mega/licenses/:id/installations/:installationId/revoke — revogar instalação
router.post(
  '/:id/installations/:installationId/revoke',
  verifyMegaAdmin,
  async (req, res) => {
    try {
      const installation = await revokeInstallation(
        supabase,
        req.params.id,
        req.params.installationId,
        adminContext(req)
      );
      return res.json({ success: true, installation });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// Transições de status
for (const transition of [
  'activate',
  'suspend',
  'revoke',
  'block',
  'unblock',
]) {
  router.post(`/:id/${transition}`, verifyMegaAdmin, async (req, res) => {
    try {
      const license = await setLicenseStatus(
        supabase,
        req.params.id,
        transition,
        adminContext(req)
      );
      return res.json({ success: true, license });
    } catch (error) {
      return handleError(res, error);
    }
  });
}

export default router;
