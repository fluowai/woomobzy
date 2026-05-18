import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AIAutomationEngine } from '../../lib/AIAutomation.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();
const WHATSAPP_DB_ENV_KEYS = [
  'SUPABASE_DB_URL',
  'DATABASE_URL',
  'DATABASE_PRIVATE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRIVATE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'PGDATABASE_URL',
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
  const allowedOriginPattern = /^https:\/\/([a-z0-9-]+\.)?(consultio\.com\.br|imobzy\.com\.br)$/i;

  const applyCorsHeaders = (req, res) => {
    const origin = req.headers.origin;
    if (
      origin &&
      (allowedOriginPattern.test(origin) ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.up.railway.app'))
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin,Accept,Content-Type,Authorization,X-Requested-With,x-impersonate-org-id'
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

  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,
    pathRewrite: rewriteWhatsAppPath,
    on: {
      proxyReq: (proxyReq, req) => {
        const whatsappUserId = req.user?.id;

        if (whatsappUserId) {
          const url = new URL(proxyReq.path, 'http://localhost');
          url.searchParams.set('tenant_id', whatsappUserId);
          proxyReq.path = url.pathname + url.search;

          if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const bodyData = { ...req.body, tenant_id: whatsappUserId };
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
          `[SaaS Proxy] ${req.method} ${req.originalUrl || req.url} -> ${target}${proxyReq.path} (WhatsApp user: ${whatsappUserId || 'Public'}, Org: ${req.orgId || 'none'})`
        );
      },
      proxyReqWs: (proxyReq, req) => {
        console.log(`[WhatsApp WS Proxy] ${req.url} -> ${target}`);
      },
      error: (err, req, res) => {
        console.error('[WhatsApp Proxy Error]', err.message);
        if (res && typeof res.status === 'function') {
          applyCorsHeaders(req, res);
          res.status(502).json({
            error: 'Servico WhatsApp Indisponivel',
            code: 'WHATSAPP_SERVICE_UNREACHABLE',
            message: 'O servidor WhatsMeow (Go) nao respondeu em http://127.0.0.1:3100. Verifique se a variavel SUPABASE_DB_URL/DATABASE_URL esta configurada no Railway e se o processo whatsapp-service esta online.',
            diagnostics: {
              target,
              database_env: getDatabaseEnvStatus(),
            },
          });
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
      whatsmeow: service,
      target,
      database_env: getDatabaseEnvStatus(),
    });
  });

  app.get('/api/whatsapp/status', verifyAuth, requireTenant, async (req, res) => {
    applyCorsHeaders(req, res);

    const service = await checkWhatsAppService(target);
    res.status(service.ok ? 200 : 503).json({
      ok: service.ok,
      target,
      service,
      database_env: getDatabaseEnvStatus(),
      hint: service.ok
        ? 'WhatsMeow esta respondendo.'
        : 'O Node esta online, mas o processo Go/WhatsMeow nao respondeu. Confira as variaveis de banco no Railway e os logs do processo whatsapp-service.',
    });
  });

  app.get('/api/whatsapp/instances', verifyAuth, requireTenant, async (req, res) => {
    applyCorsHeaders(req, res);

    try {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('id, tenant_id, name, status, qr_code, phone, jid, created_at, updated_at')
        .eq('tenant_id', req.user.id)
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

  // Browser WebSockets cannot send Authorization headers. REST operations stay authenticated.
  app.use('/api/whatsapp/ws', proxy);
  app.use('/api/whatsapp', verifyAuth, requireTenant, proxy);

  if (server) {
    server.on('upgrade', (req, socket, head) => {
      if (req.url?.startsWith('/api/whatsapp/ws')) {
        proxy.upgrade(req, socket, head);
      }
    });
  }

  return proxy;
};

function resolveWhatsAppTarget(rawTarget) {
  const target = (rawTarget || '').trim();
  if (!target) return 'http://127.0.0.1:3100';

  const publicRailwayHost =
    target.includes('woomobzy-production.up.railway.app') ||
    target.includes('web-production-7c3f0.up.railway.app');

  if (publicRailwayHost) {
    return 'http://127.0.0.1:3100';
  }

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
