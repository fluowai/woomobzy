# Fase 7 — LGPD/Compliance + Deploy Blue-Green

Fecha o programa de *hardening* adicionando conformidade LGPD (portal do titular,
consentimentos, auditoria, retenção) e uma esteira de deploy blue-green.

## Entregas

### LGPD
- `migrations/20260716000000_lgpd_consents_and_audit.sql` — tabelas `consents`,
  `data_access_log`, `retention_policies` (com RLS, GRANTs e índices).
- `server/routes/privacy.js` — endpoints autenticados:
  - `GET  /api/privacy/export`   → gera dump JSON dos dados do titular.
  - `POST /api/privacy/delete`   → soft-delete + agenda purga em 30 dias.
  - `GET  /api/privacy/consent`  → lista consentimentos do usuário.
  - `POST /api/privacy/consent`  → grava/atualiza (audita IP + UA).
- `docs/legal/PRIVACY-POLICY.md`, `docs/legal/DPA.md`,
  `docs/legal/SUBPROCESSORS.md` — templates com placeholders `[APP_OWNER]`,
  `[DPO_EMAIL]`, `[ANPD_CONTACT]`.
- `docs/RUNBOOK-DPO.md` — SLA ANPD (15 dias), matriz de bases legais,
  procedimento de incidente e notificação de titulares.

### Deploy Blue-Green
- `.github/workflows/deploy-bluegreen.yml` — deploy → `green` idle → smoke +
  k6 → health-gate (`/api/health` 10x OK) → swap `ACTIVE_COLOR` → rollback
  automático se error rate > 1 % em 5 min.
- `docs/RUNBOOK-BLUE-GREEN.md` — diagrama, procedimento manual e critérios
  de rollback.

## Pendências manuais (fora do PR)
1. Preencher placeholders legais e publicar `/privacidade` linkado no rodapé.
2. Provisionar dois ambientes (blue/green) no provider de hosting.
3. Cadastrar `ACTIVE_COLOR` + webhooks de rollback no Alertmanager.
4. Rodar a migração LGPD em cada projeto Supabase.
