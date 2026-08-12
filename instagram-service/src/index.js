import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { verifyAuth, requireCompany } from './middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

import accountsRouter from './routes/accounts.js';
import contactsRouter from './routes/contacts.js';
import conversationsRouter from './routes/conversations.js';
import messagesRouter from './routes/messages.js';
import templatesRouter from './routes/templates.js';
import broadcastsRouter from './routes/broadcasts.js';
import webhooksRouter from './routes/webhooks.js';

const app = express();
const server = createServer(app);

app.set('trust proxy', 1);
app.use(compression({ threshold: 1024 }));
app.use(
  helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })
);
app.use(
  cors({
    origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[FATAL] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
  );
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
export const redisConfig = { connection: redisUrl };

const WORKER_BASE_URL =
  process.env.INSTAGRAM_WORKER_URL || 'http://instagram-worker:8000';

app.set('WORKER_BASE_URL', WORKER_BASE_URL);

app.use('/api/instagram/accounts', verifyAuth, requireCompany, accountsRouter);
app.use('/api/instagram/contacts', verifyAuth, requireCompany, contactsRouter);
app.use(
  '/api/instagram/conversations',
  verifyAuth,
  requireCompany,
  conversationsRouter
);
app.use('/api/instagram/messages', verifyAuth, requireCompany, messagesRouter);
app.use(
  '/api/instagram/templates',
  verifyAuth,
  requireCompany,
  templatesRouter
);
app.use(
  '/api/instagram/broadcasts',
  verifyAuth,
  requireCompany,
  broadcastsRouter
);
app.use('/api/instagram/webhooks', webhooksRouter);

app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    service: 'instagram-service',
    uptime: process.uptime(),
  })
);

const wss = new WebSocketServer({ server, path: '/api/instagram/ws' });
const clientsByCompany = new Map();

wss.on('connection', (ws) => {
  let companyId = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'auth' && msg.companyId) {
        companyId = msg.companyId;
        if (!clientsByCompany.has(companyId))
          clientsByCompany.set(companyId, new Set());
        clientsByCompany.get(companyId).add(ws);
        ws.send(JSON.stringify({ type: 'auth_ok' }));
      }
    } catch {
      /* ignore malformed */
    }
  });

  ws.on('close', () => {
    if (companyId && clientsByCompany.has(companyId)) {
      clientsByCompany.get(companyId).delete(ws);
      if (clientsByCompany.get(companyId).size === 0)
        clientsByCompany.delete(companyId);
    }
  });
});

export function broadcastToCompany(companyId, event) {
  const sockets = clientsByCompany.get(companyId);
  if (!sockets) return;
  const payload = JSON.stringify(event);
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

const PORT = process.env.PORT || 3200;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[instagram-service] listening on port ${PORT}`);
});
