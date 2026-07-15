/**
 * Frontend Sentry init. Import once from src/main.tsx BEFORE createRoot():
 *   import './sentry.client';
 *
 * No-op unless VITE_SENTRY_DSN is set. Keeps the bundle free of the SDK
 * runtime when Sentry is disabled by tree-shaking the dynamic import.
 */

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    });
  });
}

export {};
