# Auditoria Técnica e Estratégica da Imobzy

## 1. Resumo Executivo

A Imobzy é uma plataforma SaaS multi-tenant para o mercado imobiliário com cobertura de **dois segmentos verticais** (rural e urbano), construída como um **monólito modular** com serviços satélite em Go (WhatsApp), Python (IA/workers) e Node.js (Instagram). Após auditoria completa do repositório, o veredito é:

**Estratégia B — Reconstrução Híbrida (Strangler Fig)**

O sistema atual tem valor real: regras de negócio maduras, schema abrangente (99 tabelas), integrações funcionais, WhatsApp service sofisticado com whatsmeow/VoIP, multi-tenancy implementado, e 67 migrações de banco. Recriar do zero perderia esse conhecimento. Continuar sem refatorar aprofundaria a dívida técnica. A abordagem híbrida permite preservar o que funciona enquanto substitui progressivamente o que está degradado.

## 2. Veredito

**Reconstrução Híbrida (Strangler Fig)**

## 3. Nível de Confiança

**Alto** — 85% de confiança baseada em evidências diretas do código.

## 4. Evidências Decisivas

As evidências que definiram o veredito:

1. **WhatsApp Go Service** (`whatsapp-service/`) — sophisticated, uses official whatsmeow library, has VoIP/call support, media pipeline, AI automation. This is a competitive advantage that would be extremely costly to rebuild.
2. **99 database tables with multi-tenant structure** — the schema covers the full real estate domain and would take months to redesign from scratch.
3. **67 SQL migrations** — represent accumulated domain knowledge. Data migration risk is significant.
4. **Two abandoned WhatsApp implementations in Node.js** (`server/routes/zap.js`) alongside the new Go service — shows the system evolved but left dead code.
5. **Legacy PascalCase tables** (`"User"`, `"Organization"`, `"Plan"`, `"AccessProfile"`) coexist with new lowercase tables — evidence of incomplete migration.
6. **`AIAutomation.js` has 2022 lines** — a single file handling all AI automation. Needs decomposition but has business value.
7. **Zero integration tests in `server/__tests__/`** (0 files) — critical gap but the Vitest suite (18 files, 90 tests) and 14 E2E tests exist.
8. **`server/api/whatsapp/providers/` is empty** — the WhatsApp provider abstraction was planned but never implemented.
9. **Secrets exposure confirmed in HANDOFF.md** — "rotacionar todos os segredos previamente expostos" is a pending action.
10. **CI lint and type-check use `continue-on-error: true`** — quality gates are not enforced.

## 5. Inventário da Plataforma

### 5.1 Tabela de Projetos e Serviços

| Projeto/Serviço | Tecnologia | Responsabilidade | Estado Aparente | Dependências Críticas |
|---|---|---|---|---|
| Frontend (raiz) | React 19, Vite 6, TS 5.8 | SPA principal, CRM, painéis, sites públicos | Ativo | API backend, Supabase |
| Backend (server/) | Express 5, Node.js ESM | API REST principal, 69 route files | Ativo | Supabase (service role), MinIO, RabbitMQ |
| WhatsApp Service | Go 1.25, whatsmeow | Mensageria WhatsApp, VoIP, mídia | Ativo | Supabase, MinIO, API backend |
| AI Worker | Python | STT/TTS, Kanban, Ollama | Parcial | API backend (via HTTP) |
| Document Worker | Python | Processamento documentos | Parcial | API backend |
| Instagram Service | Node.js/Express | Gerenciamento Instagram | Parcial | Supabase, API backend |
| Instagram Worker | Python | Automação Instagram | Parcial | Instagram Service |
| Agro Intelligence | Python (Docker) | Análise agronômica | Não confirmado | API backend |
| RabbitMQ | 3.13 | Filas de processamento assíncrono | Ativo | API, Workers |

### 5.2 Tecnologias e Versões

| Tecnologia | Versão | Estado |
|---|---|---|
| React | 19.2.3 | Atual |
| React Router | 7.15.1 | Atual |
| Vite | 6.2.0 | Atual |
| TypeScript | 5.8.2 | Atual |
| Tailwind CSS | 4.2.1 | Atual |
| Express | 5.2.1 | Atual |
| Supabase JS | 2.89.0 | Atual |
| Node.js | >=20 | Atual |
| Go | 1.25.0 | Atual |
| Framer Motion | 12.40.0 | Atual |
| Recharts | 2.15.0 | Atual |
| Zod | 3.24.0 | Atual |
| Lucide React | 0.473.0 | Atual |
| @dnd-kit/core | 6.3.1 | **Duplicado** |
| @hello-pangea/dnd | 18.0.1 | **Duplicado** |

**Problema de duplicação:** Duas bibliotecas de drag-and-drop (`@dnd-kit` e `@hello-pangea/dnd`) cumprem a mesma função. Isso aumenta o bundle e indica falta de padronização.

### 5.3 Mapa Funcional

