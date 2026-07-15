# Fase 1 - Hardening para produção

Checklist de bloqueadores identificados na auditoria. Itens marcados **[manual]**
não podem ser feitos via PR e exigem ação do time.

## O que este PR já entrega

- [x] ESLint `no-console` (warn) para código de aplicacão, desligado em `server/`,
      `scripts/`, testes e configs. Impede o retorno dos 1000+ logs limpos.
- [x] `build.sourcemap: false` no `vite.config.ts` - sourcemaps não vão mais
      para produção.
- [x] `.gitignore` reforçado: `backups/`, `*.sql.gz`, `*.dump`,
      `playwright-report/`, `test-results/`, `*.map`, `.env.*`
      (whitelist apenas `.env.example`).
- [x] `server/lib/rateLimiter.js` - store Redis (`REDIS_URL`) para
      `express-rate-limit`, com fallback in-memory e warning. Elimina o
      problema de rate-limit por instância quando escalar horizontalmente.
- [x] `server/lib/sentry.js` - init opcional (`SENTRY_DSN`) + middlewares de
      request/error para o Express.
- [x] `src/sentry.client.ts` - init do frontend (`VITE_SENTRY_DSN`) via
      dynamic import (zero custo quando desligado).
- [x] `playwright.config.ts` + `tests/e2e/smoke.spec.ts` - smoke E2E (`/`,
      `/login`, console errors).

### Passos para ativar

1. `npm i -D @playwright/test && npx playwright install chromium`
2. `npm i @sentry/node @sentry/react ioredis rate-limit-redis`
3. Em `server/index.js`, cedo no boot:
   ```js
   const { initSentry, sentryRequestHandler, sentryErrorHandler } = require('./lib/sentry');
   initSentry();
   app.use(sentryRequestHandler());
   // ... rotas ...
   app.use(sentryErrorHandler());
   ```
4. No `rateLimit(...)` atual, injetar o store:
   ```js
   const { buildRateLimitStore } = require('./lib/rateLimiter');
   const store = await buildRateLimitStore({ prefix: 'rl:api:' });
   rateLimit({ store, windowMs: 15*60_000, max: 100, ... });
   ```
5. Em `src/main.tsx`, antes de `createRoot(...)`:
   ```ts
   import './sentry.client';
   ```
6. Rodar `npx playwright test` no CI.

## Itens críticos [manual] - não incluídos no PR

- [ ] **Auditoria de RLS** (Supabase): rodar `supabase db lint` + revisar cada
      policy por tabela. Bloqueador absoluto de SaaS multi-tenant.
- [ ] **Purga do histórico git** de segredos (DirectAdmin API key,
      credenciais de infra que estiveram em `.env`). Usar
      `git filter-repo` ou `bfg`. **Rotacionar todos os segredos** antes,
      pois o histórico é público a qualquer clone anterior.
- [ ] **Migrar segredos para Doppler / Vault / AWS Secrets Manager**.
      Docker Compose com `secrets:` é o mínimo aceitável para stacks
      Portainer.
- [ ] **Plano B para `whatsapp-service`** via `whatsmeow` - risco de ban da
      Meta. Preparar migração para WhatsApp Cloud API oficial para clientes
      que não podem tolerar downtime.
- [ ] Auditar imports de `@google/generative-ai` / `groq-sdk` - se algum
      componente React importar, a chave sai no bundle. Rodar
      `rg -n '@google/generative-ai|groq-sdk' src/` para confirmar.
