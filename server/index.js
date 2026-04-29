import express from 'express';
import cors from 'cors';

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// --- Middlewares & Services ---
import { getSupabaseServer } from './lib/supabase-server.js';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env only if it exists (for local development)
dotenv.config({ path: join(__dirname, '../.env') });

// ── Validação de Variáveis de Ambiente Obrigatórias ───────────────────────
const REQUIRED_ENV_VARS = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]?.trim());
if (missingVars.length > 0) {
  console.error(
    '\n❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias não encontradas:'
  );
  missingVars.forEach((v) => console.error(`   ❗ ${v}`));
  console.error('\n → Em produção (Railway): adicione em Settings → Variables');
  console.error(' → Em desenvolvimento: verifique o arquivo .env na raiz\n');
  // Não encerra o processo — permite que o servidor suba mas retorna erros
  // claros em cada requisição em vez de crashar no boot.
}

const app = express();

// --- Global Security & Setup ---
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// SEGURANÇA CORS: Lista explícita de origens permitidas
// NUNCA permita todos os domínios HTTPS em produção
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3005',
      'http://localhost:3006',
      'https://consultio.com.br',
      'https://imobzy.consultio.com.br',
      'https://www.consultio.com.br',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Permitir requests sem origin (ex: mobile apps, curl, ferramentas de servidor)
      if (!origin) return callback(null, true);

      const isLocal =
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1');
      const isMainDomain =
        origin === 'https://consultio.com.br' ||
        origin.endsWith('.consultio.com.br');

      // 2. Permitir APENAS domínios da lista explícita
      if (isLocal || isMainDomain || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // 3. BLOCK: Não permitir domínios HTTPS arbitrários em produção
      // Isso era um VULNERABILIDADE CRÍTICA que permitia ataques CSRF
      console.warn(`[CORS] Bloqueando origem não permitida: ${origin}`);
      callback(new Error(`CORS: Origem não permitida - ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-impersonate-org-id'],
  })
);

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

// --- Error Handling ---
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno de servidor',
    timestamp: new Date().toISOString(),
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 3006;
app.listen(PORT, async () => {
  console.log(`✅ IMOBZY Server active on port ${PORT}`);
});

export default app;