| Módulo | Frontend | Backend | Banco | Integração Real | Testes | Situação |
|---|---|---|---|---|---|---|
| CRM - Leads | `views/CRM/CRMLeads.tsx` | `api/crm/leads.routes.js` | `leads` | Sim | Parcial | Funcional |
| CRM - Kanban | `views/CRM/KanbanBoard.tsx` | `api/crm/index.js` | `leads` | Sim | Não | Funcional |
| CRM - Clientes | `views/CRM/ClientsManager.tsx` | `api/crm/clients/` | `clients` | Sim | Não | Funcional |
| CRM - Agenda | `views/CRM/Agenda/` | `api/crm/index.js` | `lead_followups` | Sim | Não | Funcional |
| Imóveis | `views/PropertyManagement/` | `api/properties/` | `properties` | Sim | Não | Funcional |
| Editor de Imóvel | `views/PropertyEditor.tsx` | `api/properties/` | `properties` | Sim | Não | Funcional |
| WhatsApp | `views/WhatsApp/` | Go service (proxy) | `whatsapp_*` | Sim (whatsmeow) | Sim (Go) | **Ativo** |
| WhatsApp (legado) | N/A | `routes/zap.js` | `instances, messages` | Baileys | Não | **Abandonado** |
| IA - Assistente | `views/AIAssistant.tsx` | `api/ai/chat.routes.js` | N/A | Gemini/Groq | Não | Funcional |
| IA - Agentes | `views/AIAgents.tsx` (2296 linhas) | `api/ai/agents.routes.js` | `ai_agents` | Gemini | Não | Funcional |
| IA - Automação | N/A | `lib/AIAutomation.js` (2022 linhas) | N/A | Gemini | Não | Funcional |
| IA - WooTech AI | `views/WooTechAI.tsx` | `routes/wootechAi.js` | N/A | OpenAI | Não | Parcial |
| Sites/Páginas | `views/LandingPage*.tsx` | `api/sites/` | `landing_pages, sites` | Sim | Não | Funcional |
| Site Manager | `views/SiteManager.tsx` | `api/sites/` | `site_settings` | Sim | Não | Funcional |
| Portais | N/A | `api/portals/`, `services/*` | N/A | Orulo, Zap, VivaReal | Não | Parcial |
| Orulo | N/A | `api/orulo/` | `orulo_*` | Sim (via API) | Não | Funcional |
| Locação | `views/RentalsManagement.tsx` | `api/locacao/` | `leases, rental_contracts` | Sim | Não | Funcional |
| Rural | `views/rural/*` | `api/rural/` | `properties(urban)` | SICAR, CAR, IBGE | Não | Funcional |
| Urbano | `views/urban/*` | `api/urban/` | `properties(urban)` | Sim | Não | Funcional |
| BI - Rural | `views/BIRural.tsx` | `api/rural/` | RPCs | Não | Não | Parcial |
| BI - Urbano | `views/BIUrbano.tsx` | `api/urban/` | RPCs | Não | Não | Parcial |
| Quiz | `views/QuizCampaigns.tsx` | `api/quiz/` | `quiz_campaigns, quiz_submissions` | Sim | Não | Funcional |
| Cobrança | N/A | `api/cobranca/` | `billing, billings` | Asaas | Não | Parcial |
| Email Center | `views/EmailCenter.tsx` | `api/email/` | `email_accounts, emails` | IMAP/SMTP | Não | Funcional |
| Data Room | `views/DataRoom.tsx` | `api/valuation/` | `documents` | Sim | Não | Parcial |
| Avaliações | N/A | `api/valuation/` | `property_valuations` | Sim | Não | Parcial |
| Due Diligence | `views/rural/DueDiligence.tsx` | `api/rural/` | `due_diligence_items` | Sim | Não | Parcial |
| Assinaturas | `views/SetupWizard.tsx` | `routes/subscription.js` | `plans, organizations` | Asaas | Não | Funcional |
| Mega Admin | `views/megaadmin/*` | `routes/mega-admin.js` | Via service role | Supabase | Não | Funcional |
| Instagram | `views/Instagram/` | Instagram Service | N/A | Instagram API | Não | Parcial |
| Clube Imobzy | `views/urban/ClubeImobzy.tsx` | N/A | N/A | Não | Não | **Somente interface** |
| Financial Hub | `views/urban/FinancialHub.tsx` | N/A | N/A | Não | Não | **Somente interface** |
| Campanhas | N/A | `api/campaigns/` | N/A | Serper | Não | Parcial |
| Distribuição Leads | N/A | `services/leadDistributionService.js` | `leads` | Sim | Não | Parcial |
| Sistema - Admin | `views/admin/*` | `routes/admin.js` | Via service role | Supabase | Não | Funcional |
| Sistema - Super Admin | `views/superadmin/*` | `routes/admin.js` | Via service role | Supabase | Não | Funcional |
| Contratos Legais | `views/LegalContracts.tsx` | N/A | `contracts` | Sim | Não | **Somente interface**? |

## 6. Estado do Frontend

### 6.1 Arquitetura

**Pontos fortes:**
- Lazy loading de todos os componentes de view (otimização de bundle)
- PWA habilitado com service worker e caching estratégico
- Separação de chunks: react, charts, maps, supabase
- Context API para estado global (Auth, Settings, Plans, Tenant, Texts)
- Roteamento com React Router v7 com layouts aninhados (RuralLayout, UrbanLayout)
- Guards de acesso: ProtectedRoute, SuperAdminGuard, MegaAdminGuard, PanelGuard, SubscriptionGuard

**Problemas:**

1. **Duas bibliotecas de drag-and-drop** (`@dnd-kit` e `@hello-pangea/dnd`) — Evidência: `package.json` linhas 32-37. Aumenta bundle desnecessariamente.

2. **Componentes monolíticos**: `views/AIAgents.tsx` (2296 linhas), `views/PropertyEditor.tsx` (2200 linhas), `views/FazendasBrasilPublicSite.tsx` (2444 linhas) — violam o princípio de responsabilidade única.

3. **Interface sem backend**: `FinancialHub.tsx` (992 linhas) e `ClubeImobzy.tsx` foram criados com UI completa, mas não possuem rotas de backend ou integração real conforme DEV/WORKLOG.md.

4. **Template customizer gigante**: `views/TemplateCustomizer.tsx` (1382 linhas) e `constants/siteTemplates.ts` (4374 linhas) — templates embutidos no frontend.

5. **Tipos gerados enormes**: `types/database.types.ts` (6085 linhas) e `src/types/database.types.ts` (6085 linhas) — duplicado entre raiz e src/.

### 6.2 20 Maiores Arquivos do Frontend

| Arquivo | Linhas | Problema |
|---|---|---|
| `constants/siteTemplates.ts` | 4374 | Templates embutidos no bundle |
| `views/FazendasBrasilPublicSite.tsx` | 2444 | Site público monolítico |
| `views/AIAgents.tsx` | 2296 | Tela gigante sem componentização |
| `views/PropertyEditor.tsx` | 2200 | Editor monolítico |
| `views/OkaPublicSite.tsx` | 1821 | Outro site público |
| `services/landingPageTemplates/elementor.ts` | 1750 | Templates no bundle |
| `views/LandingPage.tsx` | 1614 | Editor de página gigante |
| `views/EmailCenter.tsx` | 1444 | Cliente de email |
| `views/TemplateCustomizer.tsx` | 1382 | Customizador monolítico |
| `views/megaadmin/StorageIntelligence.tsx` | 1249 | Tela de painel admin |
| `services/landingPageTemplates/legacy.ts` | 1153 | Templates legados |
| `views/LandingPageManager.tsx` | 1078 | Gerenciador |
| `types/landingPage.ts` | 1077 | Tipos de landing page |
| `views/WhatsApp/CampaignEditor.tsx` | 1077 | Editor de campanha |
| `services/landingPageTemplates/designedShowcase.ts` | 1071 | Templates |
| `views/WhatsApp/WhatsAppDashboard.tsx` | 1042 | Dashboard WhatsApp |
| `views/megaadmin/FluowaiMigration.tsx` | 999 | Ferramenta de migração |
| `views/urban/FinancialHub.tsx` | 992 | UI sem backend |
| `views/SystemSalesPage.tsx` | 991 | Página de vendas |
| `views/WhatsApp/hooks/api.ts` | 972 | API hooks WhatsApp |

