// Sentry client init - dynamic import para nao inchar o bundle se nao hauver DSN.
const dsn = (import.meta.env as any)?.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: (import.meta.env as any)?.MODE || 'production',
        tracesSampleRate: Number((import.meta.env as any)?.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
      });
    })
    .catch((err) => {
      console.warn('[Sentry] falhou ao carregar:', (err as Error).message);
    });
}
