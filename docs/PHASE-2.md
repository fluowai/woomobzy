# Fase 2 — Ativação, CI e auditorias

Esta fase liga as ferramentas plantadas na Fase 1 e trava regressões via CI.

## Entregas deste PR

- **`.github/workflows/ci.yml`** — lint + type-check + build + audit AI + gitleaks (secret scan). E2E rodável via `vars.RUN_E2E = true`.
- **`scripts/audit-ai-imports.mjs`** — falha o build se `@google/generative-ai` ou `groq-sdk` aparecerem em `src/` (evita vazar chave no bundle).
- **`scripts/rls-check.sh`** — audita RLS no Supabase (`supabase db lint` + tabelas sem RLS/policies).
- **`.gitleaks.toml`** — regras + allowlist para o gitleaks-action.
- **`package.json`** — scripts: `audit:ai-leak`, `db:lint`, `test:e2e`.
- **`.env.production.example`** — variáveis para produção (Sentry, Redis, WhatsApp fallback).

## Passos de ativação (manuais, uma vez)

1. **Dependências opcionais** (só quando for ligar de fato):
   ```bash
   npm i @sentry/node @sentry/react ioredis rate-limit-redis
   npm i -D @playwright/test && npx playwright install chromium
   ```
2. **Sentry no backend** — em `server/index.js`, antes de `app.use(helmet(...))`:
   ```js
   import { initSentry, sentryRequestHandler, sentryErrorHandler } from './lib/sentry.js';
   initSentry();
   app.use(sentryRequestHandler());
   // ... rotas ...
   app.use(sentryErrorHandler()); // antes do global error handler
   ```
3. **Sentry no cliente** — no ponto de entrada do bundle (ex.: `src/imports/main.tsx`), adicione no topo:
   ```ts
   import '../sentry.client';
   ```
4. **Redis rate-limit** — substitua o `globalLimiter` em `server/index.js`:
   ```js
   import { buildRateLimitStore } from './lib/rateLimiter.js';
   const store = await buildRateLimitStore({ prefix: 'rl:global:' });
   const globalLimiter = rateLimit({ store, windowMs: 15*60*1000, max: 1000, ... });
   ```
5. **Segredos** — configure no ambiente (Portainer/Doppler): `SENTRY_DSN`, `VITE_SENTRY_DSN`, `REDIS_URL`.
6. **CI E2E** — em Settings → Actions → Variables, defina `RUN_E2E=true` e `E2E_BASE_URL=https://staging.seu-dominio`.

## Auditorias obrigatórias antes de produção

- [ ] `bash scripts/rls-check.sh` — rodar em cada projeto Supabase, tolerância zero.
- [ ] Purgar histórico git de segredos com `git filter-repo` **após** rotacionar todas as chaves (DirectAdmin, Supabase service_role, JWT secrets, credenciais SMTP, WhatsApp).
- [ ] Migrar `.env` para Doppler / AWS Secrets Manager / Vault. Docker Compose `secrets:` é o mínimo.
- [ ] Plano B para `whatsapp-service` (whatsmeow → WhatsApp Cloud API oficial para contas críticas).

## Verificação pós-merge

```bash
npm run lint && npm run type-check && npm run build
node scripts/audit-ai-imports.mjs
```

CI deve passar nas 3 jobs: `quality`, `secret-scan` (e `e2e` se ligado).
