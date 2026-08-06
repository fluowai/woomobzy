# Relatório — Revenda Delazari: escopo de "clientes de revenda" e impersonação

Data: 2026-08-03
Escopo: análise estática (código + banco) do bug relatado na revenda Delazari. Nenhuma correção aplicada.

## 1. Contexto (identidade dos envolvidos)

| Papel           | Registro                               | Detalhe                                                                                              |
| --------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Revenda         | `e2403fc5-fabd-4715-a6e6-eae5d0603106` | Delazari Imóveis, `is_reseller=true`, niche `traditional`, slug `"Delazari Imóveis "` (espaço final) |
| Filho (cliente) | `52757ffb-...`                         | Mega Investimentos (traditional → painel urbano)                                                     |
| Filho (cliente) | `836c2313-...`                         | Pamas Imóveis (rural → painel rural)                                                                 |
| Filho (cliente) | `b007f557-...`                         | Vapt Imóveis                                                                                         |
| Ator do teste   | `suporte@alexandredelazari.com.br`     | `role=superadmin` na org Delazari                                                                    |

Prova no banco: o POST de impersonação **funciona**. Existem sessões ativas no `impersonation_sessions` criadas pelo ator `e3d30425` → tenant Mega `52757ffb` (active, 15 min, hoje 12:16Z), e ontem `df587a67` (fluowai) → `8f9bf0f1`. Ou seja, o elo quebrado não está na criação da sessão no backend.

## 2. Sintoma 1 — "ao clicar em clientes de revenda, as demais entradas somem do painel"

**Causa raiz:** filtro de escopo de revenda em `GET /api/admin/organizations` — `server/routes/admin.js:650-698`.

- `TenantManager` (tela "Gerenciar Imobiliárias", `views/superadmin/TenantManager.tsx:88`) carrega a lista via esse endpoint.
- O handler aplica o escopo: se a organização ativa for revenda (`is_reseller=true`), a query filtra `parent_id = <org>` (`admin.js:663-693`). No caso do Delazari, a lista vira **somente os filhos** (Mega, Pamas, Vapt); todas as outras imobiliárias da plataforma somem.
- O mesmo efeito ocorre no Dashboard do super admin, que consulta `organizations` direto via Supabase (`views/superadmin/Dashboard.tsx:51-75`) e é restringido pela RLS "Reseller view/update sub-organizations" (schema: `FULL_DATABASE_SCHEMA_FIXED.sql:5590-5682`).

**Origem da mudança:** lógica de "escopo de visualização para revendas em modo suporte" (commits `0901af6`/`25a5a69` de 30/07), evoluída para as fontes `req.orgId` (impersonando) / `req.realOrgId` (sem impersonação) — `server/middleware/auth.js:93,150,197,202`.

**Avaliação:** é o comportamento esperado pela regra de isolamento de revenda, mas percebido pelo usuário como regressão ("as entradas somem"). Se o produto desejar que a revenda veja também clientes diretos (`parent_id IS NULL`) ou a lista completa, o filtro (e a RLS correspondente) precisa ser revisto.

## 3. Sintoma 2 — "ao clicar em um cliente, não redireciona ao painel do cliente"

**Cadeia completa (código atual):**

1. Botão "Acessar Como" em `TenantManager.tsx:501-519` (e 610-628) → `impersonateOrganization(tenant.id, reason)`.
2. `AuthContext.tsx:362-383`: valida role, `setUpImpersonationSession` → `POST /api/admin/impersonations` (`AuthContext.tsx:499-530`).
3. `persistImpersonationSession` grava em `sessionStorage['imobzy_impersonation_session']` (`src/lib/impersonation.ts:68-82`).
4. `loadProfile` (`AuthContext.tsx:199-232`) lê a sessão, busca a org impersonada e aplica `profile.organization` + `isImpersonating=true`.
5. `window.location.href='/admin'` → reload → `/admin` → `ProtectedRoute + NicheRedirect` → `getPanelHomePath` (`components/NicheRedirect.tsx:45-62`): superadmin impersonando cliente não-revenda → `/rural` ou `/urban`.
6. Backend: `verifyAuth` valida a sessão e define `req.orgId` = org impersonada (`server/middleware/auth.js:116-153`); o envelope retornado (`{id, secret, expiresAt, organizationId}`) casa com o esperado pelo cliente (`server/lib/impersonation-session.js:95-100`).

**Conclusão:** com o código atual (incluindo o fix `214595a` de 08-01, que trata `is_reseller` no `NicheRedirect`), a cadeia de redirect para um cliente não-revenda **está correta** — Mega → `/urban`, Pamas → `/rural`. A falha relatada, portanto, deve vir de uma destas causas (exige repro no navegador para confirmar):

