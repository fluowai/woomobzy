# Handoff

## 2026-11-17 (Atualização 3) — Liberação Integral de Funções e Menus em Todos os Níveis (Master, Revenda, Urbano e Rural) + Simulação 69/69 PASS

- **Menus e Rotas Completas Habilitadas (`App.tsx`, `UrbanLayout.tsx`, `RuralLayout.tsx`, `SuperAdminLayout.tsx`, `MegaAdminLayout.tsx`, `WooControlLayout.tsx`, `WorkspaceTopBar.tsx`):**
  - Todos os painéis agora contam com acesso direto ao **Criador de Páginas (Landing Pages)**, **Construtor de Site**, **Quiz Interativo**, **Central de IA & Agentes**, **DataRoom**, **Matchmaking 360°**, **Campanhas WhatsApp**, **Instagram Direct**, **Email Center**, **Locação/Contratos/Borderô**, **Geointeligência CAR/SIGEF/Valuation/Due Diligence**, **Fintech**, **Clube Imobzy** e **Portais do Proprietário/Comprador/Locatário**.
  - Barra superior (`WorkspaceTopBar`) equipada com atalhos de 1 clique para **Criador de Páginas**, **Meu Site**, **Central IA** e alternância livre entre **Urbano**, **Rural**, **Revenda**, **MegaAdmin** e **WooControl**.
- **Banco de Dados 100% Desbloqueado (`scripts/unlock-all-features-and-hierarchy.mjs`):**
  - Todas as organizações (`WooTech Master Imob`, `Revenda Prime SaaS`, `Imobiliária Horizonte Urbano`, `Fazendas Brasil Agro`) estão com todas as 28 `feature_flags` ativas, plano Enterprise ilimitado e hierarquia de revenda configurada (MRR e contagem de imobiliárias ativas na Revenda).
- **Simulação E2E Completa (`scripts/run-full-system-simulation.mjs`):** **69/69 testes aprovados (100%)**.

## 2026-11-17 — Execução do Plano de Prontidão para Produção & Hardening de Stack

- **Status da Operação e Ambiente:**
  - Supabase conectado e validado: `https://ahimxutcthctbwpaedvy.supabase.co` (186 tabelas públicas validadas).
  - MinIO conectado e validado: `https://storage.wootech.com.br` (bucket `imob.erp`).
  - Pre-flight check de produção (`node scripts/verify-production-readiness.mjs`): **20/20 PASS (0 WARN, 0 FAIL)**.
  - Quality gates: `tsc --noEmit` OK (0 erros), `check-deploy-config` OK, `vite build` OK (4.223 módulos, PWA gerado com sucesso).
  - Teste de rotas de navegação: `src/test/urbanMenuRoutes.test.ts` 100% aprovado.

- **Melhorias e Artefatos Aplicados:**
  - `portainer-stack.yml`: Políticas `restart: unless-stopped` e `logging` com rotação (50m, 3 arquivos) aplicadas em todos os 9 serviços; healthchecks adicionados para `frontend`, `api`, `whatsapp-service`, `document-worker` e `agro-intelligence`; limites de recursos definidos para proteção contra picos de CPU/memória.
  - `components/UrbanLayout.tsx`: Reconciliadas as rotas `/urban/fintech` e `/urban/clube` no menu de navegação.
  - `scripts/generate-production-secrets.mjs`: Utilitário para geração de chaves criptográficas seguras.
  - `scripts/verify-production-readiness.mjs`: Script automatizado de auditoria pré-deploy.
  - `scripts/setup-production-host.sh`: Automação de setup para a VPS Linux (rede `woopanel1`, volumes dinâmicos e persistentes).
  - `scripts/backup-database-and-storage.sh`: Automação de backup periódico do Postgres e storage.

## 2026-11-13 — Provisionamento Completo de Usuários Multi-Nível, Agentes IA e Validação 100%