### 6.3 Integração Frontend/Backend

**Achado crítico**: A chamada de API no frontend (`src/lib/api.ts`) centraliza o sistema de organização ativa (linhas 36-50) usando uma variável global mutável (`_activeOrganizationId`). Isso é frágil em cenários concorrentes e não usa o context do React, podendo causar inconsistências.

## 7. Estado do Backend

### 7.1 Arquitetura

**Positivo:**
- Separação clara entre API routes (69 arquivos em `server/api/`) e serviços (39 arquivos em `server/services/`)
- Sistema de middleware para auth, tenant, rate-limit e CORS
- AsyncLocalStorage para tenant context (BYOB)
- Tratamento global de erros com códigos específicos (23505, 23503, entity.too.large)

**Problemas:**

1. **AIAutomation.js** — 2022 linhas, faz de tudo: processamento de mensagens, decisão de agente, integração com canais. Um arquivo para um domínio crítico inteiro. Fonte: `server/lib/AIAutomation.js:1-2022`.

2. **fluowaiMigrationService.js** — 1714 linhas, responsável por migração entre clouds. Complexidade extrema. Fonte: `server/services/fluowaiMigrationService.js`.

3. **admin.js route** — 1450 linhas, rota administrativa monolítica com toda lógica de superadmin. Fonte: `server/routes/admin.js`.

4. **Sem versionamento de API** — todas as rotas sob `/api/` sem prefixo de versão (`/api/v1/`).

5. **Sem interface OpenAPI/Swagger** — documentação zero dos contratos da API.

6. **Rotas legadas coexistem**: `routes/zap.js` (WhatsApp legado), `routes/jarvis.js`, `routes/wootechAi.js` permanecem ativas no servidor.

### 7.2 20 Maiores Arquivos do Backend

| Arquivo | Linhas | Domínio |
|---|---|---|
| `lib/AIAutomation.js` | 2022 | Automação IA |
| `services/fluowaiMigrationService.js` | 1714 | Migração cloud |
| `routes/admin.js` | 1450 | Admin/SuperAdmin |
| `services/storageIntelligenceService.js` | 1102 | Storage |
| `api/quiz/index.js` | 909 | Quiz |
| `services/leadPropertyMatcher.js` | 894 | Matching leads |
| `middleware/auth.js` | 877 | Autenticação |
| `api/rural/enrichment.routes.js` | 797 | Rural enrichment |
| `lib/minio-storage.js` | 789 | Storage MinIO |
| `routes/public.js` | 778 | Rotas públicas |
| `services/oruloService.js` | 773 | Portal Orulo |
| `api/fluowai-migration/index.js` | 724 | Migração cloud |
| `services/farmValuationService.js` | 715 | Valuation rural |
| `services/email/emailService.js` | 698 | Email |
| `api/whatsapp/index.js` | 690 | WhatsApp |
| `api/cobranca/index.js` | 677 | Cobrança |
| `api/sites/index.js` | 588 | Sites |
| `api/orulo/index.js` | 575 | Orulo |
| `index.js` | 563 | Servidor principal |
| `domainService.js` | 551 | Domínios/DNS |

### 7.3 Inventário de Rotas de API

**69 arquivos de rota** em `server/api/` + **15 arquivos de rota legados** em `server/routes/`.

Domínios com mais rotas:
- Locação: 10 arquivos de rota
- CRM: 6 arquivos de rota
- AI: 4 arquivos de rota
- Rural: 8 arquivos de rota
- Campanhas: 4 arquivos de rota

Risco: Rotas legadas como `routes/zap.js` (WhatsApp Baileys) permanecem ativas mesmo com o novo serviço Go. Isso pode gerar duplicidade de processamento.

## 8. Banco de Dados e Multi-Tenancy

### 8.1 Estrutura

- **99 tabelas** no schema completo
- **67 migrações SQL** numeradas por data
- **16 tabelas do whatsmeow** (biblioteca Go para WhatsApp)
- **2 schemas legados**: PascalCase (`"User"`, `"Organization"`, `"Plan"`, `"AccessProfile"`) vs lowercase moderno
- **PostGIS habilitado** para dados geoespaciais
- **0 índices no schema base** (todos em migrações separadas)
- **7 RLS policies no schema base** (mais em migrações)
- **3 views** definidas no schema

### 8.2 Multi-tenancy

**Como funciona:**
- `organizations` é a entidade tenant principal
- Quase todas as tabelas têm `organization_id` (exceto tabelas do whatsmeow que usam `tenant_id`)
- Middleware `requireTenant` em `server/middleware/tenant.js` previne spoofing de `organization_id` no body da requisição
- Auth middleware resolve `req.orgId` a partir do perfil do usuário
- BYOB (Bring Your Own Backend) permite tenants terem seus próprios projetos Supabase
- AsyncLocalStorage para contexto de tenant em requisições BYOB

**Problemas de isolamento:**

1. **RLS no schema base é insuficiente**: Apenas 7 políticas RLS no schema completo. Muitas tabelas confiam exclusivamente no middleware do backend para filtrar por `organization_id`.

2. **Tabelas sem tenant**: `saas_settings`, `plans`, `market_indicators`, `ibge_municipios`, `external_data_cache` não têm `organization_id` — algumas intencionalmente (dados globais), outras por omissão.

3. **Vazamento potencial via RLS de superadmin**: As políticas para resellers em `organizations` (arquivo FULL_DATABASE_SCHEMA.sql linhas 1768-1821) permitem que um reseller veja sub-organizações por `parent_id`. Se mal configurado, pode expor dados de organizações não relacionadas.

4. **Duas nomenclaturas**: `organization_id` e `tenant_id` são usados alternadamente. Tabelas modernas usam `tenant_id` (ex: `agent_channels`, `whatsapp_instances`, `storage_objects`), enquanto o schema legado usa `organization_id`. Isso causa confusão e possível falha de isolamento.

5. **Middleware confia no perfil do usuário**: O orgId vem de `req.user.organization_id` no profile. Se a RLS ou a consulta de profile falhar, o `recoverTenantFromAuthenticatedUser` em `server/middleware/tenant.js:115-167` faz fallback por email — uma abordagem frágil que pode resolver org errado se houver emails duplicados entre organizações.

### 8.3 Tabelas que Precisam de Atenção

