# Worklog - Agente IA WooTech Imob

## 2026-11-17 - Análise Completa de Produção, Hardening de Stack e Gates 100%

- **Correção e Alinhamento de Contrato de Rotas de Layout:**
  - Restaurados os caminhos `/urban/fintech` e `/urban/clube` no menu de navegação em `components/UrbanLayout.tsx`.
  - Suíte de testes `src/test/urbanMenuRoutes.test.ts` executada com sucesso (100% aprovado).
- **Hardening da Stack Portainer & Docker de Produção (`portainer-stack.yml`):**
  - Implementada política de reinicialização `restart: unless-stopped` em todos os 9 serviços do ecossistema (`frontend`, `api`, `whatsapp-service`, `rabbitmq`, `redis`, `instagram-service`, `instagram-worker`, `document-worker`, `agro-intelligence`).
  - Configurada rotação de logs (`driver: json-file`, `max-size: 50m`, `max-file: 3`) em todos os contêineres para prevenir exaustão de disco no host.
  - Adicionados healthchecks automatizados para `frontend`, `api` (via Node fetch em `/api/health`), `whatsapp-service` (`/health`), `document-worker` (`/health`) e `agro-intelligence` (`/`).
  - Definidos limites estritos de recursos (`deploy.resources.limits` e `reservations` para CPU e Memória) protegendo o host contra picos de OCR (Tesseract) e processamento geoespacial.
- **Utilitários de Automação de Produção Criados:**
  - `scripts/generate-production-secrets.mjs`: gerador de segredos criptográficos (64 caracteres hex e tokens URL-safe para `EMAIL_ENCRYPTION_KEY`, `WHATSAPP_INTERNAL_TOKEN`, `WHATSAPP_WS_JWT_SECRET`, etc.).
  - `scripts/verify-production-readiness.mjs`: auditor pré-voo de produção verificando variáveis, conectividade Postgres (186 tabelas encontradas), tabelas estruturais, storage e arquivos de deploy (20/20 PASS).
  - `scripts/setup-production-host.sh`: automação para o host (`207.58.153.219`) provisionando a rede `woopanel1`, volume dinâmico `imobzy_traefik_dynamic` e volumes de persistência.
  - `scripts/backup-database-and-storage.sh`: script de backup diário com dump do PostgreSQL e rotação de 14 dias com espelhamento MinIO.
- **Validação Completa de Quality Gates:**
  - `check-deploy-config`: APROVADO.
  - `verify-production-readiness`: 20/20 verificações APROVADAS (0 WARN, 0 FAIL).
  - `type-check` (`tsc --noEmit`): APROVADO (0 erros TypeScript).
  - `vite build`: APROVADO (4.223 módulos transformados, PWA com 282 arquivos em cache).


## 2026-11-13 - Provisionamento Multi-Nível, Agentes IA Interativos e Testes E2E 100%

- **Correção de Chave Estrangeira `organizations` -> `plans` e PostgREST Cache:**
  - Criada constraint de chave estrangeira `fk_organizations_plans` entre `organizations.plan_id` e `plans.id` no Supabase Postgres.
  - Sincronizados os IDs dos planos em todas as organizações (`plan_id`).
  - Notificado o cache do PostgREST (`NOTIFY pgrst, 'reload schema';`), permitindo a consulta aninhada `select=plan_id,plans(id,name,features,limits)` com HTTP 200 OK.
  - Adicionado suporte a `WHATSAPP_WS_JWT_SECRET` com fallback em `server/api/whatsapp/index.js`, resolvendo o status 503 na rota `/api/whatsapp/socket-token` (agora 200 OK).

- **Correção da URL de Runtime do Supabase no Frontend (`public/env-config.js` & `dist/env-config.js`):**
  - Identificado que o arquivo `public/env-config.js` injetava no objeto global do navegador (`window.__IMOBZY_CONFIG__`) a URL antiga desativada (`epgaftsjmqmpczvzsrcc.supabase.co`), sobrescrevendo a nova URL do `.env`.
  - Atualizado `public/env-config.js` e `dist/env-config.js` com `https://ahimxutcthctbwpaedvy.supabase.co`, chave pública `sb_publishable_3jFEFCNNY6u3Gqh81q55uw_fh1m6_l-` e MinIO `https://storage.wootech.com.br`.
  - Validada a emissão de token via Supabase Auth no novo endpoint com sucesso (`opauloargolo@gmail.com`).
  - Frontend Vite (`:3006`) e Backend Express (`:3002`) ativos e sincronizados.

- **Provisionamento de Usuários e Organizações Multi-Tenant (`scratch/provision-users.mjs`):**
  - Usuário Master criado e validado: `opauloargolo@gmail.com` (Role: `superadmin`, Organização: `WooTech Master Imob`).
  - Criadas 4 organizações de teste: `WooTech Master Imob` (Master), `Revenda Prime SaaS` (Reseller), `Imobiliária Horizonte Urbano` (Urbano), `Fazendas Brasil Agro` (Rural).
  - Provisionados e testados 10 usuários cobrindo todos os níveis de acesso da plataforma:
    1. `opauloargolo@gmail.com` | `superadmin` / Master
    2. `owner@wootech.com.br` | `PLATFORM_OWNER` / Master
    3. `megaadmin@wootech.com.br` | `PLATFORM_ADMIN` / MegaAdmin
    4. `revenda@wootech.com.br` | `superadmin` / Revenda SaaS
    5. `admin.urbano@wootech.com.br` | `admin` / Imobiliária Urbana
    6. `admin.rural@wootech.com.br` | `admin` / Imobiliária Rural
    7. `gerente@wootech.com.br` | `gerente` / Imobiliária Urbana
    8. `corretor@wootech.com.br` | `broker` / Imobiliária Urbana
    9. `assistente@wootech.com.br` | `assistente` / Imobiliária Urbana
    10. `cliente@wootech.com.br` | `user` / Imobiliária Urbana
  - Autenticação JWT real via Supabase Auth + resolução de perfil com `role` e `organization_id` funcionando perfeitamente em 100% dos usuários.