- **Status da Operação e Ambiente:**
  - Supabase conectado e validado: `https://ahimxutcthctbwpaedvy.supabase.co`.
  - MinIO conectado e validado: `https://storage.wootech.com.br` (bucket `imob.erp`).
  - Suíte E2E automatizada (`scratch/run-e2e-suite.mjs`): **55/55 testes aprovados (100%)**.
  - Quality gates: `check-deploy-config` OK, `type-check` OK, `lint` OK (0 erros), `vitest` (31/31 arquivos, 152/152 testes) OK, `vite build` OK.

- **Organizações e Usuários Provisionados no Banco:**
  - **Organizações:**
    1. `WooTech Master Imob` (`slug: wootech-master`, ID: `4b10aa59-4e37-45dc-9c00-64630f9f1b7b`) — Master da Plataforma.
    2. `Revenda Prime SaaS` (`slug: revenda-prime`, ID: `12472ea9-2819-42d6-9f9a-2ce8a499af9e`) — Revenda / Franquia SaaS.
    3. `Imobiliária Horizonte Urbano` (`slug: horizonte-urbano`, ID: `e6062970-2226-4a7f-9ef8-df5946abecb6`) — Tenant Urbano.
    4. `Fazendas Brasil Agro` (`slug: fazendas-brasil`, ID: `a3d84cc8-2913-4a3f-be91-c9d92ced06db`) — Tenant Rural.
  - **Usuários (10 papéis cobrindo todos os níveis):**
    1. `opauloargolo@gmail.com` | Role: `superadmin` | Org: Master (Acesso irrestrito a WooControl, MegaAdmin, Urbano e Rural).
    2. `owner@wootech.com.br` | Role: `PLATFORM_OWNER` | Org: Master (Proprietário técnico / administrativo da plataforma).
    3. `megaadmin@wootech.com.br` | Role: `PLATFORM_ADMIN` | Org: Master (Administrador global MegaAdmin).
    4. `revenda@wootech.com.br` | Role: `superadmin` | Org: Revenda (Gestor de revenda multi-tenant).
    5. `admin.urbano@wootech.com.br` | Role: `admin` | Org: Imobiliária Urbana.
    6. `admin.rural@wootech.com.br` | Role: `admin` | Org: Imobiliária Rural.
    7. `gerente@wootech.com.br` | Role: `gerente` | Org: Imobiliária Urbana.
    8. `corretor@wootech.com.br` | Role: `broker` | Org: Imobiliária Urbana.
    9. `assistente@wootech.com.br` | Role: `assistente` | Org: Imobiliária Urbana.
    10. `cliente@wootech.com.br` | Role: `user` | Org: Imobiliária Urbana.

- **Módulos Testados e Funcionais:**
  - **WooControl & Licenciamento:** Métricas de rede, faturamento, listagem de clientes e licenças de software.
  - **MegaAdmin:** Administração global, auditoria de usuários, visualização de equipe e limites de assentos.
  - **Gestão de Imóveis (Urbano & Rural):** Cadastro completo, fotos, geolocalização e motor de valuation automatizado.
  - **CRM & Funil de Vendas:** Captação de leads, avanço de etapas no pipeline, automação de boas-vindas e cadastro de clientes.
  - **Módulo de Locação:** Contratos, templates dinâmicos, geração de PDF com assinatura digital, reajustes automáticos (IGP-M/IPCA), liquidação de despesas e renovação de contrato.
  - **MinIO Storage & DataRoom:** Upload de arquivos, presigned URLs, streaming seguro e gestão documental por imóvel.
  - **Agentes de IA:** Criação de agentes, versionamento de prompt, conversas multi-turn, execução autônoma de ferramentas (`properties.search` contra o Postgres), chat com memória e geração de páginas por IA.

- **Próximos Passos Recomendados para Produção:**
  - Configurar as variáveis do `.env` no Portainer/Docker stack para publicação.
  - Adicionar chave de IA de produção (`GEMINI_API_KEY` ou `OPENAI_API_KEY`) para substituir o provedor local em escala.
  - Cadastrar credenciais do serviço ONR em `saas_settings` caso deseje utilizar busca de certidões e matrículas de cartório via ONR.

