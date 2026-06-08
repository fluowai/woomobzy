import { Router } from 'express';
import { verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  importBuildingTypologies,
  isOruloConfigured,
  markRemovedBuildings,
  syncActiveBuildings,
} from '../../services/oruloService.js';

const router = Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

function defaultUpdatedAfter() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} 00:00:00`;
}

function handleError(res, error) {
  console.error('[Orulo] Erro:', error);
  return res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Erro ao processar integração com a Órulo.',
  });
}

async function getTenantOruloCredentials(organizationId) {
  const { data: settings, error } = await supabase
    .from('site_settings')
    .select('integrations')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;

  const orulo = settings?.integrations?.orulo;
  if (!orulo) return null;
  if (orulo.enabled === false) return { disabled: true, tenantScoped: true };

  return {
    clientId: orulo.clientId || orulo.client_id,
    clientSecret: orulo.clientSecret || orulo.client_secret,
    tenantScoped: true,
  };
}

function ensureUsableCredentials(credentials) {
  if (credentials?.disabled) {
    const error = new Error('Integração Órulo desativada para esta organização.');
    error.statusCode = 400;
    throw error;
  }

  if (credentials?.tenantScoped && (!credentials.clientId || !credentials.clientSecret)) {
    const error = new Error('Credenciais da Órulo incompletas para esta organização.');
    error.statusCode = 400;
    throw error;
  }

  return credentials;
}

router.get('/status', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const credentials = await getTenantOruloCredentials(req.orgId);
    const { count: pendingCount } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', req.orgId)
      .eq('source', 'orulo')
      .eq('status', 'Pendente');

    res.json({
      success: true,
      configured: !credentials?.disabled && isOruloConfigured(credentials?.tenantScoped ? credentials : null),
      scope: credentials ? 'tenant' : 'server',
      pendingCount: pendingCount || 0,
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/sync', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const updatedAfter = req.body?.updated_after || defaultUpdatedAfter();
    const maxBuildings = Math.min(Number(req.body?.max_buildings || 25), 100);
    const credentials = ensureUsableCredentials(await getTenantOruloCredentials(req.orgId));
    const result = await syncActiveBuildings({
      supabase,
      organizationId: req.orgId,
      updatedAfter,
      maxBuildings,
      credentials,
    });

    if (req.body?.sync_removed !== false) {
      result.removed = await markRemovedBuildings({
        supabase,
        organizationId: req.orgId,
        updatedAfter,
        credentials,
      });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/buildings/:buildingId/import', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const result = await importBuildingTypologies({
      supabase,
      organizationId: req.orgId,
      buildingId: req.params.buildingId,
      credentials: ensureUsableCredentials(await getTenantOruloCredentials(req.orgId)),
    });

    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