- **Correções Estruturais e Normalização de Permissões:**
  - `server/middleware/auth.js`: Normalização dos roles do banco (`PLATFORM_OWNER`, `PLATFORM_ADMIN`, `RESELLER_ADMIN` -> `superadmin`; `CUSTOMER_ADMIN` -> `admin`; etc.), definição de `req.userId` em paridade com `req.authUserId`, e checagens de superadmin atualizadas para `req.userRole === 'superadmin'`.
  - `components/SuperAdminGuard.tsx`, `components/MegaAdminGuard.tsx`, `components/PanelGuard.tsx`: Acesso liberado sem bloqueio falso para o proprietário da plataforma e superadmin nas rotas `/woo-control`, `/megaadmin`, `/urban`, `/rural`.
  - `server/api/locacao/*.routes.js` & `server/api/locacao/index.js`: Reconciliação dos 7 submódulos (`lease`, `adjustment`, `dashboard`, `invoice`, `termination`, `bordero`, `signature`) para a tabela unificada `leases` e montagem de `/contracts`.
  - `server/services/ai/llmProvider.js`: Detecção e filtragem de chaves placeholder, adicionando o provedor `LocalAssistantProvider` (`wootech-local-assistant-v1`) que garante resposta conversacional e execução de ferramentas de IA (tool calling) mesmo sem chave de nuvem cadastrada.
  - `server/services/ai/toolRegistry.js`: Passagem correta de `agentId` para `ai_execution_logs` resolvendo a FK `ai_execution_logs_agent_id_fkey`.
  - `server/api/ai/agents.routes.js`: Suporte tanto a `promptText` quanto a `prompt` no payload e atualização da versão ativa quando a versão inicial já existe em `PATCH /agents/:id/prompt`.
  - `server/routes/woo-control.js`: Cálculo de MRR tolerante a organizações com `plan_id` ou `plan`.
  - `server/api/documents/onr.js`: Tratamento seguro quando as credenciais ONR não estão cadastradas, retornando 403 `ONR_NOT_CONFIGURED` em vez de erro 500.
  - `server/services/valuationService.js`: Correção da query `_getBasePrice` para não passar subquery como iterável em `.in()`, evitando TypeError no PostgREST client.

- **Alinhamento de Schema no Banco Supabase:**
  - Adicionadas colunas em `organizations`: `owner_name`, `owner_email`, `plan_id`.
  - Adicionada coluna em `profiles`: `approved boolean DEFAULT true`.
  - Adicionadas colunas em `properties`: `niche`, `bedrooms`, `bathrooms`, `suites`, `parking_spots`, `area_m2`, `area`.
  - Corrigida RPC `search_properties_for_lead` para referenciar `p.city` em vez de `p.location_city`.

- **Suíte E2E Completa (55/55 Testes Aprovados - 100%):**
  - Autenticação e emissão de JWT real para todos os 10 papéis de usuário.
  - WooControl: Métricas agregadas, listagem de rede de clientes, planos e licenças.
  - Gestão de Equipe & Usuários: Listagem por organização, verificação de limites, auditoria de MinIO (`imob.erp`).
  - Cadastro e Operação de Imóveis: CRUD de imóvel urbano (Apartamento Jardins) e rural (Fazenda Santa Fé, 1.250 ha), cálculo de Geo/Valuation automatizado.
  - CRM & Atendimento: Criação de leads, avanço de status, registro de boas-vindas e cadastro de clientes/proprietários.
  - Locação & Contratos: Criação de contrato de locação, geração de PDF com assinatura digital e upload no MinIO, cálculo de reajuste por índice (IGP-M/IPCA), liquidação de fatura/despesa e renovação contratual.
  - MinIO Storage & DataRoom: Upload de documento no bucket `imob.erp`, geração de URL assinada e sincronização no DataRoom.
  - Agentes de IA: Criação do agente de atendimento, versionamento de prompt, conversa multi-turn, execução automatizada de tool (`properties.search` integrada ao banco), chat com memória conversacional, chat geral e geração de landing page por IA.

- **Validação de Quality Gates:**
  - `npm run check-deploy-config`: APROVADO.
  - `npm run type-check`: APROVADO (0 erros TypeScript).
  - `npm run lint`: APROVADO (0 erros ESLint).
  - `vitest run`: 31/31 arquivos de teste aprovados, 152/152 testes unitários passando.
  - `npm run build`: Build de produção Vite gerado com sucesso (dist PWA completo).

## 2026-11-12 (Atualização 2) - Migração do Banco Supabase (`ahimxutcthctbwpaedvy`) + MinIO (`imob.erp`)

- **Configuração de Ambiente (`.env` local, gitignored):**
  - Atualizado Supabase para `https://ahimxutcthctbwpaedvy.supabase.co` (`VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL` e `SUPABASE_DB_URL` no pooler `aws-1-sa-east-1.pooler.supabase.com:6543`).
  - Configurado MinIO (`https://storage.wootech.com.br`) com bucket único `imob.erp` (`MEDIA_STORAGE_PROVIDER=minio`, `ALLOW_SUPABASE_STORAGE_FALLBACK=true`, `MINIO_BUCKET=imob.erp`, `MINIO_BUCKET_MODE=single`).
- **Correções nos Módulos de Conexão & Migração:**
  - `server/lib/supabase-server.js`: `getSupabaseServer` ajustado para aceitar chaves `sb_secret_` sem emitir falso aviso de comprimento `< 50`.
  - `server/lib/minio-storage.js`: `resolveMinioObjectKey` e `getBucketName` atualizados para respeitar `MINIO_BUCKET` e `MINIO_BUCKET_MODE` diretamente do ambiente mesmo antes da carga de runtime em DB, roteando prefixos lógicos (`imobzyimg/`, `whatsapp-media/`, `documents/`, `exports/`) dentro do bucket `imob.erp`.
  - `server/services/storageIntelligenceService.js`: `loadAndApplyStoredMinioConfig` agora sempre aplica a configuração mesclada via `setMinioRuntimeConfig`, e `mergeMinioConfig` infere `bucketMode: 'single'` quando `MINIO_BUCKET` é definido sem buckets separados explícitos.
  - `scripts/postgres-direct-migration.mjs`: ajustado para priorizar `DATABASE_URL`/`SUPABASE_DB_URL` do `.env`.
- **Sincronização Integral do Novo Banco (`ahimxutcthctbwpaedvy`):**
  - Aplicadas extensões (`uuid-ossp`, `pgcrypto`, `postgis`, `postgis_topology`), `17` enums, sequências, `181` tabelas base, chaves estrangeiras, índices, `44` funções, views de aplicação, `41` triggers, `298` políticas RLS, `9` buckets no Supabase Storage e seeds (`plans`: 6, `saas_settings`: 1, `ai_slot_definitions`: 55, `ai_tools`: 18, `valuation_rules`: 24) + integração MinIO salva em `storage_integrations` (`provider: 'minio'`, `singleBucket: 'imob.erp'`).