## 2026-11-12 (Atualização 2) — Migração para Novo Supabase (`ahimxutcthctbwpaedvy`) + MinIO (`storage.wootech.com.br` / `imob.erp`)

- **Ambiente Local Atualizado (`.env` gitignored):**
  - Apontado para o novo projeto Supabase `https://ahimxutcthctbwpaedvy.supabase.co` e MinIO `https://storage.wootech.com.br` (bucket único `imob.erp`, `bucketMode: single`).
- **Correções no Código:**
  - `server/lib/supabase-server.js`: suporte silencioso a chaves `sb_secret_` no sanity check.
  - `server/lib/minio-storage.js` & `server/services/storageIntelligenceService.js`: resolução nativa de `MINIO_BUCKET` e `MINIO_BUCKET_MODE=single` via env/DB para organizar arquivos em `imobzyimg/`, `whatsapp-media/`, `documents/`, `exports/` dentro do bucket `imob.erp`.
  - `scripts/postgres-direct-migration.mjs`: conexão via `DATABASE_URL` / `SUPABASE_DB_URL` com SSL no pooler Supabase.
- **Banco e Storage Validados:**
  - Schema completo aplicado no Supabase `ahimxutcthctbwpaedvy` (`181` tabelas base, `5` views, `17` enums, `44` funções, `41` triggers, `298` políticas RLS, `9` buckets, seeds de planos/IA/avaliação + registro `storage_integrations` para o MinIO).
  - Roundtrip real validado tanto no Supabase Storage quanto no MinIO `https://storage.wootech.com.br` (bucket `imob.erp`) com upload, listagem, presigned GET HTTP `200` e remoção.
  - Todos os gates locais (`check-deploy-config`, `type-check`, `lint`, `vitest` 152/152, `vite build` e smoke test do servidor Express) aprovados.
- **Pendências apenas operacionais:** semear primeira organização/admin quando subir o primeiro tenant e espelhar as variáveis de ambiente no Portainer para produção.

## 2026-11-12 — Auditoria E2E, Correções Full-Stack e Prontidão para Produção

- **O que foi corrigido e validado:**
  - Autenticação (`callApi` com `Authorization: Bearer`) restaurada em `leaseService.ts`, `ValuationCard.tsx`, modais do editor de landing page (`AIGenerationModal.tsx`, `AICloneModal.tsx`), `ruralDataService.ts` e `DataRoom.tsx`.
  - Módulo DataRoom funcional (`App.tsx` rota `dataroom/:id`, `GET /api/documents`, `DocumentService.listByOrg` com `public_url` e UI completa).
  - Endpoints ausentes implementados (`POST /api/public/contact`, `POST /api/contact`, `POST /api/ai/clone-site` com proteção SSRF, `POST/GET /api/portals/:portal/{unpublish,status}/:propertyId`, `POST /api/crm/leads/:id/welcome`, rotas de renovação/pagamento de locação e `/api/admin/impersonations/exchange`).
  - Referências de tabelas corrigidas (`profiles`, `clients`, `lead_activities`, `urban_documents`, `documents`, `onr_requests`), remoção de placeholders/`alert()` em `PropertyEditor`, `SmartImporter` e `WooControl`.
  - Migração `migrations/20261112_missing_tables_and_buckets.sql` aplicada no Supabase (`yrabjwktnanjgjmdackf`), criando 4 tabelas faltantes, 2 RPCs e 7 buckets adicionais (9 buckets públicos no total).
  - `DEV/VERIFY.md` detalha os gates executados (TS, ESLint, 152 testes Vitest, build Vite, `node --check` e smoke tests Express + Postgres).
