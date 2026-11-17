# Verificação

## 2026-11-13 — Validação E2E 100%, Usuários Multi-Nível, Agentes IA e Gates de Qualidade

- **Suíte E2E Completa (`scratch/run-e2e-suite.mjs`):**
  - **Resultado:** **55/55 testes APROVADOS (100% de sucesso, 0 falhas)**.
  - **Autenticação Real (10/10 papéis):**
    - `opauloargolo@gmail.com` (`superadmin` / Master) -> JWT emitido e perfil resolvido.
    - `owner@wootech.com.br` (`PLATFORM_OWNER` / Master) -> JWT emitido e perfil resolvido.
    - `megaadmin@wootech.com.br` (`PLATFORM_ADMIN` / MegaAdmin) -> JWT emitido e perfil resolvido.
    - `revenda@wootech.com.br` (`superadmin` / Revenda SaaS) -> JWT emitido e perfil resolvido.
    - `admin.urbano@wootech.com.br` (`admin` / Imobiliária Urbana) -> JWT emitido e perfil resolvido.
    - `admin.rural@wootech.com.br` (`admin` / Imobiliária Rural) -> JWT emitido e perfil resolvido.
    - `gerente@wootech.com.br` (`gerente` / Imobiliária Urbana) -> JWT emitido e perfil resolvido.
    - `corretor@wootech.com.br` (`broker` / Imobiliária Urbana) -> JWT emitido e perfil resolvido.
    - `assistente@wootech.com.br` (`assistente` / Imobiliária Urbana) -> JWT emitido e perfil resolvido.
    - `cliente@wootech.com.br` (`user` / Imobiliária Urbana) -> JWT emitido e perfil resolvido.
  - **WooControl & MegaAdmin:**
    - `GET /api/woo-control/summary` (Master & Platform Owner) -> 200 OK.
    - `GET /api/woo-control/network` -> 200 OK (todas as 4 organizações listadas).
    - `GET /api/woo-control/licenses` -> 200 OK.
    - `GET /api/admin/users` -> 200 OK (usuários da organização retornados).
    - `GET /api/admin/team` -> 200 OK (equipe e assentos disponíveis validados).
    - `GET /api/admin/storage/config` & `GET /api/admin/storage/summary` -> 200 OK (MinIO `imob.erp`).
  - **Cadastro de Imóveis & Valuation:**
    - `POST /api/properties` (Urbano - Jardins) -> 201 Created.
    - `GET /api/properties/:id` (Urbano) -> 200 OK.
    - `POST /api/properties` (Rural - Fazenda Santa Fé) -> 201 Created.
    - `GET /api/properties/:id` (Rural) -> 200 OK.
    - `GET /api/valuation/estimate/:id` -> 200 OK (Valuation com base de preço e regras ativas).
  - **CRM & Clientes:**
    - `POST /api/crm/leads` -> 201 Created (Lead "Carlos Eduardo Silva").
    - `GET /api/crm/leads/:id` -> 200 OK.
    - `PATCH /api/crm/leads/:id/status` -> 200 OK (Lead qualificado).
    - `POST /api/crm/leads/:id/welcome` -> 200 OK (Boas-vindas registradas em `lead_activities`).
    - `POST /api/clients` -> 201 Created (Cliente "Dra. Mariana Souza").
    - `GET /api/clients/:id` -> 200 OK.
  - **Locação, Contratos & Financeiro:**
    - `POST /api/locacao/contracts` -> 201 Created (Contrato de locação R$ 4.500,00).
    - `GET /api/locacao/contracts/:id` -> 200 OK.
    - `GET /api/locacao/contracts/templates/validate` -> 200 OK.
    - `POST /api/locacao/contracts/templates` -> 201 Created.
    - `POST /api/locacao/contract/generate-and-sign` -> 200 OK (PDF do contrato gerado e persistido).
    - `POST /api/locacao/adjustments/calculate` -> 200 OK (Cálculo de reajuste IGP-M/IPCA).
    - `POST /api/locacao/leases/:id/renovar` -> 200 OK (Renovação de contrato por 30 meses).
    - `POST /api/cobranca/despesas` -> 201 Created (Despesa taxa de condomínio).
    - `PUT /api/cobranca/despesas/:id/pagar` -> 200 OK (Liquidação financeira).
    - `PUT /api/locacao/leases/:id/pagamento` -> 200 OK (Registro de pagamento de aluguel).
    - `GET /api/cobranca/dashboard/financeiro` -> 200 OK (Métricas financeiras calculadas).
  - **MinIO Storage & DataRoom:**
    - Upload direto no bucket `imob.erp` via `uploadObject` -> OK.
    - Presigned URL gerada via `createPresignedGetUrl` -> OK (HTTP 200 no download).
    - `POST /api/documents/upload/:propertyId` -> 200 OK (Upload e vínculo a imóvel).
    - `GET /api/documents` -> 200 OK (Listagem no DataRoom com metadata).
    - `POST /api/documents/onr/request` -> 403 `ONR_NOT_CONFIGURED` esperado (sem credenciais ONR).
  - **Agentes de IA Interativos:**
    - `POST /api/ai/agents` -> 201 Created (Agente "Sofia - Especialista Imobiliária").
    - `GET /api/ai/agents/:id` -> 200 OK.
    - `PATCH /api/ai/agents/:id/prompt` -> 200 OK (Atualização e versionamento de prompt).
    - `POST /api/ai/agents/conversations/conv_e2e_.../message` (Turno 1 com execução de tool `properties.search` consultando o banco Postgres) -> 200 OK.
    - `POST /api/ai/agents/conversations/conv_e2e_.../message` (Turno 2 com follow-up e agendamento) -> 200 OK.
    - `POST /api/ai/agents/:id/chat` (Chat com histórico e memória) -> 200 OK.
    - `POST /api/ai/chat` (Chat geral) -> 200 OK.
    - `POST /api/ai/generate-page` (Geração de Landing Page com IA) -> 200 OK (2 blocos gerados).

