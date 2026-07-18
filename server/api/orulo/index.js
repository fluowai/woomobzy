import { Router } from 'express';
import {
  verifyAdmin,
  verifyAuth,
  verifySuperAdmin,
} from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  decryptOruloPayload,
  encryptOruloPayload,
  maskOruloClientId,
} from '../../services/oruloCredentialStore.js';
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
  refreshEndUserToken,
  syncActiveBuildings,
  syncBuildingsByFilters,
  updatePublicationLinks,
} from '../../services/oruloService.js';

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

function isMissingTableError(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

async function getMasterOruloCredentials() {
  const { data, error } = await supabase
    .from('platform_integrations')
    .select('enabled, encrypted_credentials, updated_at')
    .eq('provider', 'orulo')
    .maybeSingle();

  if (error && !isMissingTableError(error)) throw error;

  if (data?.enabled === false) {
    const disabledError = new Error(
      'Integração Órulo desativada pelo administrador da plataforma.'
    );
    disabledError.statusCode = 503;
    throw disabledError;
  }

  if (data?.encrypted_credentials) {
    return {
      ...decryptOruloPayload(data.encrypted_credentials),
      source: 'database',
      updatedAt: data.updated_at,
    };
  }

  return {
    clientId: String(process.env.ORULO_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.ORULO_CLIENT_SECRET || '').trim(),
    source: 'environment',
    updatedAt: null,
  };
}

async function getEndUserAuth(organizationId, userId) {
  const { data, error } = await supabase
    .from('orulo_user_credentials')
    .select('encrypted_token, expires_at, connected_at')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && !isMissingTableError(error)) throw error;
  if (!data?.encrypted_token) return null;

  return {
    ...decryptOruloPayload(data.encrypted_token),
    expiresAt: data.expires_at,
    connectedAt: data.connected_at,
  };
}

async function saveEndUserAuth(organizationId, userId, token) {
  const { error } = await supabase.from('orulo_user_credentials').upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      encrypted_token: encryptOruloPayload(token),
      expires_at: token.expiresAt || null,
      connected_at: token.connectedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,user_id' }
  );

  if (error) throw error;
}

async function getFreshEndUserAuth(organizationId, userId) {
  const token = await getEndUserAuth(organizationId, userId);
  if (!token) return null;

  const expiresAt = token.expiresAt ? new Date(token.expiresAt).getTime() : 0;
  if (!expiresAt || expiresAt > Date.now() + 60000) return token;

  const refreshed = await refreshEndUserToken({
    credentials: await getMasterOruloCredentials(),
    refreshToken: token.refreshToken,
  });
  await saveEndUserAuth(organizationId, userId, refreshed);
  return refreshed;
}

function getWebhookSecret(req) {
  return (
    req.headers['x-orulo-webhook-secret'] ||
    req.headers['x-webhook-secret'] ||
    String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  );
}

function assertWebhookAllowed(req) {
  const expected = process.env.ORULO_WEBHOOK_SECRET;
  if (!expected) return;

  if (getWebhookSecret(req) !== expected) {
    const error = new Error('Webhook Órulo não autorizado.');
    error.statusCode = 401;
    throw error;
  }
}

function normalizeWebhookPayload(payload = {}) {
  const event = String(
    payload.event ||
      payload.event_type ||
      payload.type ||
      payload.action ||
      payload.status ||
      ''
  ).toLowerCase();

  const buildingId =
    payload.building_id ||
    payload.buildingId ||
    payload.id ||
    payload.building?.id ||
    payload.data?.building_id ||
    payload.data?.building?.id;

  return {
    event,
    buildingId: buildingId ? String(buildingId) : null,
  };
}

function classifyWebhookEvent(event) {
  if (
    ['removed', 'excluded_from_distribution', 'inactive', 'deleted'].includes(
      event
    )
  ) {
    return 'remove';
  }
  if (
    ['active', 'added_to_distribution', 'updated', 'created'].includes(event)
  ) {
    return 'upsert';
  }
  return 'unknown';
}

