const LOCAL_REDIS_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

export function getRedisConfig() {
  const rawUrl = (process.env.REDIS_URL || '').trim();

  if (!rawUrl) {
    return { enabled: false, url: '', reason: 'REDIS_URL ausente' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { enabled: false, url: '', reason: 'REDIS_URL invalida' };
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalHost = LOCAL_REDIS_HOSTS.has(parsed.hostname);
  const allowLocal = process.env.ALLOW_LOCAL_REDIS === 'true';

  if (isProduction && isLocalHost && !allowLocal) {
    return {
      enabled: false,
      url: rawUrl,
      reason: 'REDIS_URL aponta para localhost em producao',
    };
  }

  return { enabled: true, url: rawUrl, reason: '' };
}

export function assertRedisEnabled() {
  const config = getRedisConfig();
  if (!config.enabled) {
    throw new Error(`${config.reason}. Configure um Redis externo para usar a analise KMZ.`);
  }
  return config;
}
