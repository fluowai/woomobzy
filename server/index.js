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

// --- Debug Logger Middleware ---
app.use((req, res, next) => {
  if (!req.originalUrl.includes('/ws')) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("METHOD:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("ORIGIN:", req.headers.origin || 'No Origin');
    console.log("IP:", req.ip);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
  }
  next();
});

// --- CORS Configuration ---
const staticAllowedOrigins = [
  "https://imobzy.com.br",
  "https://www.imobzy.com.br",
  "https://imobzy.consultio.com.br",
  "https://consultio.com.br",
  "https://woomobzy-production.up.railway.app",
];

const dynamicOriginValidator = (origin, callback) => {
  // Permitir requests sem origin (ex: chamadas S2S, cURL, PM2, Railway Healthcheck)
  if (!origin) {
    return callback(null, true);
  }

  // Permitir origins exatas
  if (staticAllowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Permitir subdomínios da empresa e dev/staging
  if (
    origin.endsWith(".imobzy.com.br") ||
    origin.endsWith(".consultio.com.br") ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".up.railway.app") ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1")
  ) {
    return callback(null, true);
  }

  console.error("❌ CORS BLOCKED:", origin);
  return callback(new Error(`CORS blocked for origin: ${origin}`));
};

const corsOptions = {
  origin: dynamicOriginValidator,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
};

app.use(cors(corsOptions));
// MUITO IMPORTANTE: Garante o Preflight (OPTIONS)
app.options(/(.*)/, cors(corsOptions));
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
    // const supabase = getSupabaseServer();
    // const { count } = await supabase
    //  .from('profiles')
    //  .select('*', { count: 'exact', head: true });
    res.json({
      success: true, status: "online", service: "woomobzy-backend",
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

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`IMOBZY Server active on port ${PORT}`);
});

// Configura o Proxy de WhatsApp com Seguranca SaaS (API + WebSockets).
// O server real e passado para registrar o upgrade do WebSocket.
setupWhatsAppProxy(app, server, verifyAuth, requireTenant);

// --- Error Handling & Fallbacks ---

// Fallback para rotas nao encontradas
app.all(/(.*)/, (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err.message);

  if (err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      error: err.message
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

server.timeout = 30000; // Hardening extra

export default app;