1. **Versão deployada anterior ao commit `214595a`** (fix do `NicheRedirect`). O CI publica no push; se produção não recebeu o fix, o comportamento antigo persiste.
2. **Perda da sessão de impersonação no reload.** `getStoredImpersonationSession()` (`src/lib/impersonation.ts:84-117`) limpa a sessão se expirada/inválida. Se o `sessionStorage` não sobreviver (nova aba, hard reload) ou houver desvio de clock > 15 min, o `isImpersonating` fica `false` e o redirect cai no painel do próprio usuário (`/superadmin` para revenda) em vez do painel do cliente.
3. **Desalinhamento de versão frontend × backend.** Se o servidor deployado retornar envelope sem `organizationId`, `persistImpersonationSession` lança "Sessão de impersonação inválida" (`impersonation.ts:73-77`) e o `TenantManager` mostra `alert` antes de qualquer redirect (`TenantManager.tsx:511-514`) — percebido como "não redireciona".
4. **Legado rejeitado.** Headers `x-organization-id`/`x-impersonate-org-id` agora retornam `403 IMPERSONATION_SESSION_REQUIRED` (`server/middleware/auth.js:154-162`). Nenhum cliente atual envia esses headers (verificado em `src/lib/api.ts:83-90`), mas um bundle antigo que ainda envie quebraria o fluxo.

## 4. Recomendações / próximos passos

1. ~~Confirmar que a versão deployada inclui `214595a`~~ → **RESOLVIDO: o fix está em produção no frontend** (ver seção 5). Resta confirmar a versão do backend, que não tem endpoint de versão (probe: `/api/info`, `/api/health`, `/api/version`, `/api/system/info` → todos 404).
2. Reproduzir com logs: o `logger` já registra o target do `NicheRedirect` (`NicheRedirect.tsx:85-87`) e o `loadProfile` (`AuthContext.tsx:147-256`). Verificar após o reload: `sessionStorage['imobzy_impersonation_session']` presente, `isImpersonating=true`, target `rural`/`urban`. **Incluir teste com aba anônima/Ctrl+F5** para descartar cache do navegador (PWA/service worker servindo bundle antigo).
3. Decidir o escopo desejado da lista de revenda (filhos + diretos, ou apenas filhos) e ajustar o filtro de `admin.js:663-693` e a RLS em conformidade.
4. Observação de dados: slug/nome da Delazari tem espaço à direita — potencial fonte de inconsistência em rotas/domínios; normalizar.
5. Sem commit/push: working tree tem WIP de outras sessões (domains, locacao, instagram-worker).

## 5. Verificação de produção (2026-08-03 — bundle + GitHub Actions + probes)

**O fix está em produção (frontend).** O bundle servido (`/assets/index-D0eZEUaE.js`, 336.621 bytes) contém `getPanelHomePath` já com a lógica de `is_reseller` (impersonando revenda → `/superadmin`; cliente não-revenda → `/rural`/`/urban`) e o fluxo de sessões curtas (`imobzy_impersonation_session`, `x-impersonation-session-id`, "Erro ao iniciar o modo suporte"). A hipótese 1 da seção 3 (produção sem o fix) fica **descartada** para o frontend servido pelo servidor.

**Mas o `main` não tem o fix — produção roda build da PR #66 (aberta).**

