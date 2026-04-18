
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// --- Middlewares & Services ---
import { sessionManager } from './baileys/index.js';

// --- Modular Routes ---
import adminRoutes from './routes/admin.js';
import importRoutes from './routes/import.js';
import publicRoutes from './routes/public.js';
import onboardingRoutes from './routes/onboarding.js';
import domainRoutes from './routes/domains.js';
import whatsappRoutes from './api/whatsapp/index.js';
import crmRoutes from './api/crm/index.js';
import propertyRoutes from './api/properties/index.js';
import tenantHandler from './api/tenant/index.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env only if it exists (for local development)
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();

// --- Global Security & Setup ---
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3005', 'http://localhost:3006', 'https://consultio.com.br'];

app.use(cors({
  origin: (origin, callback) => {
    // 1. Permitir requests sem origin (ex: mobile apps, curl, ferramentas de servidor)
    if (!origin) return callback(null, true);

    const isLocal = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
    const isMainDomain = origin === 'https://consultio.com.br' || origin.endsWith('.consultio.com.br');
    
    // 2. Permitir domínios locais e oficiais
    if (isLocal || isMainDomain || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 3. SaaS Multi-tenant: Permitir qualquer domínio HTTPS legítimo para rotas públicas
    // Em produção real, você validaria isso contra o banco de dados 'domains', 
    // mas para o fluxo de 'Em Breve' e Leads, permitimos para garantir recepção.
    if (origin.startsWith('https://')) {
      return callback(null, true);
    }

    callback(new Error(`CORS: Origem não permitida - ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-impersonate-org-id'],
}));

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
  console.log(`[${new Date().toISOString()}] ${auth} ${req.method} ${req.path}`);
  next();
});

// --- Supabase Client (Service Role for internal use) ---
const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// --- API Route Mapping ---
app.use('/api/admin', adminRoutes);
app.use('/api/import', importRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/properties', propertyRoutes);

// Tenant Resolution

app.get('/api/tenant/resolve', (req, res) => tenantHandler(req, res));
app.get('/api/tenant/current', (req, res) => tenantHandler(req, res));

// System Status & Health
app.get('/api/system-status', async (req, res) => {
  try {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    res.json({ fresh: (count || 0) === 0, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/', (req, res) => res.send('IMOBZY Production API Online 🚀'));

// --- Error Handling ---
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno de servidor',
    timestamp: new Date().toISOString()
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 3006;
app.listen(PORT, async () => {
  console.log(`✅ IMOBZY Server active on port ${PORT}`);
  
  // Boot seguro do sistema WhatsApp (reseta presas, restaura conectadas, inicia heartbeat)
  try {
    console.log('📱 Iniciando sistema WhatsApp (boot seguro)...');
    await sessionManager.boot();
  } catch (e) {
    console.error('⚠️ WhatsApp boot falhou (não crítico):', e.message);
  }
});

export default app;