| Tabela | Problema | Risco |
|---|---|---|
| `"User"`, `"Organization"`, `"Plan"`, `"AccessProfile"` | PascalCase, schema legado. Podem conter dados órfãos | Migração incompleta |
| `instances`, `contacts`, `messages` | Schema legado de WhatsApp (Baileys) que foi substituído pelo whatsmeow | Abandonado, mas dados existem |
| `billing` vs `billings` | Duas tabelas de cobrança com nomes similares e estruturas diferentes | Duplicidade |
| `rental_contracts` vs `leases` | Duas entidades de locação: uma antiga (rental_contracts) e uma nova (leases) que cobre o mesmo domínio com mais campos | Migração incompleta |
| `whatsmeow_*` (16 tabelas) | Gerenciadas pelo Go service, não pelo backend Node.js. Algumas com dados sensíveis (chaves criptográficas) | Exposição de chaves |

### 8.4 Decisão sobre Reaproveitamento do Schema

| Grupo de Domínio | Decisão | Motivo |
|---|---|---|
| `organizations`, `profiles` | Manter | Núcleo do multi-tenancy, dados reais |
| `properties`, `leads`, `clients` | Manter | Dados operacionais com relacionamentos complexos |
| `whatsapp_*` (moderno) | Manter | Schema maduro, usado pelo Go service |
| `whatsmeow_*` | Manter como está | Gerenciado pelo Go service, lib externa |
| `leases`, `rental_contracts` | Fundir em `leases` | Redundância, migrar dados |
| `billing`, `billings` | Fundir | Nomenclatura confusa, dados duplicados |
| `"User"`, `"Organization"` (PascalCase) | Migrar e dropar | Legado, risco de dados órfãos |
| `instances`, `contacts`, `messages` | Abandonar (dados mantidos para histórico) | Substituído pelo whatsmeow |
| `migration_*` (6 tabelas) | Manter durante transição | Necessário para migração cloud |
| `storage_*`, `email_*`, `documents_*` | Manter | Funcionalidades recentes, schema sólido |
| `ai_agents`, `agent_*` | Manter | Diferencial competitivo |

## 9. Segurança

### 9.1 Autenticação

| Achado | Gravidade | Evidência | Impacto | Correção |
|---|---|---|---|---|
| Secrets expostos (a rotacionar) | **Crítica** | DEV/HANDOFF.md: "rotacionar todos os segredos previamente expostos" | Comprometimento total se segredos forem usados indevidamente | Rotacionar IMEDIATAMENTE todas as chaves |
| user_metadata podia elevar privilégio (CORRIGIDO) | Alta (antes) / **Informativo** (agora) | DEV/WORKLOG.md: "user_metadata deixou de poder elevar privilégio" | Foi corrigido na Onda 0 | Já aplicado |
| Impersonação por header bruto (CORRIGIDO) | Alta (antes) / **Informativo** (agora) | DEV/WORKLOG.md | Foi substituído por sessão com hash | Já aplicado |
| CI continua com erro em lint e type-check | **Média** | `.github/workflows/ci.yml` linhas 26 e 29 (`continue-on-error: true`) | Erros de tipo e lint não quebram CI, permitindo código de baixa qualidade | Remover `continue-on-error` e fixar erros |

### 9.2 Autorização e Isolamento

| Achado | Gravidade | Evidência | Impacto | Correção |
|---|---|---|---|---|
| Middleware detecta spoofing de orgId | **Informativo** | `server/middleware/tenant.js:61-75` | Proteção ativa contra manipulação de tenant | Monitorar logs |
| Fallback por email no recoverTenant | **Média** | `server/middleware/tenant.js:135-157` | Email pode resolver organização errada | Remover fallback por email |
| Duas nomenclaturas tenant_id/organization_id | **Média** | Uso alternado entre tabelas | Pode causar falha de isolamento em consultas | Padronizar para `organization_id` |

### 9.3 Entradas e APIs

| Achado | Gravidade | Evidência | Impacto | Correção |
|---|---|---|---|---|
| Payload limit 10MB | **Informativo** | `server/index.js:222` | Proteção ativa | OK |
| Rate limiting global | **Informativo** | `server/index.js:215-221` | Proteção ativa | OK |
| Helmet CSP em produção | **Informativo** | `server/index.js:146-193` | Proteção ativa | OK |
| CORS dinâmico | **Informativo** | `server/lib/cors-config.js` | Proteção ativa | OK |
| sanitize-html disponível | **Informativo** | `package.json:80` | Disponível mas não verificado se usado em todos os pontos | Auditar uso |

### 9.4 Chaves e Segredos

| Achado | Gravidade | Evidência | Impacto | Correção |
|---|---|---|---|---|
| Múltiplas chaves de IA no .env (OpenAI, Gemini, Groq) | **Média** | `docker-compose.yml` linhas 48-50, 99-101 | Se expostas, uso indevido com custos | Rotação periódica |
| Chave JWT do Supabase exposta | **Alta** | HANDOFF.md confirma exposição prévia | Pode forjar tokens | Já deve ter sido rotacionada |
| Credenciais MinIO no env | **Média** | `docker-compose.yml` linhas 57-62 | Acesso a mídias de todos os tenants | Rotação periódica |
| WHATSAPP_INTERNAL_TOKEN para comunicação entre serviços | **Informativo** | `docker-compose.yml:52-53` | Protegido por env var | OK |

## 10. Integrações e WhatsApp

### 10.1 WhatsApp

**Estado: CRÍTICO para o negócio — DIFERENCIAL COMPETITIVO**

O serviço WhatsApp em Go (`whatsapp-service/`) é o componente mais sofisticado do sistema:

- **Biblioteca**: `whatsmeow` (biblioteca oficial não-oficial do WhatsApp Web Multi-Device)
- **88+ arquivos Go** incluindo suporte a VoIP completo (chamadas de voz)
- **Pipeline de mídia**: download, processamento, armazenamento em MinIO
- **Automação IA**: integração com AIAutomationEngine para respostas automáticas
- **WebSocket hub** para comunicação em tempo real com o frontend
- **Testes unitários**: `client_qr_test.go`, `events_test.go`, `instances_test.go`, `normalize_test.go`, `config_test.go`
- **Histórico**: importa histórico de conversas

**Problema**: `server/api/whatsapp/providers/` está **vazio** (diretório sem arquivos). A abstração de providers foi planejada mas não implementada.

**WhatsApp legado**: `server/routes/zap.js` e `server/api/crm/whatsapp.routes.js` ainda existem e podem estar ativos. O schema legado (`instances`, `contacts`, `messages`) coexiste com o moderno (`whatsapp_instances`, `whatsapp_contacts`, `whatsapp_messages`).

### 10.2 Portais Imobiliários