- **O que falta para operação completa em Produção (`portainer-stack.yml` / `.env.production.template`):**
  1. **Seed inicial no Supabase:** tabelas de negócio estão zeradas (`organizations: 0`, `profiles: 0`, `properties: 0`, `leads: 0`); criar/semear a primeira organização, perfil administrador e configurações iniciais.
  2. **Chave Service Role padrão:** `SUPABASE_SERVICE_ROLE_KEY` em `.env` local usa formato `sb_secret_...` (41 caracteres), gerando aviso de tamanho em `server/lib/supabase-server.js`; confirmar validade/rotação com JWT `service_role` e `ANON_KEY` no ambiente final.
  3. **Variáveis e microserviços externos:** configurar no Portainer os serviços satélites (`whatsapp-service`, `instagram-service`, `instagram-worker`, `document-worker`, `agro-intelligence`, `redis`, `rabbitmq`) e credenciais de provedores (`GEMINI_API_KEY`/`OPENAI_API_KEY`/`GROQ_API_KEY`, `ASAAS_API_KEY`, `WHATSAPP_*`, `INSTAGRAM_*`, `DOCUMENT_WEBHOOK_SECRET`, `MINIO_*` caso não use apenas o fallback do Supabase Storage, SMTP e portais/Orulo).

## 2026-11-11 — Novo Supabase (`yrabjwktnanjgjmdackf`) Aplicado + Stack Portainer Atualizada

- **Banco aplicado:** 182 tabelas criadas/migradas em `yrabjwktnanjgjmdackf.supabase.co` (incluindo `20261110_urban_expenses_and_renegotiations.sql`, `ai_workforce_builder`, `ai_sandbox_fixes`, `woo_control_schema`, `wootech_communications_foundation`), com `plans` (6 registros) e `saas_settings` (id=1) populados e recursão RLS em `profiles`/`organizations` corrigida.
- **Servidores locais ativos (`.env` gitignored):** Backend Express (`npm run server` porta `3002`) + Frontend Vite (`npm run dev` porta `3006`).
- **Deploy/Portainer:** `portainer-stack.yml` e `.env.production.template` atualizados com os 9 serviços (`frontend`, `api`, `whatsapp-service`, `rabbitmq`, `redis`, `instagram-service`, `instagram-worker`, `document-worker`, `agro-intelligence`) e todas as variáveis `${VAR}`.
- **Ações manuais restantes para ir ao ar:** configurar as mesmas variáveis no Portainer ao publicar a stack (além de MinIO, RabbitMQ, Asaas e Meta/WhatsApp conforme ambiente de produção).

## 2026-11-11 — Remediação Integral (Fases 0 a 3) Concluída Localmente (Sem Commit/Push)

- **Estado:** Código e configurações de deploy totalmente remediados nos níveis P0 (segurança, multi-tenant, segredos, CI), P1 (onboarding, checkout Asaas, IA/sandbox, workers Meta/Instagram, snapshots, WooControl AI) e P2 (substituição de ações "em breve" e cálculos mockados nos módulos Urbano, Rural, Locação, CRM, Email/WhatsApp, SuperAdmin/MegaAdmin/WooControl).
- **Verificação pós-edição final:** `check-deploy-config` OK, `type-check` OK, `lint` 0 erros, Vitest 31/31 arquivos (152/152 testes) OK, `vite build` OK (4.261 módulos), `go test ./...` OK (5 pacotes), `py_compile` OK, `node --check` OK. Detalhes em `DEV/VERIFY.md`.
- **Artefatos novos / atualizados para Deploy & DB:**
  - `migrations/20261110_urban_expenses_and_renegotiations.sql` e `server/__tests__/securityHardening.test.ts`.
  - `portainer-stack.yml` e `.env.production.template` atualizados com todos os 9 serviços (`frontend`, `api`, `whatsapp-service`, `rabbitmq`, `redis`, `instagram-service`, `instagram-worker`, `document-worker`, `agro-intelligence`) e todas as variáveis `${VAR}` (sem fallbacks literais de senha).
- **Não executado por ausência de credenciais locais:** sem `.env` local (`VITE_SUPABASE_*`, `DATABASE_URL`, `SUPABASE_DB_URL`), sem CLI `supabase`/`psql`/`docker` conectados; aplicação direta no banco remoto bloqueada até fornecimento da string de conexão ou execução via Supabase SQL Editor.
- **Checklist operacional para subir em produção:**
  1. Rotacionar segredos reais expostos no histórico anterior do repositório.
  2. Aplicar a migração `migrations/20261110_urban_expenses_and_renegotiations.sql` no Supabase.
  3. Atualizar stacks/variáveis no Portainer seguindo `.env.production.template` e `docker-compose.yml`.
  4. Executar build de imagens e rodar smoke/E2E em homologação antes de abrir tráfego final.

