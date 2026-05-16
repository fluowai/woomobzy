import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AIAutomationEngine } from '../../lib/AIAutomation.js';

const router = Router();

/**
 * Proxy Profissional para WhatsMeow (Go)
 * Este componente gerencia a comunicação entre o Node.js e o serviço em Go,
 * garantindo isolamento multi-tenant (SaaS) e suporte a WebSockets.
 */
export const setupWhatsAppProxy = (app, server, verifyAuth, requireTenant) => {
  const target = process.env.WHATSAPP_API_URL || 'http://localhost:3100';
  const aiEngine = new AIAutomationEngine(process.env.GEMINI_API_KEY);

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
    pathRewrite: (path, req) => {
      // O frontend chama /api/whatsapp/ws, mas o Go espera /ws
      if (path.startsWith('/api/whatsapp/ws')) {
        return path.replace('/api/whatsapp/ws', '/ws');
      }
      // O frontend chama /api/whatsapp/instances, mas o Go espera /api/instances
      return path.replace('/api/whatsapp', '/api');
    },
    onProxyReq: (proxyReq, req, res) => {
      // 1. Pega o OrgID injetado pelo middleware de autenticação do Node
      const orgId = req.orgId;
      
      if (orgId) {
        // 2. Injetar no Query String (para GET)
        const url = new URL(proxyReq.path, 'http://localhost'); // base fictícia para parse
        url.searchParams.set('tenant_id', orgId);
        proxyReq.path = url.pathname + url.search;

        // 3. Injetar no Body (para POST/PUT) - Se houver corpo JSON
        // Nota: O http-proxy-middleware exige cuidado ao reescrever o body
        if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
          const bodyData = { ...req.body, tenant_id: orgId };
          const bodyString = JSON.stringify(bodyData);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyString));
          proxyReq.write(bodyString);
        }
      }

      console.log(`[SaaS Proxy] ${req.method} ${req.url} -> ${target} (Org: ${orgId || 'Public'})`);
    },
    onError: (err, req, res) => {
      console.error('[WhatsApp Proxy Error]', err.message);
      if (res && res.status) {
        res.status(502).json({ 
          error: 'Serviço WhatsApp Indisponível',
          message: 'O servidor WhatsMeow (Go) não respondeu ou não está rodando.'
        });
      }
    }
  });

  // Registro da Rota com Middlewares de Segurança
  // Isso garante que req.orgId esteja disponível dentro do proxy
  app.use('/api/whatsapp', verifyAuth, requireTenant, proxy);
};

export default router;