| Integração | Uso | Criticidade | Acoplamento | Segurança | Reaproveitável? |
|---|---|---|---|---|---|
| Orulo | Catalogação + credenciais globais | Média | Médio (api/orulo/) | Médio | Sim |
| Zap/Webmotors | Exportação de imóveis | Média | Médio (services/zapService.js) | Baixo | Sim, com refatoração |
| VivaReal | Exportação de imóveis | Baixa | Médio (services/vivarealService.js) | Baixo | Sim, com refatoração |
| Sienge | Integração construtora | Baixa | Alto (services/siengeService.js) | Baixo | Precisa revisão |

### 10.3 Demais Integrações

| Integração | Uso | Criticidade | Acoplamento | Segurança | Reaproveitável? |
|---|---|---|---|---|---|
| SICAR/CAR | Dados cadastrais rurais | Alta | Alto | Público | Sim |
| IBGE (Sidra) | Dados censitários | Média | Médio | Público | Sim |
| MapBiomas/TerraBrasilis | Dados ambientais | Média | Baixo | Público | Sim |
| Ibama/ConectaGov | Embargos ambientais | Média | Médio | Público | Sim |
| ONR | Registro de imóveis | Baixa | Médio | Público | Sim |
| Asaas | Cobrança | Alta | Médio | **Crítico** | Precisa revisão |
| Email (IMAP/SMTP) | Email Center | Alta | Médio | **Senhas criptografadas** | Sim |
| Serper | Campanhas | Baixa | Baixo | API Key | Sim |
| Resend | Email transacional | Baixa | Baixo | API Key | Sim |

## 11. Inteligência Artificial e Automações

### 11.1 IA

**Provedores**: OpenAI, Gemini (principal), Groq (alternativa)

**O que existe:**
- `AIAutomation.js`: motor de automação de IA para WhatsApp (2022 linhas) — funcional, mas monolítico
- `services/ai/agentOrchestrator.js`: orquestrador de agentes de IA
- `services/ai/ttsService.js`: texto-para-fala
- `views/AIAgents.tsx`: interface completa de configuração de agentes com canais, permissões, gatilhos, handoff (2296 linhas)
- `views/AIAssistant.tsx`: assistente conversacional
- Python AI Worker: STT (transcrição), TTS, Kanban analysis, Ollama client
- Schema completo de agentes (9 tabelas): `ai_agents`, `agent_channels`, `agent_triggers`, `agent_permissions`, `agent_pipelines`, `agent_knowledge_sources`, `agent_handoff_rules`, `agent_metrics_config`, `agent_execution_logs`

**Problemas:**
1. `AIAutomation.js` é monolítico (2022 linhas) — mistura processamento de mensagens, decisão, integração com múltiplos provedores
2. Dados pessoais podem ser enviados para provedores de IA (Gemini, OpenAI) — risco LGPD
3. Sem validação visível de saídas de IA (structured output)
4. Custos de IA não são controlados por tenant

### 11.2 Automações

- Sistema de agentes com modos Copiloto humano ou Autônomo
- `autonomy_level` de 1 a 5
- Gatilhos por tipo: `agent_triggers` tabela
- Handoff rules: `agent_handoff_rules`
- Execução logada: `agent_execution_logs`
- **Sem evidência de prevenção de loops** ou controle de execução por tenant

## 12. Testes, Infraestrutura e Observabilidade

### 12.1 Testes

| Tipo | Quantidade | Estado |
|---|---|---|
| Testes unitários (Vitest) | 177 arquivos .test.ts* | Funciona (`npm run test`) |
| Testes E2E (Playwright) | 14 arquivos | Funciona |
| Testes Go (whatsapp-service) | 5 arquivos | Passam no CI |
| Testes de integração API | **0** arquivos | **CRÍTICO** |
| Testes de segurança | 0 específicos | Inexistente |
| Cobertura | Não configurada | Inexistente |

**Problemas:**
- `server/__tests__/` está vazio (0 arquivos)
- CI roda lint e type-check com `continue-on-error: true`
- Não há testes de multi-tenancy
- Não há testes de integração para as APIs de negócio

### 12.2 Infraestrutura

| Componente | Tecnologia | Estado |
|---|---|---|
| Container runtime | Docker + Docker Compose + Swarm | Ativo |
| Orquestração | Portainer (stacks .yml) | Ativo |
| Reverse proxy | Traefik com Let's Encrypt | Ativo |
| Storage de mídia | MinIO | Ativo |
| Message queue | RabbitMQ 3.13 | Ativo |
| CI/CD | GitHub Actions (2 workflows) | Ativo |
| Registro de imagens | GHCR (ghcr.io/fluowai) | Ativo |
| Imagens Docker | 5 Dockerfiles | **Problemas de segurança** |

**Problemas:**
1. **Dockerfiles usam node:20 (full)** em vez de variantes slim/alpine — imagens grandes
2. **Não há health checks** nos Dockerfiles do frontend e api
3. **Dependência de ações manuais**: deploy em produção parece semi-manual (Portainer stacks com SHA fixo)
4. **Ponto único de falha**: serviço api depende de Supabase externo, MinIO, RabbitMQ e WhatsApp service

### 12.3 Observabilidade

| Aspecto | Presente | Observação |
|---|---|---|
| Logs estruturados | Não | `console.log`, `console.error` espalhados |
| Correlação de requisições | Não | Sem trace ID |
| Métricas | Não | Não há Prometheus ou similar |
| Error tracking | Não | Sem Sentry ou similar |
| Audit logging | Parcial | `api_audit_logs`, `impersonation_sessions`, `agent_execution_logs` |
| Health check | Sim | `/health` endpoint |
| Server-Timing headers | Sim | Headers com duração e memória |

## 13. LGPD e Proteção de Dados

### Riscos Identificados

| Risco | Gravidade | Evidência |
|---|---|---|
| Dados de leads enviados para IA externa | **Alta** | `AIAutomation.js` envia mensagens para Gemini/OpenAI sem anonimização visível |
| Senhas de email criptografadas mas descriptografáveis | **Média** | `email_accounts.encrypted_password` — depende da chave de criptografia |
| Dados financeiros em `clients`, `leases`, `billing` | **Média** | Renda, score de crédito, dados bancários |
| Dados pessoais em `whatsapp_messages.content` | **Alta** | Mensagens completas armazenadas sem expiração |
| Logs com dados pessoais | **Média** | `console.error` com emails, userIds |
| Exclusão lógica inconsistente | **Média** | `storage_objects.deleted_at` existe, mas outras tabelas não têm soft delete |
| Consentimento de leads | **Não verificado** | Não foi encontrado rastro de registro de consentimento |
| Compartilhamento com provedores dos EUA | **Alta** | OpenAI, Gemini, Groq — todos servidores estrangeiros |