## 2026-09-06 — Atualizações pushadas e banco verificado

- Commit `d261289` pushado a `origin/main`: `server/lib/license-manager.js` (issueLicense) + uso em `onboarding.js`/`woo-control.js`, CRUD de revendas (Rede), página de Licensing, gitignore de scratch scripts.
- Gates: `npm run type-check` OK; `node --check` nos 3 JS OK; `npm run check-db` — 401 RLS em perfis/imóveis/leads é esperado (sem policy pública), schema Woo completo e compatível.
- Banco: Supabase remoto acessível via `DATABASE_URL`; `woo_licenses`/`woo_products` com colunas exatas do license-manager; policies `site_texts_public_select`, `site_texts_admin_all`, `organizations safe select` presentes.
- Próximo passo: validar em homologação o fluxo de emissão de licença (onboarding + Licensing), credenciais E2E dos seis perfis para homologação, e rotacionar chaves expostas anteriormente (pendência de 2026-07-28).

## 2026-09-06 — Auditoria integral em andamento

- Plano: `SPECS/REAL_DATA_EXECUTION_PLAN.md`; contrato: `SPECS/ACTIVE.md`.
- Inventário atualizado: 184 rotas, incluindo 16 do WooControl. Triagem de código: 121 sinais a revisar, não 121 defeitos comprovados.
- Corrigidos acesso global de revendas no WooControl, acesso durante suporte, navegação, consultas de indicadores e falso sucesso do diagnóstico de banco.
- Incluídos testes de autorização WooControl e navegação; suíte E2E agora inclui o dono da plataforma e elimina títulos duplicados por rota.
- Bloqueio externo: faltam URL e contas de homologação IMOBZY_E2E_* para os seis perfis. Leituras públicas do banco: uma HTTP 200 e seis HTTP 401. Não executar migrações com base nesse resultado.
- Permanecem mocks e funções incompletas, sobretudo IA, locação e integrações. Não declarar 100% funcional.
- Commit/push autorizado nesta solicitação; entrega em branch `codex/auditoria-dados-reais-20260906`. Sem deploy, cobrança, envio a clientes ou migração de produção.
- Resultados efetivos em `VERIFY.md`.

## 2026-09-07 — Hotfix local do resumo WooControl

- Causa do HTTP 500 em `/api/woo-control/summary`: o código selecionava `plans.price`, mas o schema atual expõe `plans.price_monthly`.
- A correção troca a coluna usada pela consulta e pelo cálculo de MRR; foi incluído teste de regressão.
- Para refletir em `imob-admin.wootech.com.br`, será necessário publicar o backend atualizado após o envio ao Git.


## 2026-08-28 — Working tree limpo e validado (sem commit)

- `constants/siteTemplates.ts` revertido: o diff era só reformatação + corrupção de acentos (45 chars mojibake); semântica idêntica ao HEAD (326 ids).
- Deletados 10 scripts não rastreados, incluindo `test-chat.cjs` (mintava JWT com `SUPABASE_JWT_SECRET`) e `scripts/alter.mjs` (duplicata de `migrations/20260826_signature_fields.sql`). Padrões scratch/test adicionados ao `.gitignore`.
- `views/SystemSettings.tsx`: imports não usados (`Users`, `UserManagement`) removidos; trailing whitespace limpo em `admin.js`/`SystemSettings.tsx`/`UserManagement.tsx`.
- Gates: type-check OK, lint 0 erros (744 warnings pré-existentes), build OK, `git diff --check` limpo.
- Migration `20260827_ai_sandbox_fixes.sql` revisada: contém `DROP FUNCTION IF EXISTS`; deps (`get_my_org_id`/`exec_sql`), `events` e colunas de leads/imóveis confirmadas. Falta APLICAR no banco.
- Próximo passo obrigatório: aplicar `20260827_ai_sandbox_fixes.sql` no Supabase; validar sandbox de IA (execution logs em `metadata`, toolRegistry/conversationStateManager) e a tela de usuários de admin usando a coluna `profiles.name`.
- Nenhum commit, push ou deploy foi executado.

