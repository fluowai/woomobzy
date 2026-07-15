/**
 * Rate limiter backed by Redis when REDIS_URL is set, in-memory otherwise.
 * Wire in server/index.js by replacing express-rate-limit's default store
 * with the store returned here.
 *
 * Usage:
 *   const { buildRateLimitStore } = require('./lib/rateLimiter');
 *   const store = await buildRateLimitStore({ prefix: 'rl:api:' });
 *   rateLimit({ store, windowMs, max, ... });
 */

async function buildRateLimitStore({ prefix = 'rl:' } = {}) {
  const url = process.env.REDIS_URL;
  if (!url) {
    // Fallback: return undefined so express-rate-limit uses its default
    // in-memory MemoryStore. Warn once so ops sees it in logs.
    console.warn(
      '[rateLimiter] REDIS_URL not set; falling back to in-memory store. ' +
      'This is NOT safe across multiple Node workers/containers.'
    );
    return undefined;
  }

  const { default: IORedis } = await import('ioredis');
  const { default: RedisStore } = await import('rate-limit-redis');

  const client = new IORedis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 2,
  });

  client.on('error', (err) => {
    console.error('[rateLimiter] redis error', err.message);
  });

  return new RedisStore({
    // rate-limit-redis v4 signature
    sendCommand: (...args) => client.call(...args),
    prefix,
  });
}

module.exports = { buildRateLimitStore };