## 14. Dívida Técnica e Métricas

### Métricas Coletadas

| Métrica | Valor |
|---|---|
| Total de arquivos JS/TS/TSX | ~2272 |
| TSX (componentes React) | 359 |
| TS (lógica/types) | ~1767 |
| JS (server) | 146 |
| SQL (migrations + schema) | 167 |
| Tabelas no banco | 99 |
| Migrações SQL | 67 |
| Arquivos de rota API | 69 + 15 legados |
| Serviços backend | 39 |
| Arquivos Go (WhatsApp) | 88+ |
| Dockerfiles | 5 |
| CI workflows | 2 |
| TODO/FIXME/HACK no source | 59 |
| Maior arquivo frontend | 6085 linhas (database.types.ts) |
| Maior arquivo server | 2022 linhas (AIAutomation.js) |
| Testes unitários (Vitest) | ~177 arquivos |
| Testes E2E | 14 |
| Testes de integração API | 0 |

### Dívida Técnica Identificada

1. **Código duplicado**: `types/database.types.ts` duplicado na raiz e `src/types/`
2. **Código morto**: WhatsApp legado (Baileys), PascalCase tables, `routes/jarvis.js`, `routes/wootechAi.js`
3. **Bibliotecas duplicadas**: `@dnd-kit` + `@hello-pangea/dnd`
4. **Arquivos monolíticos**: 8 arquivos acima de 1000 linhas
5. **Sem versionamento de API**: Todas as rotas sob `/api/` sem prefixo
6. **Sem documentação de API**: OpenAPI/Swagger ausente
7. **Sem testes de integração**: 0 arquivos em `server/__tests__/`
8. **CI com continue-on-error**: Qualidade não é imposta
9. **59 marcadores TODO/FIXME/HACK** no código fonte
10. **Console.log espalhado**: Sem logger estruturado (embora `utils/logger.ts` exista, não é usado no backend Node.js)

## 15. Mapa das Funcionalidades

### Por Nicho

**Rural:**
- Dashboard rural, BI Rural, Cadastro Técnico, Territory Hub
- GeoInteligência, Dossiê Inteligente, Due Diligence
- Valuation Rural, Portal Proprietário/Comprador
- CAR Location Search, Matchmaking 360
- Integrações: SICAR, MapBiomas, TerraBrasilis, Ibama, ONR

**Urbano:**
- Dashboard urbano, BI Urbano, Empreendimentos, Loteamentos
- Locação (leases + rental_contracts), Bordero, Repasse Kanban
- Financial Hub (UI only), Clube Imobzy (UI only)
- Contratos, Data Room, Portal do Proprietário

**Transversal:**
- CRM (Leads, Kanban, Clientes, Agenda)
- Imóveis (gestão + editor)
- WhatsApp (Go service + dashboard)
- IA (Agentes, Assistente, Automação)
- Sites e Landing Pages (editor + gerenciador)
- Quiz/Campanhas
- Email Center
- Assinaturas e Planos
- Admin, Super Admin, Mega Admin

## 16. O que Deve Ser Mantido, Refatorado ou Eliminado

### Manter (preservar como estão ou com mínimas alterações)

| Elemento | Motivo |
|---|---|
| WhatsApp Go Service | Diferencial competitivo, sophisticated, VoIP, media pipeline |
| Schema do whatsmeow (16 tabelas) | Gerenciado pela lib, não tocar |
| Tabelas operacionais: properties, leads, clients | Dados reais, schema maduro |
| Tabelas de agentes de IA | Diferencial, schema completo |
| Quiz campaigns | Funcionalidade completa |
| Orulo integration | API real, funcional |
| Infra Traefik + Portainer | Funciona em produção |

### Refatorar

| Elemento | O que fazer |
|---|---|
| AIAutomation.js (2022 linhas) | Decompor em módulos: orchestrator, providers, handlers |
| auth.js middleware (877 linhas) | Separar validação de token, resolução de perfil, resolução de org |
| PropertyEditor.tsx (2200 linhas) | Componentizar por seção |
| AIAgents.tsx (2296 linhas) | Componentizar por funcionalidade |
| admin.js route (1450 linhas) | Separar em módulos por domínio |
| fluowaiMigrationService.js (1714 linhas) | Extrair etapas em módulos |

### Reescrever

| Elemento | Motivo |
|---|---|
| Rotas legadas (zap.js, jarvis.js, wootechAi.js) | Substituídas ou obsoletas |
| Node.js WhatsApp handlers | Já substituídos pelo Go service |
| FinancialHub e ClubeImobzy backend | UI existe, backend não |
| Landing page templates no frontend | Mover para backend ou CDN |

### Eliminar (após migração)

| Elemento | O que fazer |
|---|---|
| Tabelas PascalCase | Migrar dados e dropar |
| @dnd-kit | Padronizar para @hello-pangea/dnd |
| WhatsApp schema legado (instances, contacts, messages) | Arquivar dados e dropar |
| rental_contracts | Migrar para leases |
| billing duplicada | Fundir com billings |
| WhatsApp Node.js routes | Remover |

## 17. Comparação das Três Estratégias

### Estratégia A — Continuar e Refatorar

**Prós:**
- Menor risco imediato
- Clientes existentes não são impactados
- Entrega contínua de funcionalidades
- Preserva todo o investimento atual

**Contras:**
- Dívida técnica se acumula
- Dados órfãos (PascalCase, Baileys) permanecem
- Arquivos monolíticos permanecem
- Custo operacional cresce
- Risco de regressão é alto sem testes de integração
- Qualidade continuará comprometida sem refatoração estrutural

### Estratégia B — Reconstrução Híbrida (Strangler Fig) ✅

**Prós:**
- Preserva WhatsApp service, schema, integrações funcionais
- Permite refatoração profunda sem parar o sistema
- Substitui progressivamente o que está degradado
- Risco gerenciável por módulo
- Dados não precisam ser migrados de uma vez
- Pode manter clientes em produção durante a transição

**Contras:**
- Complexidade de manter dois sistemas durante transição
- Sincronização de dados entre módulos
- Requer disciplina para não continuar acumulando dívida

### Estratégia C — Criar Tudo do Zero

**Prós:**
- Arquitetura limpa sem dívida técnica
- Pode escolher tecnologias sem restrições
- Sem legado para manter

**Contras:**
- Perde o WhatsApp Go service (milhares de horas de desenvolvimento)
- Perde 67 migrações de schema
- Precisa reimplementar 40+ integrações
- Precisa migrar 99 tabelas de dados reais
- Risco altíssimo de regressão
- 12-24 meses para atingir paridade
- Clientes existentes seriam impactados
- Custo altíssimo
- Pode repetir erros do sistema atual