## 2026-08-26 — Migrações SQL completas + código limpo

- 28 migrações SQL executadas com sucesso (incluindo 7 que estavam faltantes no run-migrations.mjs).
- Migrações críticas de RLS aplicadas: profiles RLS recursion fix + reseller tenant isolation fix.
- Tabelas novas funcionais: whatsapp_cloud_credentials, connection_pool, connection_allocations, connection_billing, social_accounts, social_posts.
- Colunas novas funcionais: signatures (selfie, doc, geoloc, whatsapp code), condominiums (7 campos), developments (svg_map), organizations (asgardpay keys).
- 6 erros TypeScript corrigidos (Simulator360 removido, asgardpayService import, SocialMediaCalendar paths, Development type).
- `npm run type-check` e `npm run build` passaram.
- Próximo passo: commit + push + deploy Docker/Portainer.

## 2026-08-23 — Agentes de IA com prompt editável e conexão de canais

- A aba de agentes da operação agora orienta a configuração profissional e leva diretamente para editar, conectar canal ou testar cada agente.
- `views/AIAgentDetail.tsx` passou a ter editor de prompt editável, checklist de conversa profissional, salvamento via `/api/ai/agents/:id/prompt` e aba `Canais`.
- A aba `Canais` permite criar regra para WhatsApp, Instagram ou Webchat, com bloqueio quando houver humano ativo.
- `server/api/ai/agents.routes.js` agora devolve versões do agente no `GET /agents/:id` e salva prompt em `ai_agent_versions`; quando não há versão ativa, cria uma versão inicial ou cai para `instructions` no schema legado.
- `services/aiWorkforce.ts` ganhou chamadas para atualizar agente e criar regra de canal.
- Verificação concluída: `node --check server/api/ai/agents.routes.js` e `git diff --check` passaram.
- Verificação inconclusiva: `npm run type-check`, `npx tsc --noEmit`, `npm run build` e ESLint focado ficaram sem saída por tempo prolongado e foram interrompidos; não houve erro exibido antes da interrupção.

## 2026-08-23 — Redirecionamento direto para painel por perfil

- A rota `/` não exibe mais a vitrine para quem já está autenticado e com perfil carregado; agora redireciona diretamente para o painel correto.
- Regra central: `src/lib/panelNavigation.ts`.
- Destinos:
  - Mega admin real: `/megaadmin`.
  - Revenda/Super Admin sem impersonação: `/superadmin`.
  - Conta rural ou impersonação rural: `/rural`.
  - Conta urbana/traditional: `/urban`.
  - Conta sem organização: `/onboarding`.
- Build de produção e ESLint direcionado passaram.
- Ainda precisa subir nova imagem Docker/Portainer para produção refletir o novo bundle.

## 2026-08-23 — Migração Lalbero CVCRM

- A migração de cadastro não está limitada a 50: existem 4.867 leads no Supabase para a organização Lalbero (`391d8df5-7297-42bd-a443-1aca77b1f0a1`).
- O problema visual/operacional é o status: todos estão em `Em Atendimento`, enquanto as colunas oficiais do Kanban usam outros IDs. O Kanban carrega 50 por etapa inicialmente e possui paginação por botão.
- Não há histórico importado: `lead_activities = 0` e `chat_messages = 0` para Lalbero.
- `scripts/migrateCvcrmLeads.js` foi refeito para dry-run por padrão, sem credenciais hardcoded, com modos `--audit`, `--reorganize`, `--leads` e `--interactions`.
- Dry-run de reorganização alvo: `Novo` 4.790, `Qualificação` 47, `Perdido` 28, `Fechado` 1, `Simulação` 1.
- Para aplicar a organização do Kanban: `node --env-file=.env scripts\migrateCvcrmLeads.js --reorganize --apply`.
- Para importar histórico, configurar `CVCRM_EMAIL` e `CVCRM_TOKEN` no ambiente e rodar primeiro dry-run: `node --env-file=.env scripts\migrateCvcrmLeads.js --interactions --limit=50`; depois aplicar com `--apply` se a amostra estiver correta.
- Nenhuma escrita em banco foi executada nesta investigação.

