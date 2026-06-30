import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AIAutomationEngine } from '../../lib/AIAutomation.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { createPresignedGetUrl, isMinioConfigured } from '../../lib/minio-storage.js';
import jwt from 'jsonwebtoken';

const router = Router();
const WHATSAPP_DB_ENV_KEYS = [
  'SUPABASE_DB_URL',
  'DATABASE_URL',
  'DATABASE_PRIVATE_URL',
  'DIRECT_URL',
  'POSTGRES_URL',
  'POSTGRES_PRIVATE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRESQL_URL',
  'PGDATABASE_URL',
  'PG_URL',
  'DB_URL',
];

const rewriteWhatsAppPath = (path) => {
  const pathWithoutMount = path.startsWith('/api/whatsapp')
    ? path.replace('/api/whatsapp', '') || '/'
    : path || '/';

  if (pathWithoutMount === '/ws' || pathWithoutMount.startsWith('/ws?')) {
    return pathWithoutMount;
  }

  return pathWithoutMount.startsWith('/api/')
    ? pathWithoutMount
    : `/api${pathWithoutMount}`;
};

export const setupWhatsAppProxy = (app, server, verifyAuth, requireTenant) => {
  const target = resolveWhatsAppTarget(process.env.WHATSAPP_API_URL);
  const aiEngine = new AIAutomationEngine(process.env.GEMINI_API_KEY);
  const isProduction = process.env.NODE_ENV === 'production';
  const envAllowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

  const allowedOrigins = new Set([
    'https://app.imobfluow.com.br',
    'https://imobfluow.com.br',
    'https://www.imobfluow.com.br',
    'https://okaimoveis.com.br',
    'https://www.okaimoveis.com.br',
    ...envAllowedOrigins,
  ]);

  const applyCorsHeaders = (req, res) => {
    const origin = req.headers.origin;
    if (
      origin &&
      (allowedOrigins.has(origin) ||
        (!isProduction &&
          (origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1'))))
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin,Accept,Content-Type,Authorization,X-Requested-With,x-tenant-id,x-impersonate-org-id'
    );
  };

  app.post('/api/whatsapp/internal/messages', async (req, res) => {
    const expectedToken = process.env.WHATSAPP_INTERNAL_TOKEN;
    const receivedToken = req.headers['x-whatsapp-internal-token'];

    if (!expectedToken || receivedToken !== expectedToken) {
      return res.status(401).json({ error: 'Token interno invalido' });
    }

    try {
      const result = await aiEngine.handleWhatsAppMessage(req.body);
      res.json({ success: true, result });
    } catch (err) {
      console.error('[WhatsApp AI Automation Error]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whatsapp/internal/imports/analyze', async (req, res) => {
    const expectedToken = process.env.WHATSAPP_INTERNAL_TOKEN;
    const receivedToken = req.headers['x-whatsapp-internal-token'];

    if (!expectedToken || receivedToken !== expectedToken) {
      return res.status(401).json({ error: 'Token interno invalido' });
    }

    try {
      const result = await aiEngine.handleImportedWhatsAppConversations(req.body);
      res.json({ success: true, result });
    } catch (err) {
      console.error('[WhatsApp AI Import Error]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    // WebSocket upgrades are authenticated and forwarded explicitly in
    // server.on('upgrade') below. Keeping the HTTP proxy from auto-subscribing
    // to upgrade events avoids bypassing prepareWsProxyRequest().
    ws: false,
    pathRewrite: rewriteWhatsAppPath,
    on: {
      proxyReq: (proxyReq, req) => {
        // The browser Origin is already validated by the Node API. Do not pass it
        // to the internal WooAPI service, otherwise Gin CORS can reject localhost
        // ports that are only meant to hit the public proxy.
        const serviceToken = process.env.WHATSAPP_SERVICE_TOKEN || process.env.WHATSAPP_INTERNAL_TOKEN;
        if (serviceToken) proxyReq.setHeader('x-whatsapp-service-token', serviceToken);

        const whatsappUserId = req.user?.id;
        const whatsappTenantId = req.orgId;

        if (whatsappTenantId) {
          const url = new URL(proxyReq.path, 'http://localhost');
          url.searchParams.set('tenant_id', whatsappTenantId);
          proxyReq.path = url.pathname + url.search;
          proxyReq.setHeader('x-tenant-id', whatsappTenantId);

          if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const bodyData = { ...req.body, tenant_id: whatsappTenantId };
            const bodyString = JSON.stringify(bodyData);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyString));
            proxyReq.write(bodyString);
          }

          if (req.method === 'POST' && (req.originalUrl || req.url) === '/api/whatsapp/instances') {
            console.log('[WHATSAPP] Auth user:', whatsappUserId);
            console.log('[WHATSAPP] Creating instance for user');
          }
        }

        console.log(
          `[SaaS Proxy] ${req.method} ${req.originalUrl || req.url} -> ${target}${proxyReq.path} (WhatsApp user: ${whatsappUserId || 'Public'}, Org: ${whatsappTenantId || 'none'})`
        );
      },
      proxyReqWs: (proxyReq, req) => {
        const serviceToken = process.env.WHATSAPP_SERVICE_TOKEN || process.env.WHATSAPP_INTERNAL_TOKEN;
        if (serviceToken) proxyReq.setHeader('x-whatsapp-service-token', serviceToken);
        console.log(
          `[WhatsApp WS Proxy] ${req.url} -> ${target} (Org: ${req.orgId || 'none'})`
        );
      },
      error: (err, req, res) => {
        console.error('[WhatsApp Proxy Error]', err.message);
        if (res && typeof res.status === 'function') {
          applyCorsHeaders(req, res);
          res.status(502).json({
            error: 'Servico WhatsApp Indisponivel',
            code: 'WHATSAPP_SERVICE_UNREACHABLE',
            message: 'Servico temporariamente indisponivel.',
          });
        } else if (res && typeof res.destroy === 'function') {
          res.destroy();
        }
      },
    },
  });

  app.use('/api/whatsapp', (req, res, next) => {
    applyCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.get('/api/whatsapp/health', async (req, res) => {
    applyCorsHeaders(req, res);

    const service = await checkWhatsAppService(target);
    res.status(service.ok ? 200 : 503).json({
      ok: service.ok,
      node: {
        ok: true,
        uptime: process.uptime(),
      },
      whatsmeow: { ok: service.ok, status: service.status },
    });
  });

  app.get('/api/whatsapp/status', verifyAuth, requireTenant, async (req, res) => {
    applyCorsHeaders(req, res);

    const service = await checkWhatsAppService(target);
    res.status(service.ok ? 200 : 503).json({
      ok: service.ok,
      service: { ok: service.ok, status: service.status },
      hint: service.ok
        ? 'WhatsMeow esta respondendo.'
        : 'O servico WhatsApp esta temporariamente indisponivel.',
    });
  });

  app.post(['/api/whatsapp/socket-token', '/api/whatsapp/ws-token'], verifyAuth, requireTenant, issueWsToken);
  app.get('/api/whatsapp/media/:id/url', verifyAuth, requireTenant, getWhatsAppMediaUrl);
  app.post('/api/whatsapp/media/:id/retry', verifyAuth, requireTenant, retryWhatsAppMedia);

  app.get('/api/whatsapp/instances', verifyAuth, requireTenant, async (req, res) => {
    applyCorsHeaders(req, res);

    try {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('id, tenant_id, name, status, qr_code, phone, jid, created_at, updated_at')
        .eq('tenant_id', req.orgId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json((data || []).map(normalizeInstanceRow));
    } catch (err) {
      console.error('[WhatsApp Instances Fallback Error]', err.message);
      res.status(500).json({
        error: 'Falha ao listar instancias do WhatsApp',
        message: err.message,
      });
    }
  });

  app.use('/api/whatsapp/ws', validateWsTokenMiddleware, proxy);
  app.use('/api/whatsapp', verifyAuth, requireTenant, proxy);

  if (server) {
    server.on('upgrade', (req, socket, head) => {
      if (req.url?.startsWith('/api/whatsapp/ws')) {
        validateWsUpgrade(req)
          .then((payload) => {
            if (!payload) {
              socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
              socket.destroy();
              return;
            }
            prepareWsProxyRequest(req, payload);
            proxy.upgrade(req, socket, head);
          })
          .catch(() => {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
          });
      }
    });
  }

  return proxy;
};

function getWsTokenSecret() {
  return process.env.WHATSAPP_WS_JWT_SECRET || '';
}

function verifyWsToken(token) {
  const secret = getWsTokenSecret();
  if (!secret || !token) return null;

  try {
    const payload = jwt.verify(token, secret, {
      issuer: 'imobzy-api',
      audience: 'imobzy-whatsapp-ws',
    });
    if (payload?.purpose !== 'whatsapp_ws' || !payload.sub || !payload.org_id) return null;
    return payload;
  } catch (err) {
    console.warn('[WhatsApp WS Auth] invalid token:', err.message);
    return null;
  }
}

function issueWsToken(req, res) {
  const secret = getWsTokenSecret();
  if (!secret) {
    return res.status(503).json({ error: 'WebSocket token indisponivel' });
  }

  const token = jwt.sign(
    {
      sub: req.user.id,
      org_id: req.orgId,
      purpose: 'whatsapp_ws',
    },
    secret,
    {
      expiresIn: '5m',
      issuer: 'imobzy-api',
      audience: 'imobzy-whatsapp-ws',
    }
  );

  res.json({ token, expires_in: 300 });
}

async function getWhatsAppMediaUrl(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const supabase = getSupabaseServer();
    const { data: media, error } = await supabase
      .from('whatsapp_media')
      .select('id, tenant_id, provider, bucket, object_key, public_url, status, mime_type, filename')
      .eq('id', req.params.id)
      .eq('tenant_id', req.orgId)
      .maybeSingle();

    if (error) throw error;
    if (!media) {
      return res.status(404).json({ error: 'Midia nao encontrada.' });
    }

    if (!media.object_key && media.public_url) {
      return res.json({
        id: media.id,
        url: media.public_url,
        status: media.status,
        mime_type: media.mime_type,
        filename: media.filename,
        expires_in: null,
      });
    }

    if (String(media.provider || '').toLowerCase() !== 'minio' && media.public_url) {
      return res.json({
        id: media.id,
        url: media.public_url,
        status: media.status,
        mime_type: media.mime_type,
        filename: media.filename,
        expires_in: null,
      });
    }

    if (!media.object_key) {
      return res.json({
        id: media.id,
        url: null,
        error: 'Midia ainda nao possui arquivo processado.',
        code: 'MEDIA_NOT_READY',
        status: media.status === 'ready' ? 'pending' : media.status,
        mime_type: media.mime_type,
        filename: media.filename,
        expires_in: null,
      });
    }

    if (!isMinioConfigured()) {
      if (media.public_url) {
        return res.json({
          id: media.id,
          url: media.public_url,
          status: media.status,
          mime_type: media.mime_type,
          filename: media.filename,
          expires_in: null,
        });
      }
      return res.status(503).json({ error: 'Storage MinIO nao configurado para assinar URL.' });
    }

    const expiresInSeconds = Math.max(60, Math.min(Number(req.query.expiresInSeconds) || 300, 3600));
    const url = createPresignedGetUrl({
      bucket: media.bucket,
      key: media.object_key,
      expiresInSeconds,
    });

    return res.json({
      id: media.id,
      url,
      status: media.status,
      mime_type: media.mime_type,
      filename: media.filename,
      expires_in: expiresInSeconds,
    });
  } catch (error) {
    console.error('[WhatsApp Media URL Error]', error.message);
    return res.status(500).json({ error: error.message || 'Erro ao gerar URL da midia.' });
  }
}

async function retryWhatsAppMedia(req, res) {
  try {
    const supabase = getSupabaseServer();
    const { data: media, error: loadError } = await supabase
      .from('whatsapp_media')
      .select('id, tenant_id, message_id, retry_count')
      .eq('id', req.params.id)
      .eq('tenant_id', req.orgId)
      .maybeSingle();

    if (loadError) throw loadError;
    if (!media) {
      return res.status(404).json({ error: 'Midia nao encontrada.' });
    }

    const retryCount = Math.min(Number(media.retry_count || 0), 7);
    const { error: mediaError } = await supabase
      .from('whatsapp_media')
      .update({
        status: 'pending',
        retry_count: retryCount,
        last_error: null,
        next_retry_at: new Date().toISOString(),
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', media.id)
      .eq('tenant_id', req.orgId);

    if (mediaError) throw mediaError;

    await supabase
      .from('whatsapp_messages')
      .update({
        media_status: 'pending',
        media_error: null,
        media_retry_count: retryCount,
      })
      .eq('id', media.message_id);

    return res.json({
      id: media.id,
      status: 'pending',
      retry_count: retryCount,
      message: 'Midia marcada para recuperacao. O worker de media processara o retry.',
    });
  } catch (error) {
    console.error('[WhatsApp Media Retry Error]', error.message);
    return res.status(500).json({ error: error.message || 'Erro ao solicitar retry da midia.' });
  }
}

function getWsTokenFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl || '', 'http://localhost');
    return url.searchParams.get('ws_token');
  } catch {
    return null;
  }
}

async function validateWsTokenMiddleware(req, res, next) {
  const payload = verifyWsToken(getWsTokenFromUrl(req.originalUrl || req.url));
  if (!payload) {
    return res.status(401).json({ error: 'WebSocket nao autorizado' });
  }

  if (!(await organizationExists(payload.org_id))) {
    return res.status(403).json({
      error: 'Organizacao do WebSocket nao encontrada.',
      code: 'INVALID_TENANT',
    });
  }

  req.user = { id: payload.sub };
  req.orgId = payload.org_id;
  next();
}

async function validateWsUpgrade(req) {
  const payload = verifyWsToken(getWsTokenFromUrl(req.url));
  if (!payload) return null;
  if (!(await organizationExists(payload.org_id))) return null;
  req.user = { id: payload.sub };
  req.orgId = payload.org_id;
  return payload;
}

function prepareWsProxyRequest(req, payload) {
  const url = new URL(req.url || '/api/whatsapp/ws', 'http://localhost');
  url.pathname = '/api/whatsapp/ws';
  url.searchParams.delete('ws_token');
  url.searchParams.set('tenant_id', payload.org_id);
  req.url = url.pathname + url.search;
  req.headers['x-tenant-id'] = payload.org_id;
  const serviceToken = process.env.WHATSAPP_SERVICE_TOKEN || process.env.WHATSAPP_INTERNAL_TOKEN;
  if (serviceToken) req.headers['x-whatsapp-service-token'] = serviceToken;
}

async function organizationExists(orgId) {
  if (!orgId) return false;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .maybeSingle();

  return !error && Boolean(data);
}

function resolveWhatsAppTarget(rawTarget) {
  const target = (rawTarget || '').trim();
  if (!target) return 'http://127.0.0.1:3100';

  return target.replace(/\/$/, '');
}

async function checkWhatsAppService(target) {
  const healthUrl = `${target.replace(/\/$/, '')}/health`;

  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(2500),
    });

    return {
      ok: response.ok,
      status: response.status,
      url: healthUrl,
    };
  } catch (err) {
    return {
      ok: false,
      url: healthUrl,
      error: err.message,
    };
  }
}

function normalizeInstanceRow(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id || undefined,
    name: row.name || 'WhatsApp',
    status: row.status || 'disconnected',
    qr_code: row.qr_code || undefined,
    phone: row.phone || undefined,
    jid: row.jid || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getDatabaseEnvStatus() {
  return WHATSAPP_DB_ENV_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(process.env[key]);
    return acc;
  }, {});
}

export default router;
