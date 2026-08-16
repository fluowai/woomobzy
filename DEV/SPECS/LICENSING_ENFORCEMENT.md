# Spec — Incremento 7: Enforcement do Licenciamento Wootech

Status: CONCLUÍDO (implementado e testado; aguardando validação visual do maestro)
Local: `server/middleware/auth.js` + `server/lib/licensing/enforcement.js` (novo) + env + docs

## Contexto

Incrementos 1-6 concluídos: schema SQL, crypto Ed25519/WOLK1, policy/estado/envelope,
endpoints de instalação (`/api/licensing/v1`), API admin (`/api/mega/licenses`) e telas
Mega Admin (`/megaadmin/licenses`). Falta o **enforcement**: fazer com que o estado da
licença do tenant bloqueie ou degrade o acesso ao painel.

## Objetivo

Aplicar a política de licença na autenticação dos painéis (tenant) SEM criar risco de
lockout em produção. Acesso do control plane (mega/superadmin/reseller) nunca é bloqueado.

## Decisões do contrato

### 1. Quem é "gated" (escopo do enforcement)

| Perfil / contexto                                      | Enforcement?             | Motivo                                                         |
| ------------------------------------------------------ | ------------------------ | -------------------------------------------------------------- |
| superadmin sem org (mega admin)                        | NÃO                      | Control plane: administra licenças; nunca pode se trancar fora |
| superadmin com org reseller                            | NÃO                      | Control plane de revenda; gerencia clientes                    |
| superadmin impersonando tenant (`req.isImpersonating`) | SIM (pela org alvo)      | O tenant impersonado é quem tem licença                        |
| admin/broker/gerente/assistente/user com org           | SIM (pela org do perfil) | Tenant final é o alvo do licenciamento                         |
| perfil sem org (onboarding/first-login)                | NÃO                      | Sem tenant não há licença a checar                             |

### 2. Modos de operação (fail-open por padrão)

Controlado por `LICENSE_ENFORCEMENT` (env) com override por feature flag no banco
(`app_settings`/`feature_flags`, chave `license_enforcement`). Valores:

- `off` (padrão) — nunca bloqueia; apenas audita. **Fail-open total.**
- `soft` — bloqueia só `blocked`/`revoked`/`expired` com política **hard**; graça/expiração
  soft entram em **modo degradado** (acesso liberado, `req.licenseState` preenchido, banner).
- `hard` — além do soft, org sem licença em **ativos desde antes do rollout** pode ser
  tratada como degradada se houver `legacy_tenant: true` no `organizations.metadata`;
  caso contrário, sem licença = 403 (fail-closed).

Critério de segurança: **falha de infraestrutura (erro de banco/timeout) nunca bloqueia**
— loga `enforcement_error` e segue fail-open, para a plataforma nunca cair por falha do
enforcement em si.

### 3. Regras de estado (reuso de `policy.js`)

Avaliação via `computeLicenseState`/`evaluateLicense` sobre a licença do tenant:

| Estado                          | Ação no `soft`/`hard`                                                           |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `valid`                         | libera                                                                          |
| `grace` / `expired` (soft/none) | libera em **modo degradado** + audit                                            |
| `expired` (política hard)       | 403 `LICENSE_BLOCKED_HARD`                                                      |
| `blocked` / `revoked`           | 403 `LICENSE_BLOCKED` / `LICENSE_REVOKED` (hard block não destrutivo)           |
| `no_license`                    | `off`/`soft`: libera + audit `license_missing_org`; `hard`: 403 (ver §2 legacy) |
| `suspended`                     | `off`: libera + audit; `soft`/`hard`: 403 `LICENSE_SUSPENDED`                   |

- Bloqueio é **não destrutivo** (dados do tenant preservados — regra 18 do plano).
- Resposta 403 padrão: `{ error, code, license: { state, expires_at, blocking_policy } }`.

### 4. Onde entra

- Novo módulo `server/lib/licensing/enforcement.js`: `resolveOrgLicense(supabase, orgId)`
  - `enforceLicenseAccess({ mode })` → `(req, res, next)`.
- Chamado **dentro de `verifyAuth`** (`server/middleware/auth.js`) logo após a resolução de
  tenant (`req.orgId` definido e `req.tenantValidated === true`), antes do `next()` final.
- Cache de licença por org via `TtlCache` (TTL 60s, mesmo padrão do `organizationCache`);
  invalidação explícita em `setLicenseStatus`/`createLicense`/`reissueLicenseKey` do admin.
- **Rotas públicas/isenta**: os endpoints que NÃO passam por `verifyAuth` não são afetados.
  Endpoints de licenciamento em si (`/api/licensing/v1/*`, `/api/mega/licenses/*`) continuam
  funcionando independente do enforcement (são a forma de curar a licença).

### 5. Frontend

- Expor `license` no payload de bootstrap/profile (via endpoint existente do perfil ou
  `req.licenseState` em resposta 200 com header/info): quando em modo degradado, o painel
  renderiza banner "Licença em carência/expirada" (sem travar navegação).
- 403 de licença → telas de login já tratam `code`; nova página/estado
  `LICENSE_BLOCKED` com CTA "Contatar suporte" (sem logout forçado).

### 6. Migração de dados / rollout

- Nenhuma coluna nova obrigatória. Opcional: `organizations.metadata.legacy_tenant` para
  o modo `hard` reconhecer tenants pré-rollout sem licença.
- Seed opcional em `app_settings` (`license_enforcement = off`) para troca em runtime sem
  redeploy.

## Fora de escopo deste incremento

- Gating granular por entitlement/feature dentro do painel (fica para incremento futuro).
- Painel do tenant para auto-gerenciar licença (chave/renovação) — admin já cobre via Mega.
- Heartbeat real da instalação no bootstrap do servidor (enforcement usa estado do banco).

## Testes planejados

`server/__tests__/licensing-enforcement.test.ts` (mock Supabase + TtlCache) — **23 testes verdes**:

1. flag `off` → passa direto (mesmo blocked/revoked) e audita.
2. `soft`: `blocked` → 403 `LICENSE_BLOCKED`; `revoked` → 403 `LICENSE_REVOKED`.
3. `soft`: `grace`/`expired` soft → 200 + `req.licenseState.degraded === true`
   (estado real preservado em `req.licenseState.state`).
4. `soft`: `expired` hard → 403 `LICENSE_BLOCKED_HARD`.
5. `soft`: `no_license` → 200 + audit `license.enforcement.no_license` em `audit_logs`.
6. superadmin sem org / control plane → bypass sem consultar licença.
7. impersonação → enforcement usa a org alvo.
8. erro de banco → fail-open (200) + `req.licenseState.code === 'ENFORCEMENT_ERROR'`.
9. cache: segunda chamada não consulta banco (contador de queries).
10. `hard`: `no_license` sem `legacy_tenant` → 403; com `legacy_tenant` → degradado
    (`degraded: true`).

## Gates de aceite

- `node --check` nos arquivos server alterados ✓.
- `npx vitest run server/__tests__/licensing-enforcement.test.ts` → 23/23 ✓.
- `npm run type-check` ✓, `npm run lint` ✓ (0 erros novos), suíte completa vitest sem
  novas falhas (220 passaram; `subscriptionGuard` flaky pré-existente sob carga passa isolado) ✓.
- `.env.example` documentado com `LICENSE_ENFORCEMENT`, `LICENSE_ENFORCEMENT_LEGACY_TENANTS`
  e `LICENSE_SIGNING_PRIVATE_KEY`/`LICENSE_SIGNING_PUBLIC_KEY` ✓.
- Sem commit/push/deploy sem aprovação do maestro.
