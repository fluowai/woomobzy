import rateLimit from 'express-rate-limit';

/**
 * Create an express-rate-limit middleware.
 * If REDIS_URL is set and rate-limit-redis/ioredis sao instalados,
 * usa Redis como store. Senao, fallback to in-memory.
 */
export async function createRateLimiter(opts = {}) {
  const base = {
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisicoes. Tente novamente em breve.' },
    ...opts,
  };

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return rateLimit(base);

  try {
    const { default: RedisStore } = await import('rate-limit-redis');
    const { default: Redis } = await import('ioredis');
    const client = new Redis(redisUrl, { enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    client.on('error', (e) => console.warn('[rateLimiter] Redis error:', e.message));
    return rateLimit({
      ...base,
      store: new RedisStore({
        sendCommand: (...args) => client.call(...args),
      }),
    });
  } catch (err) {
    console.warn('[rateLimiter] Redis indisponivel, usando in-memory fallback:', err.message);
    return rateLimit(base);
  }
}
