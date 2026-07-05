import express from 'express';
import cors from 'cors';

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import {
  normalizeDomain,
  syncPlatformTraefikServices,
  syncRegisteredDockerDomains,
} from './domainService.js';

// --- Middlewares & Services ---
import { getSupabaseServer } from './lib/supabase-server.js';
import { verifyAuth } from './middleware/auth.js';
import { requireTenant } from './middleware/tenant.js';

// --- Modular Routes ---
import adminRoutes from './routes/admin.js';
import internalRoutes from './routes/internal.js';
import importRoutes from './routes/import.js';
import publicRoutes from './routes/public.js';
import onboardingRoutes from './routes/onboarding.js';
import domainRoutes from './routes/domains.js';
import crmRoutes from './api/crm/index.js';
import crmClientsRoutes from './api/crm/clients/index.js';
import propertyRoutes from './api/properties/index.js';
import tenantHandler from './api/tenant/index.js';
import ruralRoutes from './api/rural/index.js';
import urbanRoutes from './api/urban/index.js';
import locacaoRoutes from './api/locacao/index.js';
import cobrancaRoutes from './api/cobranca/index.js';
import aiRoutes from './api/ai/index.js';
import storageRoutes from './api/storage/index.js';
import demoRoutes from './api/demo/index.js';
import fluowaiMigrationRoutes from './api/fluowai-migration/index.js';
import whatsappRoutes, { setupWhatsAppProxy } from './api/whatsapp/index.js';
import emailRoutes from './api/email/index.js';
import siteRoutes from './api/sites/index.js';
import oruloRoutes from './api/orulo/index.js';
import portalRoutes from './api/portals/index.js';
import settingsRoutes from './api/settings/index.js';
import valuationRoutes from './api/valuation/index.js';
import documentRoutes from './api/documents/index.js';
import externalDataRoutes from './api/external-data/index.js';
import quizRoutes from './api/quiz/index.js';
import accountRoutes from './routes/account.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env only if it exists (for local development)
dotenv.config({ path: join(__dirname, '../.env') });

// ── Validação de Variáveis de Ambiente Obrigatórias ───────────────────────
const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]?.trim());

console.log('\n--- WhatsApp Check ---');
console.log(`WhatsApp Provider: ${process.env.WHATSAPP_PROVIDER || 'whatsmeow'}`);
console.log(`WhatsApp URL: ${process.env.WHATSAPP_API_URL || process.env.WAHA_API_URL || process.env.ARRAPHA_API_URL ? 'configurada' : 'ausente'}`);
console.log('-------------------------\n');

if (missingVars.length > 0) {
  console.error(
    '\n❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias não encontradas:'
  );
  missingVars.forEach((v) => console.error(`   ❗ ${v}`));
  console.error('\n → Em producao Docker: adicione no stack/env do servico');
  console.error(' → Em desenvolvimento: verifique o arquivo .env na raiz\n');
}

const app = express();
app.set('trust proxy', 1);
const isProduction = process.env.NODE_ENV === 'production';

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const originalJson = res.json.bind(res);
  const originalEnd = res.end.bind(res);
  let timingRecorded = false;

  const recordTimingHeaders = () => {
    if (timingRecorded || res.headersSent) return;
    timingRecorded = true;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const currentTiming = res.getHeader('Server-Timing');
    const appTiming = `app;dur=${durationMs.toFixed(1)}`;
    res.setHeader('Server-Timing', currentTiming ? `${currentTiming}, ${appTiming}` : appTiming);
    res.setHeader('X-Response-Time', `${durationMs.toFixed(1)}ms`);
    res.setHeader('X-Process-Memory-Rss', String(process.memoryUsage().rss));
  };

  res.json = (body) => {
    if (!res.headersSent) {
      res.setHeader('X-Response-Bytes', Buffer.byteLength(JSON.stringify(body), 'utf8'));
      recordTimingHeaders();
    }
    return originalJson(body);
  };

  res.end = (...args) => {
    recordTimingHeaders();
    return originalEnd(...args);
  };

  next();
});

app.use(compression({ threshold: 1024 }));