async function findWebhookTargets(buildingId) {
  const { data, error } = await supabase
    .from('properties')
    .select('organization_id')
    .eq('source', 'orulo')
    .like('external_id', `${buildingId}:%`);

  if (error) throw error;

  const credentials = await getMasterOruloCredentials();
  const organizationIds = [
    ...new Set(
      (data || []).map((item) => item.organization_id).filter(Boolean)
    ),
  ];

  return organizationIds.map((organizationId) => ({
    organizationId,
    credentials,
  }));
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

    const targets = await findWebhookTargets(normalized.buildingId);
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

    return res.status(200).json({
      success: true,
      action,
      buildingId: normalized.buildingId,
      targets: results.length,
      results,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/master-credentials', verifySuperAdmin, async (req, res) => {
  try {
    const credentials = await getMasterOruloCredentials();
    return res.json({
      success: true,
      configured: isOruloConfigured(credentials),
      clientId: maskOruloClientId(credentials.clientId),
      source: credentials.source,
      updatedAt: credentials.updatedAt,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/master-credentials', verifySuperAdmin, async (req, res) => {
  try {
    const clientId = String(req.body?.clientId || '').trim();
    const clientSecret = String(req.body?.clientSecret || '').trim();

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'Client ID e Client Secret da Órulo são obrigatórios.',
      });
    }

    const { error } = await supabase.from('platform_integrations').upsert(
      {
        provider: 'orulo',
        enabled: true,
        encrypted_credentials: encryptOruloPayload({ clientId, clientSecret }),
        configured_by: req.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider' }
    );

    if (error) throw error;

    return res.json({
      success: true,
      configured: true,
      clientId: maskOruloClientId(clientId),
      source: 'database',
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/status', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const credentials = await getMasterOruloCredentials();
    const { count: pendingCount } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', req.orgId)
      .eq('source', 'orulo')
      .eq('status', 'Pendente');

    return res.json({
      success: true,
      configured: isOruloConfigured(credentials),
      scope: 'platform',
      pendingCount: pendingCount || 0,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/sync', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const updatedAfter = req.body?.updated_after || defaultUpdatedAfter();
    const maxBuildings = Math.min(Number(req.body?.max_buildings || 25), 100);
    const credentials = await getMasterOruloCredentials();
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

    return res.json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post(
  '/buildings/:buildingId/import',
  verifyAdmin,
  requireTenant,
  async (req, res) => {
    try {
      const result = await importBuildingTypologies({
        supabase,
        organizationId: req.orgId,
        buildingId: req.params.buildingId,
        credentials: await getMasterOruloCredentials(),
      });

      return res.json({ success: true, ...result });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

router.get('/metadata/:type', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const data = await listOruloMetadata({
      type: req.params.type,
      credentials: await getMasterOruloCredentials(),
      query: req.query || {},
    });

    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post(
  '/publication-links/:buildingId',
  verifyAdmin,
  requireTenant,
  async (req, res) => {
    try {
      const data = await updatePublicationLinks({
        credentials: await getMasterOruloCredentials(),
        buildingId: req.params.buildingId,
        publicationLinks: req.body?.publication_links,
      });

      return res.json({ success: true, data });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

router.get('/end-user/status', verifyAuth, requireTenant, async (req, res) => {
  try {
    const token = await getEndUserAuth(req.orgId, req.user.id);
    return res.json({
      success: true,
      connected: Boolean(token?.accessToken),
      expiresAt: token?.expiresAt || null,
      connectedAt: token?.connectedAt || null,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post(
  '/end-user/authorize-url',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const redirectUri = req.body?.redirect_uri;
      if (!redirectUri) {
        return res
          .status(400)
          .json({ success: false, error: 'redirect_uri obrigatório.' });
      }

      const authUrl = buildEndUserAuthorizationUrl({
        credentials: await getMasterOruloCredentials(),
        redirectUri,
        state: `${req.orgId}:${req.user.id}`,
      });

      return res.json({ success: true, authUrl });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

router.post(
  '/end-user/callback',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { code, redirect_uri: redirectUri } = req.body || {};
      if (!code || !redirectUri) {
        return res.status(400).json({
          success: false,
          error: 'code e redirect_uri são obrigatórios.',
        });
      }

      const token = await exchangeEndUserCode({
        credentials: await getMasterOruloCredentials(),
        code,
        redirectUri,
      });

      await saveEndUserAuth(req.orgId, req.user.id, token);

      return res.json({
        success: true,
        connected: true,
        expiresAt: token.expiresAt,
        connectedAt: token.connectedAt,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

router.post('/end-user/proxy', verifyAuth, requireTenant, async (req, res) => {
  try {
    const token = await getFreshEndUserAuth(req.orgId, req.user.id);
    const data = await fetchEndUserProtectedResource({
      token: token?.accessToken,
      resource: req.body?.resource,
    });

    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete(
  '/end-user/connection',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { error } = await supabase
        .from('orulo_user_credentials')
        .delete()
        .eq('organization_id', req.orgId)
        .eq('user_id', req.user.id);

      if (error) throw error;
      return res.json({ success: true, connected: false });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

export default router;