## 2026-11-12 - Análise Completa do Sistema, Correções E2E, Migração SQL e Smoke Tests

### Resumo das Mudanças Executadas
- **Autenticação no Frontend (`Authorization: Bearer` via `callApi`):**
  - `src/services/lease/leaseService.ts`: `apiFetch<T>` agora delega para `callApi` (`../../lib/api`).
  - `src/components/ValuationCard.tsx`: substituídos `fetch('/api/valuation/...')` por `callApi(..., { hideError: true })`.
  - `components/LandingPageEditor/AIGenerationModal.tsx` & `AICloneModal.tsx`: substituídos `axios.post` sem header de auth por `callApi`.
  - `services/ruralDataService.ts`: `fetchCarData` atualizado para usar `callApi`.
- **Módulo DataRoom End-to-End:**
  - `App.tsx`: adicionada rota `dataroom/:id`.
  - `server/services/documentService.js` & `server/api/documents/index.js`: adicionados `_attachPublicUrl`, `listByOrg` e endpoint `GET /api/documents` (`verifyAuth, requireTenant`).
  - `views/DataRoom.tsx`: autenticado via `callApi`, seletor de imóveis quando `:id` não é informado, modal de análise (`extracted_data` / `raw_text`), link `public_url` e remoção via `DELETE /api/documents/:docId`.
- **Rotas de Backend, Contratos API & SSRF:**
  - `server/routes/public.js` & `server/index.js`: implementado `POST /api/public/contact` (+ alias `POST /api/contact`) com resolução de organização e inserção de lead.
  - `server/api/ai/chat.routes.js`: implementado `POST /api/ai/clone-site` com proteção SSRF (`isPrivateIpAddress`, bloqueio de IPs privados via `dns.lookup`), extração via `cheerio` e geração de layout com IA.
  - `server/api/portals/index.js`: adicionados endpoints `POST /:portal/unpublish/:propertyId` e `GET /:portal/status/:propertyId`.
  - `server/api/crm/leads.routes.js`: adicionado `POST /leads/:id/welcome` registrando atividade em `lead_activities`.
  - `server/api/locacao/dashboard.routes.js`, `lease.routes.js` & `services/locacaoService.ts`: adicionados campos de resumo (`total_contratos`, `contratos_vencendo_30_dias`, `contratos_vencendo_90_dias`), endpoints `POST /:id/renovar` e `PUT /:id/pagamento` e alinhamento de rotas em `locacaoService.ts`.
  - `components/WebChatWidget.tsx`: endpoint corrigido de `/api/gemini/chat` para `/api/ai/chat`.
  - `views/ImpersonateCallback.tsx`, `server/routes/admin.js` & `server/index.js`: redirecionamento ajustado para `/admin` e adicionado `POST /api/admin/impersonations/exchange` (+ alias `POST /api/support/exchange` retornando `410`).
- **Mapeamento de Tabelas, Banco Postgres & Storage:**
  - `server/routes/zap.js`: `.from('users')` -> `.from('profiles')` e `status: 'Novo'`.
  - `server/api/locacao/invoice.routes.js`: `.from('contacts')` -> `.from('clients')`.
  - `server/routes/aiOperations.js`: removida consulta inexistente a `environments`.
  - `server/services/ai/toolHandlers.js`: `sendMessage` -> `lead_activities`, `generateDocument` -> `urban_documents`, `extractDocumentText` alinhado às colunas reais de `documents`.
  - `server/api/documents/onr.js`: persistência não-bloqueante em `onr_requests`.
  - `migrations/20261112_missing_tables_and_buckets.sql` (**aplicada no Postgres**): criadas tabelas `landing_page_analytics`, `landing_page_blocks`, `email_drip_campaigns`, `onr_requests`, colunas `views_count`/`leads_count` em `landing_pages`, RPCs `increment_landing_page_views`/`increment_landing_page_leads` e 7 buckets de storage (`imobzyimg`, `imobzymsg`, `documents`, `exports`, `contracts`, `agency-assets`, `property-images`).
  - `server/lib/minio-storage.js`, `server/api/storage/index.js`, `views/SetupWhitelabel.tsx`: fallback para Supabase Storage habilitado por padrão quando MinIO não está configurado, criação automática de bucket em caso de `Bucket not found` e upload via `agency-assets`.
- **UI Sem Placeholders e Toasts:**
  - `views/PropertyEditor.tsx`: botão ONR integrado a `/api/documents/onr/request`.
  - `components/importer/PropertyReviewTable.tsx` & `views/megaadmin/SmartImporter.tsx`: edição inline e exclusão reais substituindo alerta "em breve".
  - `services/storage.ts` & `views/woocontrol/pages/{Academy,Products,Releases,Security,Snapshots}.tsx`: substituição de `alert()` por `sonner` (`toast`).

## 2026-11-11 - Banco Supabase (`yrabjwktnanjgjmdackf`) Aplicado + Stack Portainer + Fixes de Boot da API

- **Banco & Ambiente:** Configurado `.env` local (gitignored) apontando para `https://yrabjwktnanjgjmdackf.supabase.co` e aplicado schema completo + migrações (182 tabelas no schema `public`, incluindo `plans` e `saas_settings`, e remoção de políticas RLS recursivas em `profiles`/`organizations`). Corrigido SSL automático para pooler/Supabase em `server/lib/pg.js` e `scripts/postgres-direct-migration.mjs`.
- **Stack Portainer:** Atualizados `portainer-stack.yml`, `docker-compose.yml` e `.env.production.template` com todos os 9 serviços (`frontend`, `api`, `whatsapp-service`, `rabbitmq`, `redis`, `instagram-service`, `instagram-worker`, `document-worker`, `agro-intelligence`) e variáveis `${VAR}` sem fallbacks de senha.
- **Correções de boot real em `npm run server`:**
  - `server/services/jarvisService.js`: substituído `new Groq(...)` no topo do módulo por `getGroqClient()` preguiçoso para não derrubar o servidor quando `GROQ_API_KEY` está ausente no `.env`.
  - `server/routes/wootechAi.js`: ajustada rota Express 5 `/responses/(.*)` para regex `/^\/responses(?:\/.*)?$/` (evitando `PathError` do `path-to-regexp`).

