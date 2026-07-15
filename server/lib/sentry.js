// Lazy Sentry wrapper - no-op se SENTRY_DSN ausente ou @sentry/node nao instalado.
let _Sentry = null;

export async function initSentry() {
  if (_Sentry) return _Sentry;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    });
    _Sentry = Sentry;
    console.log('[Sentry] inicializado');
    return Sentry;
  } catch (err) {
    console.warn('[Sentry] nao foi possivel inicializar:', err.message);
    return null;
  }
}

export function sentryRequestHandler() {
  return (req, res, next) => {
    if (_Sentry && _Sentry.Handlers && _Sentry.Handlers.requestHandler) {
      return _Sentry.Handlers.requestHandler()(req, res, next);
    }
    next();
  };
}

export function sentryErrorHandler() {
  return (err, req, res, next) => {
    if (_Sentry && _Sentry.Handlers && _Sentry.Handlers.errorHandler) {
      return _Sentry.Handlers.errorHandler()(err, req, res, next);
    }
    next(err);
  };
}

export function captureException(err) {
  if (_Sentry) { try { _Sentry.captureException(err); } catch {} }
}
