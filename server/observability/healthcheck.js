/**
 * Health check endpoints.
 * - /healthz  : liveness  (process is up)
 * - /readyz   : readiness (dependencies reachable)
 *
 * Mount BEFORE auth middleware.
 */
export function registerHealthchecks(app, deps = {}) {
  const startedAt = Date.now();

  app.get('/healthz', (_req, res) => {
    res.json({
      status: 'ok',
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      version: process.env.APP_VERSION || process.env.GIT_SHA || 'dev',
    });
  });

  app.get('/readyz', async (_req, res) => {
    const checks = {};
    let ok = true;

    if (typeof deps.checkDb === 'function') {
      try { await deps.checkDb(); checks.db = 'ok'; }
      catch (e) { ok = false; checks.db = `fail: ${e.message}`; }
    }
    if (typeof deps.checkRedis === 'function') {
      try { await deps.checkRedis(); checks.redis = 'ok'; }
      catch (e) { ok = false; checks.redis = `fail: ${e.message}`; }
    }

    res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'degraded', checks });
  });
}