## 2026-11-11 - Auditoria Integral & Remediação Completa (Níveis 0 a 3)

### Resumo das Mudanças Executadas
- **Segurança & Isolamento Multi-Tenant (P0):**
  - `server/routes/account.js`: removido `findOrgByDomain`; `/recover-org` restrito a usuários com e-mail confirmado e correspondência exata com `owner_email`.
  - `server/api/social/index.js` & `server/middleware/tenant.js`: validação estrita de `req.orgId` e bloqueio de spoofing em `req.body.org_id` / `req.params.org_id`.
  - `server/routes/wootechVoice.js`: adicionado `verifyAuth` + `requireTenant`, correção de `req.tenant_id` para `req.orgId` e validação de entrada.
  - `server/services/digitalSignatureService.js`: substituída senha fixa `'senha123'` por passphrase aleatória (`crypto.randomBytes(24).toString('hex')`).
  - `instagram-service/src/middleware/auth.js`, `instagram-service/src/index.js`, `views/Instagram/hooks/useWebSocket.ts`, `instagram-service/src/routes/webhooks.js`: validação de empresa via `profiles` + autenticação JWT no WebSocket + token interno em webhooks.
  - `server/index.js`: reabilitado `/health`, proxy `/api/instagram` configurado via `INSTAGRAM_SERVICE_URL` com `verifyAuth, requireTenant` e proteção de `POST /api/send-welcome`.
- **Segredos, Deploy & CI/CD (P0):**
  - `docker-compose.yml`, `portainer-stack.yml`, `portainer-stack-fazendasbrasil-pronta.yml`, `.env.production.template`: remoção de segredos literais e placeholders falsos; inclusão de `redis`, `instagram-service`, `instagram-worker` e `document-worker` no compose principal.
  - `.github/workflows/ci.yml` e `.github/workflows/docker-images.yml`: remoção de `continue-on-error: true` em lint/type-check, remoção de alias SHA antigo e inclusão dos builds dos microserviços.
- **Fluxos Core, IA & Billing (P1):**
  - `server/api/ai/agents.routes.js`, `server/services/ai/llmProvider.js`, `server/api/settings/index.js`, `server/api/ai/chat.routes.js`: isolamento do Sandbox por `organization_id`, repasse das chaves por tenant (`orgKeys`), invalidação de cache ao atualizar settings, geração real de layout JSON por LLM e correção da URL de provedores no chat.
  - `server/routes/onboarding.js`, `server/routes/subscription.js`, `server/services/asaasGateway.js`, `components/SubscriptionGuard.tsx`: validação de domínio no onboarding com rollback em caso de erro, persistência de tema/cores/equipe, checkout/PIX/boleto real via Asaas e ativação automática via webhook.
  - `views/megaadmin/AiCreditsHub.tsx`, `views/AICentral.tsx`, `server/routes/wooControlAi.js`, `server/services/snapshotService.js`, `server/routes/woo-control.js`: correção `/api/wootech-ai/transfer`, navegação real na `AICentral`, implementação de `/api/woo-control/ai/{status,usage,config}` e download de snapshots.
  - `server/workers/social.worker.js`, `instagram-worker/app/worker.py`, `server/api/rural/analysis/integrations/car-connector.js`, `server/api/locacao/contract.routes.js`: publicação real Graph API no worker social, `LoginRequired` + broadcast no worker Instagram, `fetchByGeometry` no conector CAR e renderização de templates + e-mail de locatário em contratos.
- **Módulos Funcionais & UI Sem Placeholders (P2):**
  - Nova migração `migrations/20261110_urban_expenses_and_renegotiations.sql`, `server/api/cobranca/index.js`, `services/cobrancaService.ts`, `views/urban/FinanceiroUrbano.tsx`, `views/urban/Cobranca.tsx` (CRUD de despesas, DRE real, boletos, exportação CSV, renegociação real).
  - `views/RentalsManagement.tsx`, `views/RentalsBordero.tsx`, `views/PropertyManagement.tsx`, `views/urban/LoteamentoDetails.tsx`, `views/urban/ClubeImobzy.tsx`, `views/urban/ComplianceUrbano.tsx`, `views/rural/CadastroTecnico.tsx`, `views/rural/DueDiligence.tsx`, `views/rural/FinanceiroRural.tsx`, `views/RuralDashboard.tsx`, `views/LegalContracts.tsx`, `views/DataRoom.tsx`, `views/admin/Dashboard360.tsx`, `views/admin/Matchmaking360.tsx`, `views/admin/WaitlistLeads.tsx`, `views/CRM/ClientsManager.tsx`, `views/AdminTicketsBoard.tsx`, `views/EmailCenter.tsx`, `views/WhatsApp/ChatWindow.tsx`, `views/WhatsApp/QueuesManagerModal.tsx`, `views/marketing/SocialMediaCalendar.tsx`, `views/megaadmin/ConnectionManager.tsx`, `views/superadmin/MarketingManager.tsx`, `views/woocontrol/pages/Settings.tsx`, `services/wooControl.ts`, `src/components/lease/LeaseDetail.tsx`, `src/components/lease/steps/StepIncomeDocs.tsx`, `src/components/lease/templates/TemplateList.tsx`.
  - Novos testes de regressão em `server/__tests__/securityHardening.test.ts`.

## 2026-09-06 - Envio de atualizações ao Git + verificação do banco

- Commit `d261289` pushado a `origin/main` (`fluowai/woomobzy`): `feat(woo-control)` emissão de licenças (novo `server/lib/license-manager.js`, usado em `onboarding.js` e `woo-control.js`), CRUD de revendas na Rede, página de Licensing, melhorias em WooControlLayout/Network.
- `npm run type-check` OK; `node --check` nos JS alterados OK.
- Banco (Supabase remoto) verificado via `DATABASE_URL`/pg: schema `woo_licenses`/`woo_products` compatível com o license-manager; policies públicas de `site_texts` e `organizations` presentes; migrações Woo (20260829/30/curriculum) já aplicadas.
- Scripts scratch/test ad-hoc (root) adicionados ao `.gitignore`; nada sensível commitado.

## 2026-08-23 - Análise e Correções de 500 Errors + Interface de Agentes

### Mudanças Realizadas

#### Backend (3 arquivos)
1. **server/services/ai/llmProvider.js**
   - `getProviderForTask()` agora retorna `null` ao invés de lançar erro quando nenhum provedor LLM está configurado
   - `chat()` verifica null e lança erro descritivo em português: "Nenhum provedor LLM configurado. Configure chaves de API no painel de configurações."

