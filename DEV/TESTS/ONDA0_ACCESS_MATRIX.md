# Matriz de acesso e isolamento — Onda 0

**Data:** 2026-07-28  
**Escopo:** autenticação, perfis, painéis, tenant, impersonação e assinatura  
**Ambiente local:** `http://127.0.0.1:3006`

## Legenda

- **APROVADO:** executado com evidência e resultado esperado.
- **REPROVADO:** defeito reproduzido e ainda não encerrado.
- **BLOQUEADO:** depende de credencial, ambiente ou ação externa.
- **PENDENTE:** caso ainda não executado.
- **CORRIGIDO:** defeito corrigido e protegido por regressão automatizada.

## Casos

| ID | Identidade | Tenant/estado | Ação | Resultado esperado | Status | Evidência |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | anônimo | nenhum | abrir `/urban` | redirecionar para login | APROVADO | `tests/e2e/audit/auth-audit-contract.spec.ts` |
| AC-002 | anônimo | nenhum | abrir `/rural` | redirecionar para login | APROVADO | `tests/e2e/audit/auth-audit-contract.spec.ts` |
| AC-003 | anônimo | nenhum | abrir `/superadmin` | redirecionar para login | APROVADO | `tests/e2e/audit/auth-audit-contract.spec.ts` |
| AC-004 | anônimo | nenhum | abrir `/megaadmin` | redirecionar para login | APROVADO | `tests/e2e/audit/auth-audit-contract.spec.ts` |
| AC-005 | admin urbano | organização urbana ativa | entrar em `/urban` | carregar shell urbano | BLOQUEADO | faltam variáveis `IMOBZY_E2E_URBAN_ADMIN_*` |
| AC-006 | admin urbano | organização urbana ativa | abrir `/megaadmin` | negar e voltar ao painel permitido | BLOQUEADO | faltam credenciais de homologação |
| AC-007 | admin rural | organização rural ativa | entrar em `/rural` | carregar shell rural | BLOQUEADO | faltam variáveis `IMOBZY_E2E_RURAL_ADMIN_*` |
| AC-008 | admin rural | organização rural ativa | abrir `/superadmin` | negar e voltar ao painel permitido | BLOQUEADO | faltam credenciais de homologação |
| AC-009 | Super Admin revendedor | revenda ativa | entrar em `/superadmin` | carregar shell de Super Admin | BLOQUEADO | faltam variáveis `IMOBZY_E2E_SUPER_ADMIN_*` |
| AC-010 | Super Admin revendedor | revenda ativa | abrir `/megaadmin` | negar acesso | BLOQUEADO | faltam credenciais de homologação |
| AC-011 | Mega Admin | organização não revendedora | entrar em `/megaadmin` | carregar shell de Mega Admin | BLOQUEADO | faltam variáveis `IMOBZY_E2E_MEGA_ADMIN_*` |
| AC-012 | Mega Admin | organização não revendedora | abrir `/superadmin` | aplicar redirecionamento previsto | BLOQUEADO | faltam credenciais de homologação |
| AC-013 | admin demovido | token antigo diz `superadmin`; banco diz `admin` | acessar rota elevada | banco prevalece e acesso é negado | CORRIGIDO | `server/__tests__/authPrivilegeSource.test.ts` |
| AC-014 | perfil resolvido por e-mail | metadata diz `superadmin`; banco diz `admin` | resolver perfil | banco prevalece | CORRIGIDO | `server/__tests__/authPrivilegeSource.test.ts` |
| AC-015 | usuário sem perfil | `user_metadata.role=superadmin` | bootstrap de perfil | criar somente perfil sem privilégio | CORRIGIDO | `getSafeProfileBootstrapIdentity` |
| AC-016 | usuário sem organização | `user_metadata.organization_id` arbitrário | vincular tenant | ignorar metadata controlável pelo usuário | CORRIGIDO | `server/__tests__/authPrivilegeSource.test.ts` |
| AC-017 | usuário sem organização | header `x-organization-id` arbitrário | vincular tenant | ignorar header e não promover a admin | CORRIGIDO | `findExistingOrganizationForUser` não recebe mais o header |
| AC-018 | Super Admin | tenant alvo válido | enviar somente `x-impersonate-org-id` | negar sem sessão curta e auditada | CORRIGIDO | `server/middleware/auth.js` exige sessão e rejeita headers legados |
| AC-019 | Super Admin | tenant alvo válido | iniciar impersonação | exigir motivo, TTL e audit log | CORRIGIDO | `server/lib/impersonation-session.js` e testes de regressão |
| AC-020 | Super Admin | sessão de impersonação | encerrar sessão | revogar no servidor e limpar cliente | CORRIGIDO | `DELETE /api/admin/impersonations/current` e helper do cliente |
| AC-021 | tenant A | usuário do tenant A | ler/escrever dados do tenant B | negar em API e RLS | BLOQUEADO | exige duas organizações de homologação |
| AC-022 | revendedor A | filho A1 e tenant B1 | consultar organizações | permitir A1 e negar B1 | BLOQUEADO | exige banco de homologação e políticas efetivas |
| AC-023 | admin | assinatura ativa | abrir painel do nicho | permitir | BLOQUEADO | exige conta com plano ativo |
| AC-024 | admin | assinatura bloqueada | abrir painel do nicho | bloquear com estado explicativo | BLOQUEADO | exige conta com assinatura bloqueada |
| AC-025 | admin | trial válido | abrir painel | permitir até expiração | BLOQUEADO | exige massa de homologação |
| AC-026 | admin | trial expirado | abrir painel | bloquear sem promover plano no cliente | CORRIGIDO | `SubscriptionGuard` registra `payment_required`; testes frontend/backend |
| AC-027 | repositório | segredos versionados | varredura de configuração | nenhum literal sensível em arquivos rastreados | CORRIGIDO | compose, stack e script de bootstrap usam ambiente |
| AC-028 | credenciais antigas | segredos anteriormente expostos | autenticar após rotação | falhar | BLOQUEADO | requer rotação externa e invalidação de tokens |

## Gate atual

A Onda 0 ainda não pode ser considerada aprovada.

Bloqueios:

1. rotação externa dos segredos anteriormente versionados;
2. aplicação e validação da migration de impersonação no banco de homologação;
3. contas de homologação para os quatro perfis;
4. duas organizações por nicho para comprovar isolamento;
5. leitura das políticas RLS efetivas no banco de homologação.

## Comandos

```text
npm run test:e2e:public
npm run test:e2e:audit
npm run test -- authPrivilegeSource
```

O contrato autenticado falha intencionalmente quando as credenciais de auditoria não estão configuradas, evitando aprovação falsa.
