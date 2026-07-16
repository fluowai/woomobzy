# Observability — Phase 4

Additive observability layer for the Express server. Nothing is wired
automatically; each module is opt-in from `server/index.js` or the
equivalent bootstrap file.

## Modules

| File | Purpose |
| --- | --- |
| `server/observability/logger.js` | pino JSON logger with secret redaction |
| `server/observability/httpLogger.js` | Express middleware, per-request child logger + `x-request-id` |
| `server/observability/sentry.js` | Optional Sentry init (no-op unless `SENTRY_DSN` is set) |
| `server/observability/healthcheck.js` | `/healthz` and `/readyz` endpoints |

## Wiring (recommended order)

```js
import express from 'express';
import { initSentry } from './observability/sentry.js';
import { httpLogger } from './observability/httpLogger.js';
import { registerHealthchecks } from './observability/healthcheck.js';
import { logger } from './observability/logger.js';

const app = express();
await initSentry(app);              // 1. Sentry FIRST (captures everything after)
registerHealthchecks(app, {         // 2. Health BEFORE auth so probes bypass it
  checkDb: async () => { /* SELECT 1 */ },
});
app.use(httpLogger);                // 3. Request logging
// ... auth, routes, error handlers ...

app.listen(port, () => logger.info({ port }, 'server started'));
```

## Required dependencies

Add to `server/package.json`:

```
pino
pino-pretty         # devDependency
@sentry/node        # optional, only if SENTRY_DSN used
```

## Environment variables

| Var | Default | Notes |
| --- | --- | --- |
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | pino levels |
| `SERVICE_NAME` | `woomobzy-server` | shown in every log line |
| `SENTRY_DSN` | — | enables Sentry when set |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | 0..1 |
| `APP_VERSION` / `GIT_SHA` | — | tagged on logs and Sentry releases |

## Redaction

The logger redacts `authorization`, `cookie`, `x-api-key` request headers
and any field named `password`, `token`, `access_token`, `refresh_token`,
`apiKey`, `secret` at any depth. Extend `redact.paths` in
`logger.js` when introducing new sensitive fields.

## Next steps (Phase 4.b)

- OpenTelemetry traces via `@opentelemetry/sdk-node` (deferred: needs
  collector endpoint decision).
- Metrics endpoint `/metrics` (Prometheus) once alerting pipeline is defined.
- Ship logs to Loki/Datadog via container stdout — no code change needed.