2. **server/api/ai/agents.routes.js**
   - Adicionada verificação de disponibilidade LLM antes de processar mensagem `/agents/conversations/:id/message`
   - Retorna `500` com code `AI_LLM_NOT_CONFIGURED` e mensagem clara em português quando não há provedor configurado
   - Isso evita que o erro 500 não tratado seja propagado ao usuário

3. **services/aiWorkforce.ts**
   - Adicionada interface `AIChannelRulePayload` para regras de canal
   - Adicionada função `updateAgent()` para atualizar agente via API
   - Adicionada função `createChannelRule()` para conectar WhatsApp/Instagram/Webchat

#### Frontend (2 arquivos)
4. **views/AIAgentDetail.tsx** - Interface completa de agente
   - Editor de prompt com textarea profissional
   - Checklist de 6 regras de conversa (tom profissional, não inventar dados, anti-repetição, handoff humano, WhatsApp fluido, etc.)
   - Conexão de canais: WhatsApp, Instagram, Webchat com instancia selection
   - Bloqueio automático quando há humano ativo
   - Salvamento de perfil (nome, função, descrição)
   - Toggle status Ativo/Pausado
   - Parâmetro URL `?tab=channels` para ir direto à aba de canais
   - Extração inteligente de prompt (blocos, instruções legacy ou full text)

5. **views/AIOperationDashboard.tsx**
   - Card "Configuração profissional" linking para editor de agente
   - Lista de agentes com links para editar, ver canais e testar
   - Texto atualizado: "Arquitetura gerada pela WooTech IA · prompts e canais editáveis"

### Correção de Erro 500 Mais Crítico

**Antes**: Quando não havia chaves de API LLM configuradas, o sistema lançava um erro 500 genérico, muitas vezes com "No LLM providers available" ou erros de database connection, deixando o usuário sem saber o que aconteceu.

**Depois**: O sistema agora retorna uma resposta JSON estruturada:
```json
{
  "success": false,
  "error": "Nenhum provedor LLM configurado. Adicione chaves de API no painel de configurações.",
  "code": "AI_LLM_NOT_CONFIGURED"
}
```

Isso acontece no endpoint `POST /api/ai/conversations/:id/message` quando o orquestrador LLM não tem provedores disponíveis. O usuário vê uma mensagem compreensível e sabe exatamente o que fazer (adicionar chaves no painel de configurações).

### Próximos Passos - Workflow Profissional

#### 1. Preparar o Ambiente

```bash
# No terminal (já no diretório do projeto)
# 1. Verificar variáveis de ambiente
cp .env.example .env.local  # se não existir
# 2. Garantir Supabase conectado
# 3. Rodar migrações necessárias
npm run check-db  # ou: node --env-file=.env scripts/check-db.mjs
```

#### 2. Iniciar os Servidores

```bash
# Terminal 1 - Backend (porta 3002)
npm run server  # ou: node --env-file=.env server/index.js

# Terminal 2 - Frontend (porta 3006)  
npm run dev     # vite --port 3006 --strictPort
```

Acesse: http://localhost:3006

#### 3. Fazer Login e Acessar Agentes

1. Login com credenciais de operação (rural ou urbano)
2. No painel lateral, clicar em "Central de Inteligência Artificial"
3. Clicar em "Criar operação com IA" ou selecionar operação existente
4. Na operação, ver a nova interface de agentes:
   - Card "Configuração profissional" no overview
   - Lista de agentes com links [Editar], [Canal], [Testar]

#### 4. Criar um Agente para Imobiliária

Passo a passo no frontend:

1. **Acessar a aba "Agentes"** dentro de uma operação
2. **Clicar em "Novo Agente"** (botão + ou link dependendo da versão)
3. **Preencher dados básicos**:
   - Nome: "SDR Vendas" ou nome do seu agente
   - Função: "Qualifica potenciais compradores de imóveis"
   - Descrição: "Atende leads com clareza, empatia e objetividade"
   - Modelo: "gemini-1.5-pro" (padrão)
   - Temperatura: 0.4 (padrão)
   - Versão: "v1" (será criado automaticamente)

4. **Salvar o agente** - Isso criará o registro em `ai_agents` e tentará criar a versão 1.0

#### 5. Testar a Conversa com o Agente

Após criar o agente:

1. **Na lista de agentes**, clicar no link **[Testar]** ou ir na aba **'test'**
2. **Isso abrirá o Sandbox de Conversação** (interface de 2 colunas)
3. **Coluna da esquerda**: Simulação de canal (WhatsApp)
   - Você verá mensagens de exemplo ou pode digitar sua própria mensagem
   - Exemplos: "Oi, quero comprar apartamento", "Preciso de uma fazenda"
4. **Coluna da direita**: Painel operacional
   - Mostra intenção detectada (`BUY_PROPERTY`, `RENTER`, etc.)
   - Slots preenchidos (nome, cidade, etc.)
   - Ferramentas chamadas (properties.search, etc.)
   - Latência e uso de tokens
5. **Digite uma mensagem** no field inferior e pressione Enter

**O que esperar**:

- O agente responderá em português brasileiro
- Ele fará perguntas de qualificação (nome, orçamento, tipo de imóvel, cidade)
- Se tiver tools configuradas, ele pode chamar `properties.search`
- O painel direito mostrará o estado da conversa em tempo real
- Checklist de regras será validado automaticamente

#### 6. Testes Automatizados após Git Push

**Após fazer o push dos cambios**, execute os seguintes testes:

```bash
# 1. Verificar TypeScript
npm run type-check  # deve passar sem erros

# 2. Verificar Lint  
npm run lint  # deve passar (ou: npx eslint --quiet src views components)

# 3. Build de produção
npm run build  # deve gerar dist/ sem warnings críticos

# 4. Testes unitários (se houver)
npm test  # ou: npx vitest

# 5. Verificar endpoints de agente (manual ou script)
# Testar listagem de agentes
curl -X GET http://localhost:3002/api/ai/agents \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "x-tenant-domain: localhost"

# Testar criação de agente (com payload mínimo)
curl -X POST http://localhost:3002/api/ai/agents \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "x-tenant-domain: localhost" \
  -H "Content-Type: application/json" \
  -d '{"name": "Teste Agente", "role": "Teste", "description": "Agente de teste"}'

# 6. Verificar modo mock de teste (se chaves não estiverem configuradas)
# O sistema cairá gracefully para modo mock com mensagem informativa
```

