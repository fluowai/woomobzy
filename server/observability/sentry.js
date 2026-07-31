/**
 * Optional Sentry initialization.
 * Activated only when SENTRY_DSN is set — safe no-op otherwise.
 * Import and call initSentry() at server bootstrap, BEFORE routes.
 */
export async function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return { enabled: false };

  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || process.env.GIT_SHA,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE || 0),
  });

  if (app && Sentry.setupExpressErrorHandler) {
    Sentry.setupExpressErrorHandler(app);
  }
  return { enabled: true, Sentry };
}