- **Gates de Qualidade & Testes Automatizados:**
  - `npm run check-deploy-config`: **exit 0** (`[deploy-config] OK Supabase deploy configuration looks consistent.`).
  - `npm run type-check`: **exit 0** (`tsc --noEmit` sem erros).
  - `npm run lint`: **exit 0** (0 erros, 711 warnings pré-existentes).
  - `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: **exit 0 — 31/31 arquivos de teste aprovados, 152/152 testes unitários aprovados**.
  - `npm run build`: **exit 0** (`vite build`, 4.221 módulos transformados, PWA `dist/sw.js` gerado).

## 2026-11-12 (Atualização 2) — Validação Completa do Novo Supabase (`ahimxutcthctbwpaedvy`) e MinIO (`imob.erp`)

- **Schema & Dados do Supabase (`ahimxutcthctbwpaedvy`):**
  - Postgres direto: `181` tabelas base, `5` views, `17` enums, `44` funções de usuário, `41` triggers, `298` políticas RLS e `9` buckets em `storage.buckets`.
  - Seeds validados: `plans` (6), `saas_settings` (1), `ai_slot_definitions` (55), `ai_tools` (18), `valuation_rules` (24) e `storage_integrations` (`minio` -> `https://storage.wootech.com.br` / `imob.erp` / `single`).
  - REST `service_role` validado em 19 tabelas principais (`organizations`, `profiles`, `plans`, `saas_settings`, `properties`, `leads`, `landing_pages`, `site_settings`, `site_texts`, `ai_operations`, `ai_agents`, `ai_llm_usage`, `leases`, `urban_expenses`, `woo_licenses`, `social_posts`, `storage_integrations`, `onr_requests`, `email_drip_campaigns`); leitura `anon` em `plans` OK (`3` registros).
  - Supabase Storage roundtrip (`documents`): upload -> URL pública HTTP `200` (`sb-ok`) -> remoção sem erros.