## 18. Matriz de Decisão Ponderada

| Critério | Peso | Refatorar | Híbrida | Do Zero |
|---|---|---|---|---|
| Segurança | 20% | 4 (0.8) | **8** (1.6) | 9 (1.8) |
| Velocidade até valor real | 15% | **8** (1.2) | 6 (0.9) | 2 (0.3) |
| Risco de regressão | 10% | 5 (0.5) | **8** (0.8) | 3 (0.3) |
| Escalabilidade | 10% | 3 (0.3) | **7** (0.7) | 9 (0.9) |
| Manutenibilidade | 15% | 3 (0.45) | **7** (1.05) | 9 (1.35) |
| Preservação regras negócio | 10% | **9** (0.9) | **9** (0.9) | 3 (0.3) |
| Migração de dados | 10% | **10** (1.0) | 7 (0.7) | 4 (0.4) |
| Custo operacional | 5% | 4 (0.2) | **6** (0.3) | 5 (0.25) |
| Experiência do usuário | 5% | 4 (0.2) | **7** (0.35) | 9 (0.45) |

**Total ponderado:**
- **Estratégia A (Refatorar):** 5.55
- **Estratégia B (Híbrida):** 7.30 ✅
- **Estratégia C (Do Zero):** 6.05

## 19. Arquitetura Recomendada

### Monólito Modular (não microserviços)

A arquitetura atual já é um monólito modular com serviços satélite. A recomendação é **manter esse padrão** e refiná-lo:

```
┌─────────────────────────────────────────────────────┐
│                    Frontend SPA                       │
│           React 19 + Vite + Tailwind CSS              │
│       (Chunks: react, charts, maps, supabase)         │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/WS
┌──────────────────────▼──────────────────────────────┐
│               Backend (Express 5 Node.js)              │
│                                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Identity  │ │ Properties│ │   CRM    │ │  Sites   │  │
│  │ & Auth    │ │ & Imóveis │ │Leads/Cont│ │LandPages │  │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤  │
│  │ Rural    │ │  Urban   │ │  Locação  │ │ Vendas   │  │
│  │ Módulos  │ │  Módulos │ │ (Leases)  │ │ Planos   │  │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤  │
│  │ IA/Agents│ │ WhatsApp │ │  Portais  │ │ Admin    │  │
│  │Orchestrat│ │  Proxy   │ │ Orulo/Zap │ │ MegaAdmin│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Shared Infrastructure Layer              │  │
│  │  Auth Middleware | Tenant Middleware | RLS Base    │  │
│  │  Rate Limiter | CORS | Error Handler | Audit       │  │
│  └──────────────────────────────────────────────────┘  │
└──────┬──────────────────────┬──────────────────────────┘
       │                      │
┌──────▼──────┐     ┌─────────▼──────────┐
│ Supabase    │     │ MinIO (Storage)     │
│ (PostgreSQL) │     │ Object Store       │
│ Auth + DB   │     │                    │
└─────────────┘     └────────────────────┘
       │                      │
┌──────▼──────────────────────▼────────────────────────┐
│                  Message Queue (RabbitMQ)              │
└──────┬──────────────────────┬────────────────────────┘
       │                      │
┌──────▼──────┐     ┌─────────▼──────────┐
│ WhatsApp    │     │ Workers (Python)    │
│ Go Service  │     │ AI, Document,      │
│ (whatsmeow) │     │ Instagram          │
│ VoIP+Media  │     │                    │
└─────────────┘     └────────────────────┘
```

### Domínios Confirmados (baseado na auditoria)

1. **Identidade e Autenticação** — `profiles`, `auth.users`, org resolution
2. **Organizações e Multi-tenancy** — `organizations`, reseller hierarchy
3. **Usuários e Perfis** — `profiles`, roles, permissões
4. **Imóveis** — `properties`, `property_polygons`, `price_history`
5. **Leads/Contatos/Clientes** — `leads`, `clients`, `contacts`
6. **CRM e Funil** — kanban, stages, `lead_activities`, `lead_followups`
7. **WhatsApp** — Go service, `whatsapp_messages`, media pipeline
8. **IA e Agentes** — `ai_agents`, agent tables, automation engine
9. **Sites e Landing Pages** — `landing_pages`, `site_settings`, `domains`
10. **Locação** — `leases`, `rental_contracts` (fundir)
11. **Rural** — analysis, enrichment, CAR, valuation
12. **Urbano** — developments, lots, blocks
13. **Portais** — Orulo, Zap, VivaReal
14. **Email** — `email_accounts`, `emails`, IMAP/SMTP
15. **Cobrança** — `billings`, Asaas integration, subscription
16. **Admin/Mega Admin** — administration, migration tools
17. **Quiz/Campanhas** — `quiz_campaigns`, `quiz_submissions`
18. **Auditoria** — `api_audit_logs`, `impersonation_sessions`, `agent_execution_logs`

## 20. Estratégia de Migração

A migração híbrida segue o padrão Strangler Fig (Figueira Estranguladora):

### Fase 0 — Preparação (72h)
1. **Rotacionar segredos** urgentemente (ação já identificada como pendente)
2. **Aplicar migration de impersonação** pendente (`20260728_harden_impersonation_sessions.sql`)
3. **Remover `continue-on-error: true`** do CI e fixar erros
4. **Congelar novas funcionalidades** durante a transição

### Fase 1 — Fundação (30 dias)
1. **Extrair AIAutomation.js** em módulos
2. **Criar testes de integração** para as 20 principais rotas
3. **Remover código morto**: rotas legadas, PascalCase tables (dados preservados)
4. **Padronizar nomenclatura** tenant_id → organization_id
5. **Adicionar versionamento de API** (`/api/v1/`, `/api/v2/`)
6. **Health checks** nos Dockerfiles

### Fase 2 — Módulos Core (30-90 dias)
1. **Refatorar frontend** — componentizar PropertyEditor, AIAgents, TemplateCustomizer
2. **Fundir schemas duplicados**: `rental_contracts` → `leases`, `billing` → `billings`
3. **Criar testes E2E** para todos os painéis (Urbano, Rural, Super Admin, Mega Admin)
4. **Implementar backend do FinancialHub e Clube Imobzy**
5. **Padronizar logger** — remover console.log, usar logger estruturado

### Fase 3 — Qualidade (90-180 dias)
1. **Implementar observabilidade** — tracing, métricas, error tracking
2. **Cobertura de testes** > 60%
3. **RLS em todas as tabelas** — auditoria de políticas
4. **LGPD** — consentimento, expiração de dados, portabilidade
5. **Documentação OpenAPI** para todas as rotas

