/**
 * Sentry init for the Node/Express backend.
 * No-op when SENTRY_DSN is not set, so local dev stays quiet.
 *
 * Wire in server/index.js as EARLY as possible:
 *   const { initSentry, sentryRequestHandler, sentryErrorHandler } = require('./lib/sentry');
 *   initSentry();
 *   app.use(sentryRequestHandler());
 *   // ... routes ...
 *   app.use(sentryErrorHandler());
 */

let Sentry = null;

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    // Lazy require so the dep is optional until installed.
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE || 0),
    });
    return Sentry;
  } catch (err) {
    console.warn('[sentry] @sentry/node not installed:', err.message);
    return null;
  }
}

function sentryRequestHandler() {
  return (req, _res, next) => next();
}

function sentryErrorHandler() {
  return (err, _req, _res, next) => {
    if (Sentry && err) {
      try { Sentry.captureException(err); } catch (_) { /* noop */ }
    }
    next(err);
  };
}

module.exports = { initSentry, sentryRequestHandler, sentryErrorHandler };