- **MinIO (`https://storage.wootech.com.br` / bucket `imob.erp`):**
  - `getStorageConfig()` retornou `configured: true`, `singleBucket: 'imob.erp'`, `bucketMode: 'single'`, `folderMode: 'bucket-prefix'`.
  - `listMinioBuckets()` retornou os `7` buckets remotos (incluindo `imob.erp`).
  - Roundtrip completo (`uploadObject` -> `listMinioObjects` -> `createPresignedGetUrl` + `fetch` HTTP `200` -> `deleteMinioObjects`) validado nos `4` prefixos lógicos (`imobzyimg`, `whatsapp-media`, `documents`, `exports`) dentro de `imob.erp`.
  - `getStorageSummary()` retornou `{ configured: true, total_buckets: 7, total_objects: 0 }`.
- **Gates de Qualidade & Smoke Test Express:**
  - `npm run check-deploy-config`: **exit 0** (`[deploy-config] OK Supabase deploy configuration looks consistent.`).
  - `node --check` & `npx eslint` nos arquivos alterados (`supabase-server.js`, `minio-storage.js`, `storageIntelligenceService.js`, `postgres-direct-migration.mjs`): **exit 0** (0 erros).
  - `npm run type-check`: **exit 0**.
  - `npm run lint`: **exit 0** (0 erros, 711 warnings pré-existentes).
  - `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: **exit 0 — 31/31 arquivos, 152/152 testes aprovados**.
  - `npm run build`: **exit 0** (`4.221` módulos transformados, PWA `dist/sw.js` com `279` entradas precache).
  - Smoke test Express (porta `3009`): boot limpo sem aviso de `SERVICE_ROLE_KEY`; `GET /api/system-status` -> `200`, `GET /api/public/branding?domain=localhost` -> `200`, `POST /api/support/exchange` -> `400`, `POST /api/storage/upload` -> `401`, `GET /api/documents` -> `401`.

## 2026-11-12 — Análise Completa, Migração SQL e Verificação Pós-Correções

- `npm run check-deploy-config`: **exit 0** (`[deploy-config] OK Supabase deploy configuration looks consistent.`).
- `npm run type-check`: **exit 0** (`tsc --noEmit` sem erros).
- `npm run lint`: **exit 0** (0 erros, 711 warnings pré-existentes).
- `npx eslint` nos 20 arquivos TS/TSX alterados: **exit 0** (0 erros, 35 warnings pré-existentes).
- `node --check` nos 17 arquivos `.js` de `server/` alterados: **exit 0**.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: **exit 0 — 31/31 arquivos passaram, 152/152 testes passaram**.
- `npm run build`: **exit 0** (`vite build`, 4.221 módulos, PWA `dist/sw.js` com 279 entradas precache).
- **Migração Postgres aplicada (`DATABASE_URL`):** `migrations/20261112_missing_tables_and_buckets.sql` executada; validadas tabelas (`landing_page_analytics`, `landing_page_blocks`, `email_drip_campaigns`, `onr_requests`), RPCs (`increment_landing_page_views`, `increment_landing_page_leads`) e 9 buckets públicos no Supabase Storage (`agency-assets`, `contracts`, `documents`, `exports`, `imobzyimg`, `imobzymsg`, `media-posts`, `property-images`, `whatsapp-media`).
- **Smoke tests Express + Postgres (porta `3002`):**
  - `GET /api/system-status` -> `200` (`status: "online"`).
  - `GET /api/public/branding?domain=localhost` -> `200`.
  - `POST /api/support/exchange` -> `410` JSON.
  - `POST /api/contact` inválido -> `400`; válido com tabela `organizations` vazia -> `404` JSON esperado (`"Organização não encontrada para receber o contato."`).
  - 8 novas rotas protegidas testadas sem token -> todas responderam `401` (montadas com `verifyAuth, requireTenant`).
- **Estado atual do banco conectado (`yrabjwktnanjgjmdackf`):** schema e buckets prontos, porém sem dados semeados (`organizations: 0`, `profiles: 0`, `properties: 0`, `leads: 0`).

## 2026-11-11 — Novo Banco Supabase Aplicado + Ambiente Local (API + Frontend) Ativo

- **Banco de Dados (`yrabjwktnanjgjmdackf`):**
  - `.env` local (gitignored) configurado com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL` e `SUPABASE_DB_URL`.
  - Removidas referências hardcoded antigas de SSL/pooler em `server/lib/pg.js` e `scripts/postgres-direct-migration.mjs`.
  - Aplicado schema completo + migrações (`20260516` .. `20261110_urban_expenses_and_renegotiations.sql`, AI Workforce/Sandbox, WooControl, Comunicações, Financeiro Urbano): **182 tabelas no schema `public`**.
  - Corrigidas políticas RLS recursivas (`profiles` / `organizations`) herdadas de scripts legados para eliminar HTTP 500 em consultas `anon`.
  - Validado acesso `service_role` REST em 16 tabelas principais (`organizations`, `profiles`, `plans` [6 registros], `saas_settings` [1 registro], `properties`, `leads`, `landing_pages`, `site_settings`, `site_texts`, `ai_operations`, `ai_agents`, `ai_llm_usage`, `leases`, `urban_expenses`, `woo_licenses`, `social_posts`): todas **OK**.
  - `npm run check-deploy-config`: **exit 0 sem avisos de `.env` ausente**.
  - Corrigida inicialização preguiçosa (`getGroqClient()`) em `server/services/jarvisService.js` e rota Express 5 em `server/routes/wootechAi.js` (`/responses` regex), permitindo inicialização limpa de `npm run server` (`WooTech Imob server active on port 3002`) + `npm run dev` (`http://localhost:3006/`).

