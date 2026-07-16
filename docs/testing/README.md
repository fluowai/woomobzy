# Testing — Fase 5 (Hardening)

Contém suites aditivas de **E2E (Playwright)** e **carga (k6)**. Nada é
ligado ao runtime até que os workflows/CI sejam habilitados.

## Playwright (E2E)

Instalação (uma vez):

```
npm i -D @playwright/test
npx playwright install --with-deps chromium
```

Rodar:

```
E2E_BASE_URL=http://localhost:3000 npx playwright test
```

Especs:

- `tests/e2e/smoke.spec.ts` — smoke de `/`, `/healthz`, `/readyz`
  (integra com a Fase 4).
- `tests/e2e/auth.spec.ts` — regressão de AuthN/AuthZ (Fase 2):
  garante que rotas privilegiadas rejeitam anônimos e que o fluxo de
  login funciona. Skipa quando `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`
  não estão no ambiente.

### Secrets CI

- `E2E_BASE_URL` — URL alvo (staging).
- `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` — usuário sintético de teste.

## k6 (Carga)

- `tests/load/k6-baseline.js` — rampa 0→50 VUs em `/healthz`, thresholds
  `p95<500ms` e `error<1%`.
- `tests/load/k6-webhook.js` — 25 VUs por 1m contra
  `/api/webhooks/whatsapp` **sem** assinatura HMAC; deve responder 401/403,
  validando rate-limit + input validation das Fases 3 e 4.

Rodar local:

```
BASE_URL=http://localhost:3000 k6 run tests/load/k6-baseline.js
```

### Secrets CI

- `LOAD_BASE_URL` — endpoint de staging para carga (nunca produção).

## Wiring

- `.github/workflows/e2e.yml` — em cada PR e push para `main`.
- `.github/workflows/load.yml` — manual + semanal (seg 06:00 UTC).

## Próximos passos (Fase 5.b)

- Cobertura de fluxos multi-tenant (impersonation audit, RBAC via `has_role`).
- Contract tests entre webhooks WhatsApp/Traefik e handlers Zod (Fase 3).
- Perfil de carga mais realista com dados sintéticos (fixtures em `tests/load/data/`).