## 2026-08-23 — Hotfix de recursão RLS em profiles

- Após aplicar `20260823_fix_reseller_tenant_isolation.sql`, o login que consulta `public.profiles` começou a falhar com HTTP 500 / `42P17 infinite recursion detected in policy for relation "profiles"`.
- Causa: policy de SELECT em `profiles` chamava helpers que também leem `profiles`; isso recursiona na própria tabela.
- Criada migration `migrations/20260823_fix_profiles_rls_recursion.sql`: remove policies recursivas (`profiles_select_same_org_or_reseller_or_mega`, `profiles_update_same_reseller_team`, legadas) e recria apenas `profiles_select_own` e `profiles_update_self`, ambas sem subqueries.
- Decisão implementada: leitura/edição administrativa cross-user em `profiles` agora passa por backend service-role com escopo explícito, não por RLS direta no browser.
- Novas rotas: `GET/PATCH /api/admin/users` para usuários do tenant atual e `GET/PATCH /api/admin/team` para equipe Super Admin da própria organização.
- `views/admin/UserManagement.tsx` e `views/superadmin/TeamManager.tsx` deixaram de consultar `profiles` diretamente.
- Próximo passo imediato: aplicar a migration no Supabase, subir nova imagem Docker/Portainer e retestar o profile bootstrap do usuário `df587a67-d525-4e01-9ff6-c82ba596fb13` + isolamento da tela de usuários.

## 2026-08-23 — Correção crítica de isolamento Super Admin / Revenda

- Backend de `/api/admin/organizations` agora calcula escopo `mega`/`reseller`/`tenant` uma vez e reaplica em listagem, criação, edição, exclusão unitária, exclusão em lote, vínculo de perfil e modo suporte.
- Revenda só gerencia organizações filhas com `parent_id = req.realOrgId` e `is_reseller = false`; mega admin real segue com escopo global.
- Fallback de listagem via token e fallback direto via Postgres agora respeitam o mesmo escopo.
- Frontend: `views/admin/UserManagement.tsx` filtra usuários pelo tenant em modo suporte; `views/superadmin/TeamManager.tsx` limita revendas à própria equipe.
- Migration pronta: `migrations/20260823_fix_reseller_tenant_isolation.sql` redefine `public.is_superadmin()` como mega admin real, cria helpers de revenda e recria policies de `organizations`, `profiles` e `superadmin_bypass`.
- Verificação local passou: node check, Vitest direcionado 5/5, type-check, build, lint com código zero e `git diff --check`.
- Nenhum commit, push, deploy ou migration em banco foi executado.
- Próximo passo obrigatório: aplicar a migration em homologação e testar negativo/positivo com mega admin, duas revendas e imobiliárias/leads/usuários separados.

## 2026-08-20 — Fix de 500 ao excluir Cliente Direto (Mega Admin)

- `DELETE /api/mega/direct-clients/:id` agora desvincula dependências e usa fallback transacional (`server/lib/organization-deletion.js`) quando há FK sem cascade, retornando 200 em vez de 500.
- `PUT /direct-clients/:id` e `PUT /resellers/:id` agora devolvem 404 (PGRST116) em vez de 500 quando o registro não corresponde a um cliente/reseller.
- E-mail de boas-vindas de resellers/clientes diretos corrigido (`org.id` no lugar de variável indefinida).
- Cobertura: type-check e 3/3 testes do fallback passaram. Deploy pendente de validação em homologação com um cliente direto real.
- Nenhum commit, push ou deploy foi executado.

## 2026-07-28 — Execução da Onda 0