## 2026-11-11 — Remediação Níveis 0–3: gates locais aprovados; homologação externa pendente

- `npm run check-deploy-config`: exit 0 (stack files sem segredos hardcoded; avisos esperados para variáveis locais ausentes no `.env`).
- `npm run type-check`: exit 0 (`tsc --noEmit` sem erros).
- `npm run lint`: exit 0 (0 erros, 729 warnings pré-existentes/de estilo).
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: **31 arquivos passaram, 152 testes passaram, 0 falhas** (inclui 4 novos testes em `server/__tests__/securityHardening.test.ts` cobrindo `/recover-org`, IDOR em `social/index.js`, spoofing `req.body.org_id` em `tenant.js` e controle de acesso em `wooControlAi.js`).
- `npm run build`: exit 0 (`vite build`, 4.261 módulos transformados, PWA `dist/sw.js` com 280 entradas precache).
- `node --check`: exit 0 em todos os `.js` de `server/` e `instagram-service/src/`.
- `python -m py_compile`: exit 0 em `instagram-worker/app/worker.py`, `document_worker/app/main.py` e `server/agro-intelligence/main.py`.
- `go test ./...` em `whatsapp-service` (com caches em `D:\go-*`): exit 0 (`cmd/server`, `internal/config`, `internal/handlers`, `internal/whatsapp`, `pkg/phone` passaram).
- `npm run test:e2e:public`: falhou nos 24 cenários apenas porque o binário do Chromium Playwright (`chrome-headless-shell.exe`) não está instalado localmente e não foi baixado devido ao espaço livre limitado no disco `C:` (~0.5 GB) e ausência de `.env` / contas `IMOBZY_E2E_*`.
- **Pendências externas obrigatórias para Go-Live em produção:**
  1. Rotacionar nos provedores reais todas as chaves/senhas expostas anteriormente no histórico do Git (Supabase service role/JWT, MinIO, RabbitMQ, WhatsApp API/Postgres).
  2. Configurar todas as variáveis de ambiente no Portainer conforme `.env.production.template`.
  3. Aplicar `migrations/20261110_urban_expenses_and_renegotiations.sql` (e verificar `20260827_ai_sandbox_fixes.sql`) no Supabase de produção.
  4. Reconstruir e publicar os containers via `docker-images.yml` / Portainer e validar E2E autenticado com credenciais reais (`IMOBZY_E2E_*`, Asaas, Meta Graph e QR WhatsApp).

## 2026-09-06 — Auditoria integral: evidência local, homologação pendente

- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: 142 testes passaram em 28 arquivos. A primeira execução com concorrência padrão teve timeouts de workers; a repetição limitada passou sem esses erros.
- `npm run type-check`: passou, inclusive após alterações finais de navegação e cobertura.
- `npm run build`: passou após alterações finais, 4.092 módulos e PWA gerada. Aviso: base Browserslist desatualizada.
- `npm run lint`: exit 0, zero erros e 770 avisos. ESLint direcionado aos arquivos alterados com `--quiet`: exit 0.
- `node --check`: passou em woo-control.js, woo-control-access.js e check-db.mjs.
- Playwright: primeira rodada selecionada com 16 cenários teve 12 aprovações e 4 falhas de API porque o backend local estava desligado. Depois de iniciar `server/index.js` em NODE_ENV=development, os 4 cenários foram repetidos e passaram (desktop e mobile). As 12 aprovações anteriores incluem os cinco painéis anônimos em dois dispositivos e a rota inexistente. Não apresentar essas duas rodadas como uma regressão autenticada completa.
- Limite da suíte pública existente: ela intercepta `/api/public/texts` com uma fixture vazia. Portanto esses testes validam interface/roteamento, não o conteúdo real de textos no banco.
- HTTP real no backend local: `/api/woo-control/summary` e `/api/woo-control/network` sem token retornaram 401; `/api/public/branding?domain=127.0.0.1` retornou 200.
- `node --env-file=.env scripts/check-db.mjs`: exit 1 correto. Organizations respondeu 200; profiles, properties, leads, landing_pages, site_settings e site_texts responderam 401 usando a chave pública. Isso não prova ausência de tabelas nem valida operações autenticadas.
- Todas as variáveis de e-mail/senha IMOBZY_E2E_* dos seis perfis estão ausentes. URL/contas de homologação solicitadas ao usuário; não foram fornecidas nesta rodada.
- `git diff --check`: passou. `.env`, `.env.local`, `.env.production`, node_modules e dist confirmados como ignorados. Relatórios HTML/vídeos gerados ficam fora do commit.
- Backend local iniciou sincronização de cinco configurações de domínio no startup; nenhum diff rastreado de domínio foi produzido. Worker social de produção não foi iniciado. Não foram executados CRUD de negócio, cobrança, envio a clientes ou migração de produção.

**Conclusão:** correções locais verificadas, sem homologação integral. Permanecem mocks, ações incompletas e integrações sem evidência real; consultar SPECS/REAL_DATA_EXECUTION_PLAN.md. Não declarar sistema 100% funcional ou zero mocks.


## 2026-08-26 — Migrações SQL + Limpeza de Código

- 28 migrações executadas via `npm run run-migrations` + `exec_sql` RPC manual.
- Todas as tabelas verificadas acessíveis via Supabase client (whatsapp_cloud_credentials, connection_pool, connection_allocations, connection_billing, social_accounts, social_posts, signatures, condominiums, developments, organizations).
- `npm run type-check`: passou sem erros (6 erros corrigidos).
- `npm run build`: passou (4070 módulos, 1m31s, sem warnings críticos).
- `npm run lint`: sem saída (comportamento pré-existente).

## 2026-08-23 — Agentes de IA com prompt editável e conexão de canais

- `node --check server/api/ai/agents.routes.js`: passou.
- `git diff --check`: passou.
- `npm run type-check`: inconclusivo; processo ficou sem saída por tempo prolongado e foi interrompido.
- `npx tsc --noEmit --pretty false`: inconclusivo; processo ficou sem saída por tempo prolongado e foi interrompido.
- `npm run build`: inconclusivo; Vite iniciou `transforming...`, ficou sem saída por tempo prolongado e foi interrompido.
- `npx eslint --quiet views\AIAgentDetail.tsx views\AIOperationDashboard.tsx services\aiWorkforce.ts`: inconclusivo; processo ficou sem saída por tempo prolongado e foi interrompido.

## 2026-08-23 — Redirecionamento direto para painel por perfil