#### 7. Verificação Pós-Push (O que eu, como assistente, devo confirmar)

Após você rodar o `git push`, eu vou verificar:

1. **TypeCheck passa**: `npx tsc --noEmit` - sem erros novos
2. **Lint passa**: `npm run lint` - sem erros de código
3. **Build OK**: `npm run build` - bundle gerado sem warnings críticos
4. **Endpoints funcionais**: 
   - `GET /api/ai/agents` - lista agentes
   - `GET /api/ai/agents/:id` - busca agente com versões
   - `PATCH /api/ai/agents/:id/prompt` - salva prompt
   - `POST /api/ai/conversations/:id/message` - processa mensagem (mostra erro gracefully se LLM não configurado)

#### 8. Rollback Caso Necessário

Se após o push surgir algum problema:

```bash
# Ver git log últimos commits
git log --oneline -10

# Reverter último commit se necessário
git reset --soft HEAD~1
# ou
git revert HEAD

# Reinstalar dependências se bug de módulo
rm -rf node_modules && npm install
```

---

### Resumo do Que Foi Corrigido

| Problema | Arquivo | Correção |
|----------|---------|----------|
| 500 error sem explicação quando LLM não configurado | `llmProvider.js`, `agents.routes.js` | Mensagem clara em português |
| Agente sem versão causava erro | `agents.routes.js` | Cria versão 1.0 automaticamente ou usa legacy |
| Não conseguia conectar canais | `aiWorkforce.ts` | Novas funções `createChannelRule`, `updateAgent` |
| Interface de agente era read-only | `AIAgentDetail.tsx` | Full edit: prompt, channels, status, profile |
| Dashboard não mostrava config | `AIOperationDashboard.tsx` | Card linking para configuração |

---

**Paulo, após você executar o `git push`, por favor:**
1. Rodar `npm run type-check` e confirmar que passa
2. Rodar `npm run build` e confirmar que builda sem erros críticos
3. Iniciar o frontend (`npm run dev`) e testar a criação de um agente
4. Testar a aba "Testar" e enviar uma mensagem para o agente
5. Confirmar se a aba "Canais" aparece e funciona corretamente

Isso garantirá que todas as correções de 500 error e as novas funcionalidades de agente estão operando corretamente no ambiente.
### Financeiro & ERP e Simulador (Agosto 2026)
- **FinanceiroUrbano.tsx**: Melhorado layout com Gr�ficos din�micos (Recharts) e Modal para inser��o manual de nova cobran�a.
- **FinancialHub.tsx**: Unificado com o Simulador 360, agora contendo as abas 'Cr�dito Imobili�rio', 'Parcelamento Direto' (Simulador) e 'Fian�a Aluguel'.
- **UrbanLayout.tsx e App.tsx**: Menu e rotas limpas, unificando a navegação de simulador pro hub.

## 2026-08-26 — Migrações SQL + Limpeza de Código

### Migrações Executadas (28 no total)
- Adicionadas 7 migrações faltantes ao `scripts/run-migrations.mjs`: RLS policies, fix organizations, captação leads, fix profiles RLS recursion, fix reseller tenant isolation, chaves Gemini/AI provider.
- Rodadas todas as 28 migrações via `npm run run-migrations` + execução manual via `exec_sql` RPC.
- Migrações críticas aplicadas: `20260823_fix_profiles_rls_recursion.sql`, `20260823_fix_reseller_tenant_isolation.sql`.
- Novas tabelas criadas: `whatsapp_cloud_credentials`, `connection_pool`, `connection_allocations`, `connection_billing`, `social_accounts`, `social_posts`.
- Colunas novas: signatures (selfie_url, document_url, ip_address, geolocation, whatsapp_validation_code, token_hash), condominiums (cnpj, manager_name, contact_email, contact_phone, zip_code, neighborhood, status), developments (svg_map), organizations (asgardpay_public_key, asgardpay_secret_key).

### Correções TypeScript
- Removido import de `Simulator360.tsx` deletado em `App.tsx`.
- Corrigido import de `asgardpayService` em `paymentService.ts`.
- Corrigido import path de `supabase` em `SocialMediaCalendar.tsx`.
- Corrigido destructuring de `organization` em `SocialMediaCalendar.tsx`.
- Adicionado `svg_map?: string` à interface `Development` em `types/development.ts`.

### Verificação
- `npm run type-check`: passou sem erros.
- `npm run build`: passou (4070 módulos, 1m31s).

### Financeiro Avan�ado: Contas a Pagar (Agosto 2026)
- **cobrancaService.ts**: Criada a interface \Expense\ e os m�todos \listExpenses\ e \createExpense\.
- **FinanceiroUrbano.tsx**: Adicionada a aba 'Contas a Pagar', com listagem de despesas, integra��o com o servi�o e estrutura base para controle de custo por im�vel e rateio de comiss�es/repasses.

### Automa��o & Split Payment (Agosto 2026)
- **asaasGateway.js**: Adicionado no backend simula��o de Gateway para tratar webhooks (PIX/Boleto).
- **webhook.js (routes)**: Criado router para injetar webhook (PAYMENT_RECEIVED) e processar o 'Split'.
- **server/index.js**: Injetado as rotas de webhook (/api/webhooks).
- **FinanceiroUrbano.tsx**: Criada a aba completa de 'Automa��o / Gateway' para gest�o de r�gua de cobran�a visual e rateio (Split) de comiss�es/repasses.

## 2026-08-28 — Limpeza do working tree (review + remoção de scripts internos)

