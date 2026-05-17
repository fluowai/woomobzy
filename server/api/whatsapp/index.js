import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AIAutomationEngine } from '../../lib/AIAutomation.js';

const router = Router();

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
  const allowedOriginPattern = /^https:\/\/([a-z0-9-]+\.)?consultio\.com\.br$/i;

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
        const orgId = req.orgId;

        if (orgId) {
          const url = new URL(proxyReq.path, 'http://localhost');
          url.searchParams.set('tenant_id', orgId);
          proxyReq.path = url.pathname + url.search;

          if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const bodyData = { ...req.body, tenant_id: orgId };
            const bodyString = JSON.stringify(bodyData);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyString));
            proxyReq.write(bodyString);
          }
        }

        console.log(
          `[SaaS Proxy] ${req.method} ${req.originalUrl || req.url} -> ${target}${proxyReq.path} (Org: ${orgId || 'Public'})`
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
            message: 'O servidor WhatsMeow (Go) nao respondeu ou nao esta rodando.',
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

export default router;