- Rota `/` alterada para redirecionar usuários autenticados via `HomeRoute`.
- Helper central criado em `src/lib/panelNavigation.ts` para resolver `/rural`, `/urban`, `/superadmin`, `/megaadmin` e `/onboarding`.
- `Login`, `NicheRedirect`, `SuperAdminGuard`, `MegaAdminGuard` e `PanelGuard` alinhados à mesma regra.
- `npm run build`: passou; bundle de produção gerado em `dist/`.
- `npx eslint App.tsx components\NicheRedirect.tsx components\PanelGuard.tsx components\SuperAdminGuard.tsx components\MegaAdminGuard.tsx views\Login.tsx src\lib\panelNavigation.ts`: passou sem erros.
- `git diff --check`: passou.
- `npm run type-check`: inconclusivo nesta rodada; processo ficou sem saída por tempo prolongado e foi interrompido.

## 2026-08-23 — Auditoria da migração Lalbero CVCRM

- Consulta service-role read-only: `leads` da organização `391d8df5-7297-42bd-a443-1aca77b1f0a1` retornou 4.867 registros.
- Contagem por status: `Em Atendimento` = 4.867; etapas oficiais do Kanban = 0.
- Contagem de histórico: `lead_activities` = 0 e `chat_messages` = 0 para a organização.
- Dry-run `node --env-file=.env scripts\migrateCvcrmLeads.js --audit`: passou e confirmou distribuição original por situação CVCRM.
- Dry-run `node --env-file=.env scripts\migrateCvcrmLeads.js --reorganize`: passou e calculou distribuição alvo (`Novo` 4.790, `Qualificação` 47, `Perdido` 28, `Fechado` 1, `Simulação` 1).
- `node --check scripts\migrateCvcrmLeads.js`: passou.
- Pendência: configurar `CVCRM_EMAIL` e `CVCRM_TOKEN` no ambiente para importar interações pelo endpoint oficial `/api/v1/cvdw/leads/interacoes`; nenhuma escrita em banco foi executada.

## 2026-08-23 — Hotfix de recursão RLS em profiles

- Sintoma em produção: `GET /rest/v1/profiles?...id=eq.df587a67...` retornou 500 com `42P17 infinite recursion detected in policy for relation "profiles"`.
- Causa confirmada por inspeção: policy `profiles_select_same_org_or_reseller_or_mega` chamava helpers que consultam `public.profiles`, criando recursão na própria tabela.
- Criada migration `migrations/20260823_fix_profiles_rls_recursion.sql` para remover policies recursivas de `profiles` e recriar `profiles_select_own`/`profiles_update_self` sem subqueries.
- `UserManagement` e `TeamManager` deixaram de consultar `profiles` diretamente no browser; agora usam `/api/admin/users` e `/api/admin/team`, ambos escopados no backend.
- `node --check server/routes/admin.js`: passou.
- `npm run type-check`: passou.
- `npx vitest run --pool=threads --maxWorkers=1 server/__tests__/adminOrganizationsFallback.test.ts`: 5/5 passaram. Sem `--maxWorkers=1`, o worker do Vitest voltou a expirar antes dos testes.
- `npm run build`: passou.
- `git diff --check`: passou.
- Pendência operacional: aplicar `migrations/20260823_fix_profiles_rls_recursion.sql`, subir nova imagem Docker/Portainer e retestar login + tela de usuários com mega admin, revenda A e revenda B.

## 2026-08-23 — Correção crítica de isolamento Super Admin / Revenda

- `node --check server/routes/admin.js`: passou.
- `npx vitest run --pool=threads server/__tests__/adminOrganizationsFallback.test.ts`: 5/5 passaram.
- `npm run type-check`: passou sem erros.
- `npm run build`: passou.
- `npm run lint`: código zero, 0 erros e 716 warnings preexistentes/de dívida técnica.
- `git diff --check`: passou.
- Pendência operacional: aplicar e validar `migrations/20260823_fix_reseller_tenant_isolation.sql` em homologação/produção com contas reais de mega admin, revenda A, revenda B e imobiliárias filhas.

## 2026-08-20 — Fix de 500 no DELETE de Cliente Direto (Mega Admin)