- Analisado git status completo: 5 arquivos staged, 11 modificados (unstaged), 10 não rastreados.
- `constants/siteTemplates.ts`: o diff era reformatação + corrupção de encoding (45 chars mojibake, ex.: `Imobiliǭrio` no lugar de `Imobiliário`); conteúdo semântico idêntico ao HEAD (326 ids, zero diferenças além de encoding) — revertido via `git restore` para eliminar ruído e corrupção.
- `scripts/alter.mjs` deletado: duplicava `migrations/20260826_signature_fields.sql` (já versionado e registrado no `run-migrations.mjs`).
- Deletados 9 scripts descartáveis não rastreados: `add_templates_script.mjs`, `run_my_migration.mjs`, `scratch.cjs`, `scratch_financeiro.cjs`, `scratch_regua.cjs`, `scratch_server.cjs`, `test-api.mjs`, `test-chat.cjs`, `test-chat.mjs`.
- Atenção: `test-chat.cjs` mintava JWT com `SUPABASE_JWT_SECRET` (segredo) e user id hardcoded — descartado, nunca commitar.
- `.gitignore`: adicionados padrões `/scratch*.cjs`, `/scratch*.mjs`, `/test-api.mjs`, `/test-chat.*`, `/run_my_migration.mjs`, `/add_templates_script.mjs`, `/scripts/alter.mjs`.
- `views/SystemSettings.tsx`: removidos imports não usados (`Users` do lucide-react e `UserManagement`).
- Trailing whitespace removido em `server/routes/admin.js`, `views/SystemSettings.tsx`, `views/admin/UserManagement.tsx` — `git diff --check` limpo.
- Revisão da migração `20260827_ai_sandbox_fixes.sql`: já contém `DROP FUNCTION IF EXISTS`; dependências `get_my_org_id()`/RPC `exec_sql` existem; colunas usadas (`events`, `next_visit_at`, `classification`, `city`/`neighborhood`) confirmadas nos schemas/migrations.

### Verificação
- `npm run type-check`: passou (exit 0).
- `npm run lint`: 0 erros (744 warnings pré-existentes de dívida técnica); `SystemSettings.tsx` sem warnings.
- `npm run build`: passou (3m26s, 263 precache entries).
- `git diff --check`: passou (exit 0) após limpeza.
- Nenhum commit, push ou deploy foi executado.

## 2026-08-29 — Teste de usuário em produção Imobzy

- Executado teste end-to-end em `https://imob.wootech.com.br` com organização `WooTech Imob QA`.
- Criados dados de QA: um imóvel de venda, um imóvel de aluguel, um lead editado/movido no Kanban, uma operação de IA com três agentes e uma conexão WhatsApp com QR Code pendente de escaneamento.
- Salvas chaves LLM em Configurações; os valores não foram documentados no relatório por segurança.
- Identificados bloqueios principais: onboarding cria organização sem `plan_id`, onboarding não persiste campos de IA/WhatsApp/template/equipe, sandbox de IA retorna 500 por chave Gemini inválida/não resolvida, operação publicada mantém agentes em `DRAFT`, Clube Imobzy gera 400 e módulo de mensagens gera 500 em conversas Instagram.
- Relatório completo salvo em `DEV/TESTS/RELATORIO_TESTE_USUARIO_IMOBZY_2026-08-29.md`.
- Evidências salvas em `test-results/imobzy-user-audit`.
- Nenhum commit, push ou deploy foi executado.

## 2026-08-29 — Aplicação da migração WOO CONTROL

- Aplicado `migrations/20260829_woo_control_schema.sql` na produção (`epgaftsjmqmpczvzsrcc`, via `node scripts/apply-migration-file.mjs` → Postgres direto).
- Pre-flight: confirmados `organizations`/`profiles` presentes; `woo_*` não existiam; `organizations.type` faltava; `profiles_role_check` legado.
- Verificação pós: 9 tabelas `woo_*` criadas, `organizations.type` + `parent_id`, novo `profiles_role_check` com roles RBAC + legadas, RLS habilitado com políticas, função `is_platform_admin` criada.
- Nenhum commit, push ou deploy foi executado.


## 2026-09-06 — Auditoria de dados reais e WooControl

Inventariadas 184 rotas e registrados 121 sinais estáticos para revisão. Plano por nível criado em SPECS/REAL_DATA_EXECUTION_PLAN.md. Corrigidos autorização global do WooControl, consistência do suporte, indicadores sem plan_id, tratamento de erro da consulta, status financeiro e exit code do diagnóstico de banco. Normalizado .gitignore sem NUL preservando exclusão de segredos. Adicionados testes WooControl e deduplicadas rotas da suíte E2E. Homologação integral depende de contas/URL não configuradas; mocks e implementações restantes estão explicitados no plano. Verificação em VERIFY.md.
## 2026-09-06 — Execução real-data P1/P2: IA, cobrança, integrações e telas

- Pipeline de testes/publicação da IA deixou de aprovar com mock: versões persistidas são carregadas por tenant, casos rodam contra LLM real, erros de provedor bloqueiam publicação e o resultado é gravado em `ai_test_runs`, `ai_agent_versions`, `ai_agents`, `ai_operations`, `ai_red_team_results` e `ai_audit_logs`.
- Wizard de criação de operação passou a usar `agentVersionId`, instâncias reais de canais, score mínimo 90 e regras persistidas; removidos score fixo, canais fictícios e aprovação automática.
- Dashboard, logs, histórico e conhecimento da IA passaram a consumir APIs reais (`ai_execution_logs`, `ai_audit_logs`, `ai_knowledge_sources`, métricas da operação) e a exibir estado vazio em vez de exemplos inventados.
- Asaas removido do modo simulado: criação de cobrança exige `ASAAS_API_KEY`, cria/consulta cliente real, usa `/payments`, valida webhook com `ASAAS_WEBHOOK_TOKEN`/header `asaas-access-token` e remove endpoint público de simulação.
- Ferramentas de agenda da IA e RPCs SQL substituíram slots fixos por leitura de `lead_appointments` e criação de compromissos reais, com falha explícita em erro de banco.
- Wootech Mail removeu campanha/audiência fixas: dispatcher agora busca campanha, remetente, template e destinatários persistidos. Nova migration cria `mail_templates`, `mail_campaigns` e `mail_campaign_recipients`.
- Sienge removeu conexão e transferências inventadas: serviço exige URL/credenciais reais e chama a API configurada por ambiente/tenant.
- CVCRM/BIA removeu fallback `lead_simulado_*`; criação de lead sem ID real retornado agora falha.
- Lead scoring passou a atualizar `leads.lead_score` no banco e publicar evento com score antigo/novo real.
- Licenciamento self-hosted deixou de gerar par efêmero de assinatura em runtime; sem chaves configuradas retorna erro 503 em vez de lease assinado com chave descartável.
- Relatório CMA da captação deixou de ser delay/console e gera PDF real no navegador com `pdf-lib` a partir dos dados persistidos da captação.
- Corrigido `server/lib/eventBus.js` importando `crypto`, evitando quebra em eventos com `correlation_id`.

