import { Router } from 'express';
import { verifyAdmin, verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  buildEndUserAuthorizationUrl,
  exchangeEndUserCode,
  fetchEndUserProtectedResource,
  hasCatalogFilters,
  importBuildingTypologies,
  isOruloConfigured,
  listOruloMetadata,
  markBuildingRemovedById,
  markRemovedBuildings,
  syncActiveBuildings,
  syncBuildingsByFilters,
  updatePublicationLinks,
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

async function getTenantSettings(organizationId) {
  const { data: settings, error } = await supabase
    .from('site_settings')
    .select('id, integrations')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return settings;
}

async function updateTenantOruloSettings(organizationId, updater) {
  const settings = await getTenantSettings(organizationId);
  const integrations = settings?.integrations || {};
  const orulo = integrations.orulo || {};
  const nextOrulo = updater(orulo);

  const payload = {
    integrations: {
      ...integrations,
      orulo: nextOrulo,
    },
  };

  const query = supabase.from('site_settings');
  const { error } = settings?.id
    ? await query.update(payload).eq('id', settings.id)
    : await query.insert({ organization_id: organizationId, ...payload });

  if (error) throw error;
  return nextOrulo;
}

function getEndUserAuth(oruloSettings, userId) {
  return oruloSettings?.endUserAuth?.[userId] || null;
}

function getWebhookSecret(req) {
  return req.headers['x-orulo-webhook-secret']
    || req.headers['x-webhook-secret']
    || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
}

function assertWebhookAllowed(req) {
  const expected = process.env.ORULO_WEBHOOK_SECRET;
  if (!expected) return;

  if (getWebhookSecret(req) !== expected) {
    const error = new Error('Webhook Orulo nao autorizado.');
    error.statusCode = 401;
    throw error;
  }
}

function normalizeWebhookPayload(payload = {}) {
  const event = String(
    payload.event
      || payload.event_type
      || payload.type
      || payload.action
      || payload.status
      || ''
  ).toLowerCase();

  const buildingId = payload.building_id
    || payload.buildingId
    || payload.id
    || payload.building?.id
    || payload.data?.building_id
    || payload.data?.building?.id;

  const clientId = payload.client_id
    || payload.clientId
    || payload.oauth_client_id
    || payload.data?.client_id;

  return {
    event,
    buildingId: buildingId ? String(buildingId) : null,
    clientId: clientId ? String(clientId) : null,
  };
}

function classifyWebhookEvent(event) {
  if (['removed', 'excluded_from_distribution', 'inactive', 'deleted'].includes(event)) return 'remove';
  if (['active', 'added_to_distribution', 'updated', 'created'].includes(event)) return 'upsert';
  return 'unknown';
}

async function findWebhookTargets(clientId) {
  const { data, error } = await supabase
    .from('site_settings')
    .select('organization_id, integrations');

  if (error) throw error;

  return (data || [])
    .map((settings) => {
      const orulo = settings.integrations?.orulo;
      if (!orulo || orulo.enabled === false) return null;

      const credentials = {
        clientId: orulo.clientId || orulo.client_id,
        clientSecret: orulo.clientSecret || orulo.client_secret,
        tenantScoped: true,
      };

      if (!credentials.clientId || !credentials.clientSecret) return null;
      if (clientId && credentials.clientId !== clientId) return null;

      return {
        organizationId: settings.organization_id,
        credentials,
      };
    })
    .filter(Boolean);
}

async function processWebhookForTarget({ target, action, event, buildingId }) {
  if (action === 'remove') {
    return markBuildingRemovedById({
      supabase,
      organizationId: target.organizationId,
      buildingId,
      reason: event || 'removed',
    });
  }

  if (action === 'upsert') {
    return importBuildingTypologies({
      supabase,
      organizationId: target.organizationId,
      buildingId,
      credentials: target.credentials,
    });
  }

  return { ignored: true };
}

router.post('/webhook', async (req, res) => {
  try {
    assertWebhookAllowed(req);
    const normalized = normalizeWebhookPayload(req.body || {});
    const action = classifyWebhookEvent(normalized.event);

    if (!normalized.buildingId) {
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: 'missing_building_id',
      });
    }

    if (action === 'unknown') {
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: 'unknown_event',
        event: normalized.event,
      });
    }

    const targets = await findWebhookTargets(normalized.clientId);
    const results = [];

    for (const target of targets) {
      const result = await processWebhookForTarget({
        target,
        action,
        event: normalized.event,
        buildingId: normalized.buildingId,
      });
      results.push({ organizationId: target.organizationId, result });
    }

    res.status(200).json({
      success: true,
      action,
      buildingId: normalized.buildingId,
      clientScoped: Boolean(normalized.clientId),
      targets: results.length,
      results,
    });
  } catch (error) {
    handleError(res, error);
  }
});

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
    const filters = req.body?.filters || {};
    const result = hasCatalogFilters(filters)
      ? await syncBuildingsByFilters({
          supabase,
          organizationId: req.orgId,
          filters,
          maxBuildings,
          credentials,
        })
      : await syncActiveBuildings({
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

router.get('/metadata/:type', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const data = await listOruloMetadata({
      type: req.params.type,
      credentials: ensureUsableCredentials(await getTenantOruloCredentials(req.orgId)),
      query: req.query || {},
    });

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/publication-links/:buildingId', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const data = await updatePublicationLinks({
      credentials: ensureUsableCredentials(await getTenantOruloCredentials(req.orgId)),
      buildingId: req.params.buildingId,
      publicationLinks: req.body?.publication_links,
    });

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/end-user/status', verifyAuth, requireTenant, async (req, res) => {
  try {
    const settings = await getTenantSettings(req.orgId);
    const token = getEndUserAuth(settings?.integrations?.orulo, req.user.id);
    res.json({
      success: true,
      connected: Boolean(token?.accessToken),
      expiresAt: token?.expiresAt || null,
      connectedAt: token?.connectedAt || null,
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/end-user/authorize-url', verifyAuth, requireTenant, async (req, res) => {
  try {
    const redirectUri = req.body?.redirect_uri;
    if (!redirectUri) {
      return res.status(400).json({ success: false, error: 'redirect_uri obrigatÃ³rio.' });
    }

    const authUrl = buildEndUserAuthorizationUrl({
      credentials: ensureUsableCredentials(await getTenantOruloCredentials(req.orgId)),
      redirectUri,
      state: `${req.orgId}:${req.user.id}`,
    });

    res.json({ success: true, authUrl });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/end-user/callback', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { code, redirect_uri: redirectUri } = req.body || {};
    if (!code || !redirectUri) {
      return res.status(400).json({ success: false, error: 'code e redirect_uri sÃ£o obrigatÃ³rios.' });
    }

    const token = await exchangeEndUserCode({
      credentials: ensureUsableCredentials(await getTenantOruloCredentials(req.orgId)),
      code,
      redirectUri,
    });

    await updateTenantOruloSettings(req.orgId, (orulo) => ({
      ...orulo,
      endUserAuth: {
        ...(orulo.endUserAuth || {}),
        [req.user.id]: token,
      },
    }));

    res.json({
      success: true,
      connected: true,
      expiresAt: token.expiresAt,
      connectedAt: token.connectedAt,
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/end-user/proxy', verifyAuth, requireTenant, async (req, res) => {
  try {
    const settings = await getTenantSettings(req.orgId);
    const token = getEndUserAuth(settings?.integrations?.orulo, req.user.id);
    const data = await fetchEndUserProtectedResource({
      token: token?.accessToken,
      resource: req.body?.resource,
    });

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