- `214595a` ("fix: impersonacao de revenda direciona para /superadmin em vez de /urban", 08-01 17:29:41Z, `Imobzy Dev`) **não é ancestral do `origin/main`**: `compare 214595a...e7d546b` → `diverged, behind_by=68`. No main, o `NicheRedirect.tsx` do commit `c1741da` (28/07) ainda não tem `is_reseller` (match só de `/superadmin`).
- `214595a` existe **somente** na branch `codex/main-whatsapp-media-hotfix` → **PR #66 aberta**. O head do último build de imagens (`c3e927cae3`, 08-03 12:45Z, run 30814913784) é dessa branch e **contém** o fix: `compare 214595a...c3e927cae3` → `ahead, behind_by=0`; `c3e927cae3` está na branch local (`git branch --contains`).
- **Deploy automático**: o workflow `docker-images.yml` dispara em push para `main` **e** para `codex/main-whatsapp-media-hotfix`; `deploy-portainer` só roda em `refs/heads/main`. O último run em `main` que acionou o Portainer foi 30/07 16:43-16:45Z (head `e7d546b`, merge da PR #65) — `deploy-portainer` executou **com sucesso** (webhook `PORTAINER_WEBHOOK_URL` configurado). Esse deploy **não contém** o fix (anterior a 08-01). Único run `workflow_dispatch` já feito: 28/07 (`badde6c1`).
- Como produção serviu o bundle com o fix (que só existe na branch desde 08-01 17:28:39Z, run 30710409757 head `29f55429`), o fix chegou à produção por **redeploy manual da stack no Portainer** feito pelo maestro entre 01/08 e 03/08 — não pelo CI.
- **Corroboração por uptime**: `GET /api/system-status` → `uptime: 57346s` (timestamp 13:21:08Z) → processo da API iniciado ~**08-02 21:25:22Z**, logo após builds da branch às 21:11Z (`57abb8e6`) e 21:21Z (`34abbaa9`) — padrão de redeploy manual logo após push da branch. `/env-config.js` confirma os mesmos build-args do workflow (`VITE_API_URL=same-origin`, `VITE_SUPABASE_URL=runtime` resolvida para `epgaftsjmqmpczvzsrcc`, etc.).

**Implicações**

1. **Risco operacional (alto)**: o próximo push no `main` refaz o build a partir do main (sem `is_reseller`) e o `deploy-portainer` automático **reverteria** o fix em produção. Tornar o fix oficial e durável = mergear a PR #66 no `main`.
2. **Diagnóstico do sintoma 2**: com o fix no ar, a persistência do sintoma não é por código desatualizado no servidor. Causas restantes (exigem repro no navegador): **cache do navegador do usuário** (PWA/service worker/`index.html` em cache servindo bundle antigo — provável, dado que o usuário re-clica no mesmo ator), perda da sessão no reload (`sessionStorage` + TTL 15 min), desvio de relógio > 15 min, ou aba antiga.
3. **Backend**: versão sem fingerprint direto; o alias `woomobzy-api:5daaa4a05b3d...` (tag fixa que o Portainer referencia) é republicado em todo build (inclusive da branch), então um redeploy manual da stack em 02/08 também subiria o api para o build da branch (cadeia de impersonação correta).

## 6. Hardening do escopo de revenda (2026-08-03 — implementado em `server/routes/admin.js`)

**Decisão de produto confirmada:** a revenda deve ver **apenas os filhos** (`parent_id = org`). O relato "as demais entradas somem" é o comportamento correto de isolamento, e a RLS em produção já o impõe:

`pg_policies` de `organizations` (produção, PERMISSIVE/OR):

- `Organizations isolation` (SELECT): `id = get_my_org_id()`
- `Public read organizations` (SELECT, anon): `status = 'active'`
- `Reseller insert sub-organizations` (INSERT): `with_check: parent_id = get_auth_organization_id()`
- `Reseller update sub-organizations` (UPDATE): `parent_id = get_auth_organization_id()`
- `Reseller view sub-organizations` (SELECT): `parent_id = get_auth_organization_id()`
- `Superadmins can view all organizations` (ALL): profile role `superadmin`/`MEGA_ADMIN`
- `Users can view own organization` (SELECT): `id = get_auth_organization_id()`

União para um reseller = própria org + filhos; **clientes diretos (`parent_id IS NULL`) ficam fora**. Em produção: 2 resellers, 9 orgs não-reseller, 6 clientes diretos (`parent_id IS NULL`). Filhos do Delazari = exatamente Mega, Pamas e Vapt.

**Problema encontrado:** o backend usa **service role** (`server/lib/supabase-server.js`, bypassa RLS) → o isolamento precisa ser forçado no código, mas só existia no filtro do GET principal. Fallbacks e mutações estavam abertos para revenda acessar orgs fora do grupo.

**Correção aplicada** (`server/routes/admin.js`, nenhum commit/push):

- Novos helpers centralizados: `resolveAdminOrgScope(req)` (escopo efetivo: revenda → `parent_id`; impersonando tenant comum → `id`; mega admin → global), `isOrgWithinScope(req, orgId)` e `areOrgsWithinScope(req, ids)`.
- `GET /organizations`: refatorado para usar o helper (comportamento idêntico) e o fallback direct-DB (`queryOrganizationsWithDirectDb`) ganhou parâmetro `parentId` — em estado degradado, uma revenda deixa de enxergar todas as orgs.
- `POST /organizations`: `parent_id` agora vem do escopo (antes só de `req.realOrgId`) — cobre também impersonação de uma revenda (nova org fica sob a revenda, não vira cliente direto).
- `PUT /organizations/:id`, `DELETE /organizations/:id` e `POST /organizations/bulk-delete`: **403** se a org alvo estiver fora do escopo da revenda (antes qualquer org era editável/excluível).

**Nota RLS:** `queryOrganizationsWithUserToken` (fallback) usa o JWT do usuário → RLS já restringe revenda a filhos. Sob impersonação, o JWT é do superadmin → policy "Superadmins can view all" prevalece no fallback (estado degradado, não mitigado).