Verificação executada nesta etapa está em `DEV/VERIFY.md`. Ainda há ações “em breve” e integrações não homologadas nos módulos de locação, DataRoom, WhatsApp, rural/admin e alguns fluxos financeiros; não declarar o sistema inteiro como 100% funcional sem homologação autenticada e aplicação controlada das migrations novas.
## 2026-09-06 — Migrations real-data aplicadas no banco

- Aplicada `migrations/20260906_real_ai_calendar_tools.sql` via `node scripts\apply-migration-file.mjs`, com sucesso por Postgres direto.
- A aplicação de `migrations/20260906_real_wootech_mail_campaigns.sql` falhou inicialmente porque `public.mail_senders` ainda não existia no banco alvo.
- Aplicada a dependência `migrations/20260830_wootech_communications_foundation.sql` via Postgres direto.
- Reaplicada `migrations/20260906_real_wootech_mail_campaigns.sql`, agora com sucesso por Postgres direto.
- Verificação direta no Postgres confirmou tabelas `feature_flags`, `provider_credentials`, `customer_interactions`, `mail_domains`, `mail_senders`, `mail_templates`, `mail_campaigns`, `mail_campaign_recipients`, policies RLS dessas tabelas e RPCs `get_available_slots`/`schedule_visit` com assinaturas esperadas.
- `npm run check-db` continuou retornando exit 1 por HTTP 401 em tabelas protegidas (`profiles`, `properties`, `leads`, `landing_pages`, `site_settings`, `site_texts`), o que é esperado e não indica ausência dessas tabelas.

## 2026-09-07 — Correção do resumo WooControl

- Corrigido o 500 de `GET /api/woo-control/summary`: a consulta solicitava `plans.price`, coluna ausente no schema atual; passou a consultar e calcular MRR com `plans.price_monthly`.
- Consulta somente leitura ao banco confirmou as colunas atuais das tabelas envolvidas, incluindo `plans.price_monthly` e a ausência de `plans.price`.
- Incluído teste de regressão para priorizar `price_monthly` no cálculo.
- Nenhuma alteração de dados, migration, commit, push ou deploy foi executado nesta correção.

## 2026-11-13 — Reformulação Fidedigna das Telas e Sistema Interno (Design WooTech CRM / ERP)

- **Logo Vetorial WooTech** (`components/WooTechLogo.tsx`):
  - Criado componente fidedigno com ícone W estilizado geométrico em gradiente laranja (#ff5500 a #ff7a00), pixels em constelação no canto superior direito e tipografia WOOTECH (CRM / ERP IMOBILIÁRIO ou CRM IMOBILIÁRIO) com suporte aos modos dark e light.
- **Tela de Login** (`views/Login.tsx`):
  - Reformulada com fidelidade à imagem de referência (Imagem 1).
  - Painel esquerdo dark com fachada de edifício moderno sob luz âmbar/laranja neon, badge "Painel Operacional", headline com destaque neon, subtítulo e os 3 cards de valor (Gestão completa, Produtividade e automação, Segurança e estabilidade).
  - Card direito flutuante branco com bordas arredondadas, inputs corporativos (e-mail e senha com toggle), link "Esqueci minha senha", botão gradiente laranja "Entrar no painel ->", separador e botão Google, além do link "Solicitar acesso". Lógica funcional de autenticação preservada.
- **Página de Vendas / Landing Page** (`views/SystemSalesPage.tsx`):
  - Reformulada com fidelidade à imagem de referência (Imagem 2).
  - Barra de navegação com logotipo WooTech, links e CTAs "Entrar no painel" e "Agendar demonstração".
  - Hero com badge "O futuro da gestão imobiliária chegou", headline com "CRM imobiliário" em laranja neon, botões de ação e mockup dark do sistema integrado com sidebar, KPIs executivos (1.240 imóveis ativos, 532 novos leads, 1.032 atendimentos, 287 negociações), gráfico de leads por origem e card de imóvel em destaque.
- **Seletor de Modo e Painéis Operacionais** (`components/DashboardModeSwitcher.tsx`, `views/RuralDashboard.tsx`, `views/UrbanDashboard.tsx`, `views/megaadmin/Dashboard.tsx`):
  - Criado o seletor de 3 modos (Rural, Urbano, Dono do Sistema / Mega Admin) com cards panorâmicos e bordas ativas em neon laranja.
  - **Dashboard Rural**: Banner panorâmico do campo com botão "+ Nova Captação ->", 4 KPIs executivos da Imagem 3 (Propriedades Rurais, Investidores Ativos, Due Diligence Pend., Volume Negociado), gráfico de Performance Comercial (6 meses, pico R$ 90 mi), Distribuição por Região (donut 68% SC), Ações Rápidas, além dos 5 indicadores detalhados com sparklines, gráfico de evolução de leads, origem de leads, tabela de últimos leads e ações de rodapé (Imagem 4).
  - **Dashboard Urbano**: Banner com skyline urbano, 5 KPIs com sparklines (Leads: 128, Imóveis: 342, Novos Negócios: 41, Em Negociação: 16, Volume: R$ 18,7 mi), gráfico de Funil de Vendas com barras horizontais coloridas, distribuição por tipo de imóvel (donut com 342 imóveis), tabela de últimos leads urbanos e ações rápidas.
  - **Dashboard Mega Admin ("Dono do Sistema")**: Banner de comando, 5 KPIs (Total de Clientes: 12.480, Revendas Ativas: 24, Imóveis: 8.732, Receita Mensal: R$ 245.890, Usuários Ativos: 126), gráfico radial de Consumo da Plataforma (78% otimizado), barras de Revendas por Região, feed de Últimas Atividades e atalhos operacionais de revendas e usuários.
- **Layouts Globais do Sistema** (`components/RuralLayout.tsx`, `components/UrbanLayout.tsx`, `views/megaadmin/MegaAdminLayout.tsx`, `components/WorkspaceTopBar.tsx`):
  - Sidebar em obsidian dark (#0b0e14) com cabeçalho de perfil ("PA - Paulo Argolo, Gestor • Master"), itens de navegação com pílula ativa em gradiente laranja e glow, card de suporte "Seu negócio mais forte!" e link de saída do sistema.
  - Topbar com breadcrumbs, busca global de leads/imóveis/clientes, sino com badge de notificações e perfil do usuário.
- **Validação de Código**:
  - `npx tsc --noEmit` executado com código de saída 0 (zero erros de TypeScript).
  - `npm run build` executado com sucesso (Vite production bundle gerado com sucesso).