- `node --check` OK em `server/lib/organization-deletion.js`, `server/routes/mega-admin.js` e `server/routes/admin.js`.
- `npx vitest run --pool=threads server/__tests__/adminOrganizationsFallback.test.ts`: 3/3 passaram. Obs.: o pool padrão (forks) falha neste ambiente por timeout do worker (pré-existente, não relacionado à mudança).
- `npm run type-check`: sem erros.
- `npx eslint server/__tests__/adminOrganizationsFallback.test.ts`: sem erros.
- Validação funcional (DELETE de cliente real) depende de rodar em homologação; nenhum commit/push/deploy foi executado.

## 2026-07-28 — Auditoria funcional, execução da Onda 0

- `npm run audit:matrix`: 143 rotas; 49 Urbanas, 48 Rurais, 13 Super Admin, 13 Mega Admin e 20 públicas/compartilhadas.
- Playwright público: 10/10 passaram em Chromium desktop e mobile.
- Playwright anônimo dos painéis: 8/8 passaram.
- Testes direcionados de autenticação, impersonação e assinatura: passaram.
- `npx vitest run`: 25 arquivos e 123 testes passaram no estado final desta execução.
- `npm run type-check`: passou após as correções da revisão independente.
- `npm run build`: passou.
- `npm run lint`: código zero, 0 erros e 598 avisos preexistentes/de dívida técnica.
- `go test ./...`: passou em cópia temporária sem acentos no caminho; a execução direta falha por limitação da toolchain no caminho `Área de Trabalho`.
- Revisão independente: cinco achados corrigidos; reteste aprovou o recorte.
- A auditoria autenticada completa permanece bloqueada pela ausência das oito variáveis de credenciais E2E.
- `npm run test:e2e:audit`: 8 casos anônimos passaram, 25 casos autenticados foram ignorados e o contrato falhou intencionalmente ao listar as oito credenciais ausentes.
- A rotação de segredos e a validação da migration/RLS não foram executadas.

## 2026-08-28 — Gates de verificação após limpeza do working tree

- `npm run type-check`: passou (exit 0).
- `npm run lint`: 0 erros, 744 avisos preexistentes; `views/SystemSettings.tsx` sem avisos.
- `npm run build`: passou (3m26s, 263 precache entries, exit 0).
- `git diff --check`: passou (exit 0) após remoção de trailing whitespace em `server/routes/admin.js`, `views/SystemSettings.tsx`, `views/admin/UserManagement.tsx`.
- Revisão de `migrations/20260827_ai_sandbox_fixes.sql`: `DROP FUNCTION IF EXISTS` presente; deps `get_my_org_id()` e RPC `exec_sql` confirmadas; colunas de `events` (createEventsTable.js), `leads.next_visit_at` (20260608_ai_agent_orchestration.sql), `leads.classification` e `properties.city`/`neighborhood` confirmadas.
- `constants/siteTemplates.ts`: conteúdo semântico identico ao HEAD (326 ids; diff era formatação + mojibake de acentos) — revertido; nenhuma perda funcional esperada.
- Restrições não executadas: aplicar a migração `20260827_ai_sandbox_fixes.sql` no banco e validar o fluxo de usuários usando coluna `profiles.name`.

## 2026-07-28 — Linha de base para auditoria funcional

- `npm run type-check`: passou.
- `npm run build`: passou.
- `npm run test -- --run`: 18 arquivos e 90 testes aprovados.
- `npm run lint`: terminou com código zero e muitos avisos.
- `npx playwright test --list`: 5 cenários lógicos em 2 arquivos, executados nos projetos Chromium desktop e mobile, totalizando 10 execuções.
- Inspeção de `App.tsx`: 48 tags de rota no bloco Rural, 47 no Urbano, 13 no Mega Admin e 12 no Super Admin.
- O planejamento não comprova o funcionamento dos módulos autenticados; essa verificação pertence às ondas definidas em `DEV/SPECS/AUDITORIA_FUNCIONAL_REGRESSAO.md`.

## 2026-07-28 — WhatsMeow QR Code e consulta de leads