- Inventário atual: `DEV/TESTS/FUNCTIONAL_AUDIT_MATRIX.md`, gerado por `npm run audit:matrix`.
- Matriz de acesso: `DEV/TESTS/ONDA0_ACCESS_MATRIX.md`.
- A suíte pública e o bloqueio anônimo dos quatro painéis estão aprovados.
- Privilégio, bootstrap de tenant, assinatura e impersonação receberam correções e testes de regressão.
- A migration `migrations/20260728_harden_impersonation_sessions.sql` foi criada, mas não aplicada.
- Próxima ação obrigatória do responsável pelo ambiente: rotacionar todos os segredos previamente expostos e invalidar credenciais antigas.
- Para continuar a execução funcional: preencher as oito variáveis `IMOBZY_E2E_*` com contas exclusivas de homologação e preparar duas organizações por nicho.
- Sem essas dependências, Urbano, Rural, Super Admin, Mega Admin e isolamento RLS não podem ser declarados aprovados.
- Nenhum commit, push ou deploy foi executado.

## 2026-07-28 — Auditoria funcional e prevenção de regressões

- Plano criado em `DEV/SPECS/AUDITORIA_FUNCIONAL_REGRESSAO.md`.
- A execução deverá começar pela matriz mestra e pela fundação transversal, antes do painel Urbano.
- Ordem do plano: fundação, Urbano, Rural, Super Admin, Mega Admin, superfícies públicas e automação permanente.
- Dependência para começar: ambiente de homologação e contas de teste separadas por perfil e organização.
- Nenhuma correção de produto, commit, push ou deploy foi executado nesta atividade.

## 2026-07-28 — Recuperação do QR Code do WhatsMeow

- A instância de produção `22222` foi encontrada em `connecting`, sem QR Code persistido.
- O endpoint de QR agora reinicia clientes presos em `connecting`, mas mantém fluxos `qr_pending` ativos.
- A consulta do dashboard urbano deixou de solicitar a coluna inexistente `leads.broker_id`.
- A instância real foi redefinida condicionalmente de `connecting` para `disconnected`; a próxima abertura autenticada do modal inicia um novo pareamento.
- A correção está validada; para ativar a recuperação permanente, ainda é necessário implantar as imagens `frontend` e `whatsapp-service`.
## 2026-09-06 — Real-data P1/P2 validado localmente e pronto para push

- Branch: `codex/auditoria-dados-reais-20260906`.
- Escopo entregue: IA testa/publica somente com evidência persistida; Wizard e Dashboard de IA removem score/canais/logs/conhecimento demonstrativos; Asaas exige chave real e valida webhook; agenda da IA persiste em `lead_appointments`; Wootech Mail usa campanhas/destinatários persistidos; Sienge/CVCRM/BIA deixam de fabricar sucesso/IDs; scoring de lead atualiza banco; licenciamento não assina lease com chave efêmera; CMA gera PDF real.
- Migrations novas: `20260906_real_ai_calendar_tools.sql` e `20260906_real_wootech_mail_campaigns.sql`. Não aplicadas automaticamente em produção/homologação nesta rodada.
- Gates passados: `node --check` focado, ESLint focado, `npm run type-check`, Vitest completo 29/29 e 147/147, `npm run lint` com 0 erros, `npm run build`, `git diff --check`, `npm run audit:matrix`.
- Restrições restantes: sem ambiente/credenciais de homologação IMOBZY_E2E_*; sem execução real de cobrança/envio/webhook externo; ainda há ações “em breve” em locação, DataRoom, WhatsApp, rural/admin e módulos financeiros que precisam de implementação por fluxo.
## 2026-09-06 — Banco atualizado com migrations real-data

- Banco alvo do `.env` atualizado com `20260906_real_ai_calendar_tools.sql`, `20260830_wootech_communications_foundation.sql` e `20260906_real_wootech_mail_campaigns.sql`.
- Validação direta confirmou tabelas/policies/RPCs necessários para agenda real da IA e campanhas reais do Wootech Mail.
- Próximo teste operacional seguro: criar campanha de homologação com remetente/template/destinatário reais de teste, configurar credencial BillionMail do tenant, configurar `ASAAS_WEBHOOK_TOKEN`/`ASAAS_API_KEY` de sandbox e rodar fluxo com destinatários controlados.
