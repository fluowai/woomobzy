import { getPlatformOriginList } from './platform-config.js';

/**
 * CORS configuration extracted from server/index.js for maintainability.
 * Handles both static allowed origins and dynamic custom domain lookup.
 */

const staticAllowedOrigins = [
  ...getPlatformOriginList(),
  'https://okaimoveis.com.br',
  'https://www.okaimoveis.com.br',
  'https://fazendasbrasil.com',
  'https://www.fazendasbrasil.com',
  'https://fazendasbrasil.com.br',
  'https://www.fazendasbrasil.com.br',
];

const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const productionAllowedOrigins = new Set([
  ...staticAllowedOrigins,
  ...envAllowedOrigins,
]);
const customOriginCache = new Map();
const CUSTOM_ORIGIN_CACHE_TTL_MS = 60 * 1000;

async function isAllowedCustomOrigin(
  origin,
  normalizeDomain,
  getSupabaseServer
) {
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

export function createCorsOptions({
  isProduction,
  normalizeDomain,
  getSupabaseServer,
}) {
  const dynamicOriginValidator = (origin, callback) => {
    if (!origin) return callback(null, true);
    if (productionAllowedOrigins.has(origin)) return callback(null, true);

    if (isProduction) {
      isAllowedCustomOrigin(origin, normalizeDomain, getSupabaseServer)
        .then((allowed) => {
          if (allowed) return callback(null, true);
          console.error('CORS BLOCKED:', origin);
          return callback(new Error(`CORS blocked for origin: ${origin}`));
        })
        .catch((error) => callback(error));
      return;
    }

    if (
      origin.endsWith('.wootech.com.br') ||
      origin.endsWith('.imobfluow.com.br') ||
      origin.endsWith('.okaimoveis.com.br') ||
      origin.endsWith('.pages.dev') ||
      origin.endsWith('.onrender.com') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1')
    ) {
      return callback(null, true);
    }

    console.error('❌ CORS BLOCKED:', origin);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  };

  return {
    origin: dynamicOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  };
}