- `go test ./...`: passou na toolchain Go 1.25.0, em workspace temporário sem acentos no caminho.
- `go build ./cmd/server`: passou.
- Teste de regressão `TestShouldStartQRConnection`: passou.
- `npm run build`: passou; 4.042 módulos transformados.
- ESLint nos arquivos relacionados: 0 erros; 6 avisos preexistentes.
- `git diff --check`: passou.
- `npm run type-check`: inconclusivo; o processo `tsc` foi encerrado pelo Windows sem emitir diagnóstico TypeScript. O build Vite de produção passou.
- Produção antes do deploy: health do Node/WhatsMeow em HTTP 200; instância `22222` presa em `connecting`, com QR vazio.
- Recuperação imediata aplicada em produção: atualização condicional da instância `22222` para `disconnected`; permaneceu aguardando uma requisição autenticada do modal durante a janela de observação.
## 2026-09-06 — Real-data P1/P2 após execução autônoma

- `node --check` nos arquivos backend alterados: passou para `eventBus`, `leadScoringEngine`, `licensing`, `campaignDispatcher`, `siengeService`, `cvcrmBiaService`, `agentOrchestrator`, `aiOperations`, além dos arquivos de IA/Asaas verificados antes.
- `npx eslint ... --quiet` focado nos arquivos alterados: passou sem erros.
- `npm run type-check`: passou após as telas e serviços novos.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: 29 arquivos e 147 testes passaram. Teste legado do Architect foi atualizado porque o contrato correto agora é falhar sem provedor real, não gerar arquitetura fallback.
- `npm run lint`: exit 0, zero erros e 739 warnings legados/de dívida técnica.
- `npm run build`: passou, 4.273 módulos transformados e PWA gerada. Aviso não bloqueante: base Browserslist/caniuse-lite desatualizada.
- `git diff --check`: passou; apenas avisos CRLF esperados no Windows.
- `npm run audit:matrix`: passou, matriz regenerada com 184 rotas: WooControl 16, público/compartilhado 23, Urbano 59, Rural 57, Super Admin 14, Mega Admin 15.

Não executado: migrações novas em banco remoto, webhooks/cobranças reais contra Asaas, envio real de e-mail/WhatsApp, chamadas reais Sienge/CVCRM/BIA, Playwright autenticado ponta a ponta. Esses testes exigem ambiente de homologação, credenciais e autorização operacional para não afetar clientes ou produção.
## 2026-09-06 — Verificação das migrations aplicadas

- `node scripts\apply-migration-file.mjs migrations\20260906_real_ai_calendar_tools.sql`: passou via Postgres direto.
- `node scripts\apply-migration-file.mjs migrations\20260830_wootech_communications_foundation.sql`: passou via Postgres direto após dependência ausente de `mail_senders`.
- `node scripts\apply-migration-file.mjs migrations\20260906_real_wootech_mail_campaigns.sql`: passou via Postgres direto após a dependência.
- Script ad hoc local `scratch\verify-real-data-migrations.mjs`: confirmou existência das 8 tabelas Wootech Mail/communications, policies RLS e funções `public.get_available_slots` e `public.schedule_visit`.
- `npm run check-db`: exit 1 esperado por RLS pública em tabelas protegidas; `organizations` respondeu OK.

Ainda não executado: cobrança real Asaas, envio real Wootech Mail, chamada real Sienge/CVCRM/BIA e Playwright autenticado ponta a ponta. As migrations necessárias para os recursos implementados nesta branch estão aplicadas no banco configurado no `.env`.

## 2026-09-07 — Resumo WooControl

- Diagnóstico de schema somente leitura: `plans.price_monthly` está presente e `plans.price` não existe no banco alvo; isso explica o 500 devolvido pelo PostgREST para `GET /api/woo-control/summary`.
- Correção local: `server/routes/woo-control.js` consulta `price_monthly` e calcula o MRR com esse campo.
- Testes direcionados, `node --check`, `npm run type-check`, lint focado e `git diff --check` passaram. O build completo não concluiu nesta sessão; o último build registrado no projeto havia passado.
- Ainda é necessário publicar a nova imagem/backend para a produção consumir a correção.