### Fase 4 — Otimização (180+ dias)
1. **Landing page templates para backend/CDN**
2. **Cache de camada** Redis/CDN
3. **Performance** — análise de bundle, lazy loading refino, code splitting por domínio
4. **Infraestrutura** — Kubernetes ou Swarm otimizado

## 21. Plano de Ação

### Primeiras 72 Horas

| Ação | Prioridade | Responsável | Critério de Aceite |
|---|---|---|---|
| Rotacionar todos os segredos (Supabase, OpenAI, Gemini, MinIO, WhatsApp tokens) | **Crítica** | Operações | Secrets antigos invalidados, novos em uso |
| Aplicar migration 20260728_harden_impersonation_sessions.sql | **Crítica** | Dev | Impersonação protegida |
| Verificar backups do banco | **Crítica** | Operações | Backup recente, restore testado |
| Remover continue-on-error:true do CI | **Alta** | Dev | CI falha quando lint/type-check falha |
| Revisar logs em busca de dados pessoais expostos | **Alta** | Dev/Security | Logs sem PII |
| Verificar se WhatsApp legado (Baileys) está ativo | **Alta** | Dev | Confirmar inativo ou remover |

### Primeiros 30 Dias

| Entrega | Esforço | Dependências |
|---|---|---|
| Testes de integração das 20 principais rotas | Médio | Ambiente de homologação |
| Extração de AIAutomation.js em módulos | Médio | Nenhuma |
| Remoção de código morto (rotas legadas, PascalCase) | Pequeno | Backup dos dados |
| Padronização organization_id/tenant_id | Médio | Schema review |
| Versionamento de API v1 | Médio | Nenhuma |
| Remoção de @dnd-kit (manter @hello-pangea/dnd) | Pequeno | Verificar uso |

### 30-90 Dias

| Entrega | Esforço | Dependências |
|---|---|---|
| Componentização de PropertyEditor | Grande | Nenhuma |
| Componentização de AIAgents | Grande | Nenhuma |
| Fusão rental_contracts → leases | Médio | Migração de dados |
| Fusão billing → billings | Médio | Migração de dados |
| Backend do Financial Hub | Médio | Schema adicional |
| Testes E2E completos | Médio | Contas de homologação |
| Logger estruturado | Médio | Nenhuma |

### Estimativas por Equipe

| Cenário | 72h | 30d | 90d |
|---|---|---|---|
| 1 desenvolvedor | Sobrevivência | Fundação + 1 módulo core | 2-3 módulos core |
| Equipe pequena (2-3 devs) | Sobrevivência | Fundação + 2 módulos core | Core completo + testes |
| Equipe estruturada (4-6 devs) | Sobrevivência | Fundação + core completo | Qualidade + LGPD + observabilidade |

## 22. Riscos e Bloqueadores

### Riscos Imediatos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Secrets expostos já comprometidos | Média | **Crítico** | Rotação imediata + auditoria de acessos |
| Falha de isolamento entre tenants | Baixa | **Alto** | Auditoria de RLS + testes de isolamento |
| Perda de dados sem backup funcional | Baixa | **Crítico** | Verificar backup e restore |
| WhatsApp service parar de funcionar | Baixa | **Alto** | O Go service tem autotestes e reconexão |
| Custo de IA não controlado | Média | Médio | Implementar limites por tenant |

### Bloqueadores

1. **Ambiente de homologação não disponível** (confirmado em DEV/HANDOFF.md)
2. **Contas de teste segregadas não criadas** (impede testes E2E)
3. **Migration de impersonação não aplicada**
4. **Secrets não rotacionados**
5. **Zero testes de integração API** — qualquer refatoração tem alto risco de regressão

## 23. Perguntas que Ainda Precisam Ser Respondidas

1. **Quantos clientes/tenants ativos existem?** — Não foi possível verificar dados reais de produção.
2. **Qual o volume de dados por tenant?** — Impacta estratégia de migração.
3. **O WhatsApp Go service está em produção?** — Os arquivos de log `run_stderr.txt` e `run_stdout.txt` sugerem que foi executado.
4. **Qual provedor de IA é mais usado?** — OpenAI, Gemini ou Groq? Impacta custos.
5. **O Agro Intelligence está rodando?** — Dockerfile existe, mas não foi possível verificar uso real.
6. **Existem clientes usando o módulo rural?** — Schema robusto mas validação em produção necessária.
7. **O módulo de cobrança (Asaas) está processando pagamentos reais?** — `server/services/asaasService.js` existe, mas não foi auditado.
8. **Qual o prazo contratual dos clientes atuais?** — Impacta janela de migração.

## 24. Conclusão

**Devemos realizar uma reconstrução híbrida da Imobzy.**

**Por que essa é a melhor opção:**
- O sistema tem valor real acumulado — WhatsApp service, schema de 99 tabelas, integrações maduras, 67 migrações
- Recriar do zero perderia conhecimento e tomaria 12-24 meses para atingir paridade
- Continuar sem refatorar aprofundaria a dívida técnica e aumentaria o custo operacional
- A abordagem híbrida permite entregar valor continuamente enquanto substitui partes problemáticas

**Por que as outras opções não são as melhores:**
- **Refatorar apenas** — não resolve os problemas estruturais (código morto, schemas duplicados, arquivos monolíticos)
- **Do zero** — perde o que há de melhor no sistema (WhatsApp, schema, integrações) e arrisca repetir os mesmos erros

**Evidências decisivas:** WhatsApp Go service (88+ arquivos, VoIP, media pipeline), 99 tabelas, 67 migrações, 59 TODO/FIXME/HACK, 0 testes de integração, secrets expostos, 8 arquivos > 1000 linhas, PascalCase legado.

**Partes com valor a preservar:** WhatsApp Go service, schema de banco, integrações (Orulo, SICAR, CAR), sistema de agentes de IA, quiz campaigns, infra Traefik/Portainer, sistema multi-tenant com BYOB.

**Partes a não levar:** WhatsApp Baileys legado, PascalCase tables, @dnd-kit, rotas abandonadas (jarvis, wootechAi), interfaces sem backend (FinancialHub, ClubeImobzy).

**Riscos imediatos:** Secrets expostos (rotacionar urgente), isolamento entre tenants (auditar RLS), backup (verificar), migration de impersonação pendente.

**Custo de não fazer nada:** O custo operacional continuará crescendo, a dívida técnica se aprofundará, o risco de segurança permanece, e a capacidade de evoluir a plataforma será cada vez menor. A cada mês sem ação, o custo da reconstrução aumenta.