// --- Global Security & Setup ---
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          useDefaults: true,
          directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://connect.facebook.net"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "media-src": ["'self'", "data:", "blob:", "https:"],
            "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
            "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://app.imobfluow.com.br", "wss://app.imobfluow.com.br", "https://imobfluow.com.br", "wss://imobfluow.com.br", "https://okaimoveis.com.br", "wss://okaimoveis.com.br", "https://www.okaimoveis.com.br", "wss://www.okaimoveis.com.br", "https://fazendasbrasil.com", "wss://fazendasbrasil.com", "https://www.fazendasbrasil.com", "wss://www.fazendasbrasil.com", "https://fazendasbrasil.com.br", "wss://fazendasbrasil.com.br", "https://www.fazendasbrasil.com.br", "wss://www.fazendasbrasil.com.br"],
            "frame-ancestors": ["'self'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

// --- Debug Logger Middleware ---
app.use((req, res, next) => {
  if (!isProduction && !req.originalUrl.includes('/ws')) {
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
  "https://app.imobfluow.com.br",
  "https://imobfluow.com.br",
  "https://www.imobfluow.com.br",
  "https://okaimoveis.com.br",
  "https://www.okaimoveis.com.br",
  "https://fazendasbrasil.com",
  "https://www.fazendasbrasil.com",
  "https://fazendasbrasil.com.br",
  "https://www.fazendasbrasil.com.br",
];
const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];
const productionAllowedOrigins = new Set([...staticAllowedOrigins, ...envAllowedOrigins]);
const customOriginCache = new Map();
const CUSTOM_ORIGIN_CACHE_TTL_MS = 60 * 1000;

async function isAllowedCustomOrigin(origin) {
  try {
    const url = new URL(origin);
    if (!['https:', 'http:'].includes(url.protocol)) return false;

    const hostname = normalizeDomain(url.hostname);
    const cached = customOriginCache.get(hostname);
    if (cached && cached.expiresAt > Date.now()) return cached.allowed;

    const supabase = getSupabaseServer();
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('custom_domain', hostname)
      .maybeSingle();

    let allowed = !!org;
    if (!allowed) {
      const { data: domainEntry } = await supabase
        .from('domains')
        .select('organization_id')
        .eq('domain', hostname)
        .maybeSingle();
      allowed = !!domainEntry;
    }

    customOriginCache.set(hostname, {
      allowed,
      expiresAt: Date.now() + CUSTOM_ORIGIN_CACHE_TTL_MS,
    });

    return allowed;
  } catch (error) {
    console.error('CORS custom origin lookup failed:', error.message);
    return false;
  }
}

const dynamicOriginValidator = (origin, callback) => {
  // Permitir requests sem origin (ex: chamadas S2S, cURL, PM2, healthcheck interno)
  if (!origin) {
    return callback(null, true);
  }

  // Permitir origins exatas
  if (productionAllowedOrigins.has(origin)) {
    return callback(null, true);
  }

  if (isProduction) {
    isAllowedCustomOrigin(origin)
      .then((allowed) => {
        if (allowed) return callback(null, true);
        console.error("CORS BLOCKED:", origin);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      })
      .catch((error) => callback(error));
    return;
  }

  // Permitir subdomínios da empresa e dev/staging
  if (
    origin.endsWith(".imobfluow.com.br") ||
    origin.endsWith(".okaimoveis.com.br") ||
    origin.endsWith(".pages.dev") ||
    origin.endsWith(".onrender.com") ||
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, res, next) => {
  if (!isProduction) {
    const auth = req.headers.authorization ? 'auth' : 'anon';
    console.log(`[${new Date().toISOString()}] ${auth} ${req.method} ${req.path}`);
  }
  next();
});

// --- Supabase Client (lazy, via shared singleton) ---
// Nota: não criamos o client aqui para evitar crash se env vars estiverem ausentes.
// O cliente é criado sob demanda em cada rota via getSupabaseServer().

// --- API Route Mapping ---
app.use('/internal', internalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/import', importRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/crm/clients', crmClientsRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/rural', ruralRoutes);
app.use('/api/urban', urbanRoutes);
app.use('/api/locacao', locacaoRoutes);
app.use('/api/cobranca', cobrancaRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/fluowai-migration', fluowaiMigrationRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/orulo', oruloRoutes);
app.use('/api/portals', portalRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/valuation', valuationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/external-data', externalDataRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/storage', verifyAuth, requireTenant, storageRoutes);
// app.use('/api/whatsapp', whatsappRoutes); // Substituído pelo proxy abaixo

// Tenant Resolution

app.get('/api/tenant/resolve', (req, res) => tenantHandler(req, res));
app.get('/api/tenant/current', (req, res) => tenantHandler(req, res));

// System Status & Health
app.get('/api/system-status', async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      status: "online",
      service: "woomobzy-backend",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error("SYSTEM STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Old route backup below (commented out by replacement):
/*
/*
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

*/
app.get('/health', (req, res) =>
  res.json({ status: 'ok', uptime: process.uptime() })
);
app.get('/', (req, res) => res.send('ImobFluow Production API Online'));

// --- Server Startup ---
const PORT = process.env.PORT || 3002;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`ImobFluow Server active on port ${PORT}`);

  try {
    const traefikSync = await syncPlatformTraefikServices();
    if (!traefikSync.skipped) {
      console.log(`[Traefik] Platform services synchronized: ${traefikSync.configPath}`);
    }

    const supabase = getSupabaseServer();
    const domainSync = await syncRegisteredDockerDomains(supabase, { validateDns: false });
    const syncedCount = domainSync.results.filter((result) => result.status === 'success').length;
    const skippedCount = domainSync.results.filter((result) => result.status !== 'success').length;
    console.log(`[Traefik] Registered domains synchronized: ${syncedCount} ok, ${skippedCount} skipped`);
  } catch (error) {
    console.error('[Traefik] Failed to synchronize dynamic configuration:', error.message);
  }
});

// Rota para acionar boas-vindas automaticas ao capturar lead via WhatsApp
app.post('/api/send-welcome', async (req, res) => {
  try {
    const { name, phone, propertyTitle } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Nome e telefone sao obrigatorios' });
    }

    const activityData = {
      organization_id: req.orgId || null,
      type: 'WhatsApp',
      description: `Boas-vindas enviada para ${name} (${phone}) - Imovel: ${propertyTitle || 'N/A'}`,
      metadata: { name, phone, property_title: propertyTitle, source: 'lead-capture-modal' },
    };

    try {
      const supabase = getSupabaseServer();
      await supabase.from('lead_activities').insert(activityData);
    } catch (dbErr) {
      console.warn('[SendWelcome] Nao foi possivel registrar atividade:', dbErr.message);
    }

    res.json({ success: true, message: 'Boas-vindas registrada' });
  } catch (err) {
    console.error('[SendWelcome Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Configura o Proxy de WhatsApp com Seguranca SaaS (API + WebSockets).
// O server real e passado para registrar o upgrade do WebSocket.
setupWhatsAppProxy(app, server, verifyAuth, requireTenant);

// 10. HARDENING EXTRA - Fallback para rotas nao encontradas
app.all(/(.*)/, (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// 7. TRATAMENTO GLOBAL DE ERROS
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error("GLOBAL ERROR:", isDev ? err : err.message);

  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      error: err.message,
      code: 'CORS_BLOCKED',
    });
  }

  // Erros de validação do banco
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Registro duplicado. Este recurso já existe.',
      code: 'DUPLICATE_ENTRY',
    });
  }

  if (err.code === '23503') {
    return res.status(409).json({
      success: false,
      error: 'Operação não permitida: registro possui vínculos com outros dados.',
      code: 'FOREIGN_KEY_VIOLATION',
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Arquivo muito grande. O limite é de 10MB.',
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: isDev ? err.message : 'Erro interno do servidor',
    ...(isDev && { stack: err.stack?.split('\n').slice(0, 5).join('\n') }),
    code: err.code || 'INTERNAL_ERROR',
  });
});

// WebSocket connections must stay open behind reverse proxies. Keep request
// timeouts disabled for upgraded sockets and let the WS heartbeat/proxy decide.
server.timeout = 0;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

export default app;

