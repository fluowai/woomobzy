import express from 'express';
import cors from 'cors';

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// --- Middlewares & Services ---
import { getSupabaseServer } from './lib/supabase-server.js';
import { verifyAuth } from './middleware/auth.js';
import { requireTenant } from './middleware/tenant.js';

// --- Modular Routes ---
import adminRoutes from './routes/admin.js';
import importRoutes from './routes/import.js';
import publicRoutes from './routes/public.js';
import onboardingRoutes from './routes/onboarding.js';
import domainRoutes from './routes/domains.js';
import crmRoutes from './api/crm/index.js';
import propertyRoutes from './api/properties/index.js';
import tenantHandler from './api/tenant/index.js';
import ruralRoutes from './api/rural/index.js';
import urbanRoutes from './api/urban/index.js';
import locacaoRoutes from './api/locacao/index.js';
import cobrancaRoutes from './api/cobranca/index.js';
import aiRoutes from './api/ai/index.js';
import storageRoutes from './api/storage/index.js';
import whatsappRoutes, { setupWhatsAppProxy } from './api/whatsapp/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env only if it exists (for local development)
dotenv.config({ path: join(__dirname, '../.env') });

// ── Validação de Variáveis de Ambiente Obrigatórias ───────────────────────
const REQUIRED_ENV_VARS = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]?.trim());

console.log('\n--- WhatsApp Check ---');
console.log(`WhatsMeow URL: ${process.env.WHATSAPP_API_URL ? '✅ Configurada' : '❌ AUSENTE'}`);
console.log('-------------------------\n');

if (missingVars.length > 0) {
  console.error(
    '\n❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias não encontradas:'
  );
  missingVars.forEach((v) => console.error(`   ❗ ${v}`));
  console.error('\n → Em produção (Railway/Vercel): adicione em Settings → Variables');
  console.error(' → Em desenvolvimento: verifique o arquivo .env na raiz\n');
}

const app = express();
app.set('trust proxy', 1);

// --- Global Security & Setup ---
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS: lista explicita de origens permitidas.
// Mantemos os dominios padrao mesmo quando ALLOWED_ORIGINS existe no ambiente.
const defaultAllowedOrigins = [
  'http://localhost:3005',
  'http://localhost:3006',
  'https://consultio.com.br',
  'https://imobzy.consultio.com.br',
  'https://www.consultio.com.br',
  'https://woomobzy-production.up.railway.app',
];

const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  return (
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin === 'https://consultio.com.br' ||
    origin.endsWith('.consultio.com.br') ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.up.railway.app') ||
    allowedOrigins.includes(origin)
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Bloqueando origem nao permitida: ${origin}`);
    callback(new Error(`CORS: Origem nao permitida - ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'Accept',
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-tenant-id',
    'x-impersonate-org-id',
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Generoso para produção inicial
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
});

app.use(globalLimiter);
app.use(express.json({ limit: '50mb' }));

// Request Logging
app.use((req, res, next) => {
  const auth = req.headers.authorization ? '🔒' : '🔓';
  console.log(
    `[${new Date().toISOString()}] ${auth} ${req.method} ${req.path}`
  );
  next();
});

// --- Supabase Client (lazy, via shared singleton) ---
// Nota: não criamos o client aqui para evitar crash se env vars estiverem ausentes.
// O cliente é criado sob demanda em cada rota via getSupabaseServer().

// --- API Route Mapping ---
app.use('/api/admin', adminRoutes);
app.use('/api/import', importRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/rural', ruralRoutes);
app.use('/api/urban', urbanRoutes);
app.use('/api/locacao', locacaoRoutes);
app.use('/api/cobranca', cobrancaRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/storage', verifyAuth, requireTenant, storageRoutes);
// app.use('/api/whatsapp', whatsappRoutes); // Substituído pelo proxy abaixo

// Tenant Resolution

app.get('/api/tenant/resolve', (req, res) => tenantHandler(req, res));
app.get('/api/tenant/current', (req, res) => tenantHandler(req, res));

// System Status & Health
app.get('/api/system-status', async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    res.json({
      fresh: (count || 0) === 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) =>
  res.json({ status: 'ok', uptime: process.uptime() })
);
app.get('/', (req, res) => res.send('IMOBZY Production API Online 🚀'));

// --- Server Startup ---
const PORT = process.env.PORT || 3002;

const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_ENVIRONMENT_ID || !!process.env.RAILWAY_PROJECT_ID;
const isVercel = process.env.VERCEL === '1' && !isRailway;
const shouldListen = !isVercel;

const server = shouldListen
  ? app.listen(PORT, async () => {
      console.log(`IMOBZY Server active on port ${PORT}`);
    })
  : null;

// Configura o Proxy de WhatsApp com Seguranca SaaS (API + WebSockets).
// O server real e passado para registrar o upgrade do WebSocket.
setupWhatsAppProxy(app, server, verifyAuth, requireTenant);

// --- Error Handling ---
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno de servidor',
    timestamp: new Date().toISOString(),
  });
});

export default app;
