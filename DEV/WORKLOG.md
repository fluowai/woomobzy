# DEV WORKLOG — Imobzy

## [2026-07-30] Rural UX batch: ações navegáveis + cadastro técnico + due diligence

- `views/RuralDashboard.tsx`: quick actions agora navegam para rotas reais (`/rural/territorio/due-diligence`, `/rural/portal-comprador`, `/rural/properties/new`) em vez de toast "em breve"; botão "Nova Captação" navega para `/rural/properties/new`.
- `views/rural/FinanceiroRural.tsx`: "Ver Relatório Completo" navega para `/rural/reports`.
- `views/rural/CadastroTecnico.tsx`: modal de detalhes técnicos (localização, áreas, bioma, solo, regime hídrico, topografia, aptidão, score de liquidez, CAR, georreferenciamento, status, arquivo de origem) + exclusão real de propriedade via `propertyService.delete` com `confirm` e estado `deletingId`.
- `views/rural/DossieInteligente.tsx`: "Gerar Minuta de Venda" agora exige due diligence aprovada (riskScore >= 80) antes de gerar/download do dossiê.
- `views/rural/DueDiligence.tsx`: upload de documento por item do checklist via `/api/documents/upload/:id` (máx 20MB, spinner `Loader2`, link para abrir anexo, refresh da lista de documentos).
- Gates: type-check ✓; lint 0 erros (4 avisos preexistentes, nenhum no diff); build ✓ (4.063 módulos, PWA 237 entries).
- Nenhum push/deploy.

## [2026-07-30] Execução das 6 migrations pendentes em produção

- Runner novo `scratch/run_migrations_20260730.mjs` (splitter SQL com dollar-quoting/comentários/aspas; executa via RPC `exec_sql` statement a statement; regex IGNORE para idempotência; flag `--dry`; relatório ok/ignorados/falhas; exit 1 em falha). Dry run: 169 statements listados.
- Executado em produção (`epgaftsjmqmpczvzsrcc.supabase.co`): **169/169 statements OK, 0 falhas, 0 ignorados**:
  - `20260730_fix_landing_pages_public_access.sql` (5), `20260730_fix_landing_pages_rls_definitive.sql` (9), `20260730_fix_condominium_tickets_missing_table.sql` (7), `20260730_fix_all_production_errors.sql` (50), `20260730_consolidated_production_fix.sql` (95), `20260730_214115_fix_plans_rls_insert.sql` (3).
- Verificação pós-migração via `pg` direto (`scratch/verify_20260730.mjs`), 14/14 checks OK: tabela `condominium_tickets`, `condominiums.status`, `rental_contracts.{tenant_name,property_id,monthly_rent}`, tabela `clients`, `lead_activities.lead_id`, funções `get_my_org_id`/`is_superadmin`/`handle_updated_at`, extensão `pgcrypto`, policy plans "Superadmin manage plans", policy landing_pages "Public read landing_pages". `contracts.title` confirmado **ausente** (gap LegalContracts segue válido).
- Nota: RPC `exec_sql` é `RETURNS void` (não devolve linhas) — verificação de schema exige conexão `pg` direta com `SUPABASE_DB_URL`.
- Pendente: commit do change set (guard files navegação + Cobranca + docs DEV); `scripts/run-migrations.mjs` (lista canônica) não inclui os `20260730_*` — batch foi ad-hoc.

## [2026-07-30] Resolução do v8 (BI RPCs + views billings/contracts)

- Probe em produção (`pg_class`/`information_schema`): `billing`, `billings`, `contracts` e `rental_contracts` existem como **TABELAS**; `get_bi_stats` (jsonb) e `get_bi_lead_sources` (table) existem. Statements #1/#2/#5 do `v8_fix_bi_rpcs_and_views.sql` já aplicados.
- As views `billings`/`contracts` (#3/#4) **não podem ser criadas**: os nomes já são tabelas reais (é o que o erro `"is not a view"` significava). Premissa da migration falsa: nenhum código consulta `/rest/v1/billings`; o app usa `billing` (server + PortalProprietarioUrbano).
- Bug real que o v8 tentava corrigir: `views/urban/Cobranca.tsx` consultava `contracts` com `tenant_name`/`value`/status `'Active'`, colunas que só existem em `rental_contracts` (status em minúsculo `'active'`). Corrigido: query passou a usar `rental_contracts` (`tenant_name`, `monthly_rent`, `property:property_id(title)`, `status='active'`), alinhado ao modal (já usava `c.monthly_rent`) e ao dashboard do server (`c.status === 'active'`).
- Gates: type-check ✓, lint 0 erros (593 avisos preexistentes), build ✓ (Vite 6.4.2, 4.063 módulos).
- Observação (fora do escopo, não tocado): `LegalContracts.tsx` (/urban/contracts e /rural/contracts) tem mismatch preexistente com a tabela `contracts` (`title`/`type`/`value`/`template_id` ausentes em produção).
- Pendente decisão do maestro: migrations `20260730_214115_fix_plans_rls_insert`, `20260730_fix_landing_pages_public_access`, `20260730_fix_landing_pages_rls_definitive`, `20260730_fix_condominium_tickets_missing_table`, `20260730_consolidated_production_fix` e `20260730_fix_all_production_errors` **não estão aplicadas** em produção (fora da lista executada).

## [2026-07-30] Fix: navegação "voltar" levava a usuários logados à página de vendas

- Causa raiz (rotas/guards):
  1. `MegaAdminGuard` redirecionava para `/` (página de vendas) qualquer superadmin impersonando ou usuário não-mega-admin; no modo suporte, o botão voltar para `/megaadmin` caía na página de vendas.
  2. `SystemSalesPage` (rotas `/`, `/vendas`, `/consultoria`) renderizava a página de vendas mesmo com usuário logado; como o histórico guarda `/` de antes do login, todo "voltar" dentro dos painéis (urbano/rural/super/mega) acabava nela.
  3. `ResellerManager` não navegava após `impersonateOrganization` — ficava em `/megaadmin` e o guard o expulsava para a página de vendas.
- Correções:
  - Novo helper `getPanelHomePath(profile, { isImpersonating })` em `components/NicheRedirect.tsx`, usado por `NicheRedirect`, `MegaAdminGuard`, `SuperAdminGuard` e `SystemSalesPage`. Roteia superadmin (mega/reseller), impersonação (painel da org), nicho (rural/urban), org ausente (`/onboarding`) e sem perfil (`/`).
  - `MegaAdminGuard` agora redireciona para o painel correto (nunca mais `/`).
  - `SuperAdminGuard` ganhou ramo para superadmin impersonando que acessa `/superadmin` ou `/megaadmin` → volta ao painel da org impersonada.
  - `SystemSalesPage` redireciona via `useEffect` (respeitando Rules of Hooks) usuários logados para o painel.
  - `ResellerManager` agora faz `window.location.href = '/admin'` após impersonar (padrão dos outros managers).
- Gates: type-check, eslint (0 erros) e build aprovados. Nenhum commit/push/deploy.
- Pendente: validar no navegador o fluxo "voltar" dentro de mega/super admin, aba imobiliária e modo suporte (impersonação).

## [2026-07-30] Fix 404 do Metas & Vendas Rurais (rural_financial_goals)

- Diagnóstico do erro `GET /rest/v1/rural_financial_goals ... 404`: a tabela existe em produção desde ~13/07 (OID 22204, logo após `global_templates`), mas o PostgREST estava com cache de schema desatualizado e respondia `relation not found`.
- Ação: `NOTIFY pgrst, 'reload schema'` enviado; a query exata (anon key) passou a retornar 200.
- Correção de bug real no código: `views/rural/FinanceiroRural.tsx` usava `month.toISOString().slice(0,10)` após `setDate(1)`, gerando `period_month=2026-07-02` em vez de `2026-07-01` quando o relógio local passa de ~21h (offset UTC-3). Substituído por composição local `getFullYear()`/`getMonth()` garantindo sempre `YYYY-MM-01`, tanto no load quanto no save.
- Gates: type-check e lint aprovados (0 erros). Nenhum commit/push/deploy; sem necessidade de nova migração (tabela já existe).

## [2026-07-30] Execução: port da sidebar colapsável (sanfona) para o Rural

- `components/RuralLayout.tsx` atualizado seguindo o padrão do `UrbanLayout` (commits `32354f3`/`3270e68`): estado `isDesktopSidebarOpen`, toggle `PanelLeftClose`/`PanelLeftOpen`, largura `w-[280px] ↔ w-[72px]` animada, labels/chevrons/títulos/logo/perfil/"Sair"/"Suporte" colapsáveis e auto-colapso ao navegar.
- Melhoria sobre o urbano: menu móvel usa `renderSidebarContent(true)`, mantendo labels visíveis no overlay (no urbano o overlay herda o estado colapsado).
- Ícone LogOut ajustado de 14 para 16 (paridade com urbano).
- Gates: type-check, eslint e build aprovados; prettier aplicado.
- Nenhum commit/push/deploy.

## [2026-07-30] Relatório de gap Urbano × Rural (sidebar sanfona)

- Analisado via git (commits `32354f3`, `080601a`, `3270e68`, `92a577d`) e comparação direta `UrbanLayout.tsx` × `RuralLayout.tsx`.
- Gap principal confirmado: menu lateral colapsável (sanfona) existe só no Urbano; `RuralLayout.tsx` nunca foi tocado pelos commits de sidebar.
- Gaps secundários: item de menu "Integrações" ausente no Rural (rota `/rural/integrations` já existe); "Clientes Unificado" só no Urbano.
- Sem gap em toasts/UX: views compartilhadas (WhatsAppDashboard, LegalContracts, PropertyManagement, RentalsManagement, IADashboardSummary, blocos de landing) já valem para os dois painéis; pares rurais (FinanceiroRural, Portais) já usam sonner.
- Relatório em `DEV/RELATORIO_GAP_URBANO_RURAL.md`. Nenhum código alterado; port da sidebar fica como próxima ação.

## [2026-07-30] Reforma da aba Agentes IA (views/AIAgents)

### Feito
- Substituído o dashboard monolítico (2.296 linhas) por view orquestradora thin (~460 linhas) + 9 componentes em `components/agents/`.
- Componentes novos: AgentAvatar, AgentStatusBadge, AgentFlowSteps, AgentPresetGrid (6 templates: Zya, Otto, Nexus, Max, Íris, Eco), AgentSidebar, AgentForm (5 seções colapsáveis no lugar do wizard de 7 abas), AgentDashboard (dados reais da API), AgentMetricsCard (cérebro neural + distribuição de notas), AgentChatTest (modos corretor/lead).
- Corrigidos: `TS2349` (handoffRules.map → handoffRuleOptions.map), `TS2322` (cast de handoff_rules), `TS2448` (loadAgents/loadMetrics em useCallback), imports não usados.
- Removido `components/AgentPremiumDashboard.tsx` (confirmado órfão via grep — nenhum import).
- Backend e services (`aiAgents.ts`) inalterados; frontend adaptado ao contrato existente.

### Pendente
- Testar a tela no navegador em `/urban/ai-agents` e `/rural/ai-agents` (requer dev server + autenticação).
- Validar fluxos: criar a partir de preset, salvar rascunho, publicar, editar, pausar/ativar, chat de teste.
- Considerar expor endpoints de memória/qualificação (hoje só `metrics` é consumido).

## [2026-07-28] Execução da auditoria funcional — Onda 0

### Inventário e infraestrutura

- Criada matriz gerada por AST em `DEV/TESTS/FUNCTIONAL_AUDIT_MATRIX.md`, cobrindo 143 rotas.
- Restauradas as rotas urbanas `/urban/fintech` e `/urban/clube`, que existiam no menu, mas não no roteador.
- Criada suíte E2E autenticada para Urbano, Rural, Super Admin e Mega Admin.
- O contrato E2E reprova explicitamente a execução sem credenciais, evitando falso resultado verde.

### Regressões corrigidas

- Corrigido overflow horizontal da página comercial e melhorada a acessibilidade do menu móvel.
- Corrigido bootstrap de tenant em loopback e resposta vazia de domínio personalizado.
- O papel persistido no banco passou a prevalecer sobre metadata de autenticação.
- `user_metadata` deixou de poder elevar privilégio ou vincular organização.
- A seleção de plano pago não ativa mais assinatura no navegador; registra `payment_required` no backend.
- Impersonação por header bruto foi substituída por sessão de 15 minutos, com motivo, hash do segredo, auditoria e revogação.
- O ID de `auth.users` passou a ser preservado separadamente do ID do perfil em cenários de drift.
- Literais sensíveis foram removidos dos arquivos versionados de configuração e bootstrap.

### Evidências

- revisão independente encontrou cinco defeitos no primeiro passe; todos foram corrigidos e aprovados no reteste;
- 10/10 testes públicos Playwright passaram em desktop e mobile;
- 8/8 bloqueios anônimos dos quatro painéis passaram;
- testes direcionados de autenticação, impersonação e assinatura passaram;
- type-check, build, lint sem erros e suíte Go passaram;
- nenhuma migration, rotação de segredo, commit, push ou deploy foi executado.

### Bloqueios externos

1. Rotacionar segredos previamente expostos e invalidar tokens/sessões antigos.
2. Fornecer contas de homologação para os quatro perfis.
3. Disponibilizar duas organizações por nicho e acesso controlado ao banco para validar RLS.
4. Aplicar e testar a migration de impersonação em homologação.

## [2026-07-28] Planejamento da auditoria funcional e de regressões

### Diagnóstico

- O sistema possui inventário funcional amplo e 120 tags de rota nos quatro painéis.
- A suíte Vitest passou com 18 arquivos e 90 testes.
- A suíte Playwright possui somente 5 cenários lógicos, voltados a superfícies públicas e roteamento básico.
- Build, type-check e lint passaram; o lint ainda apresenta muitos avisos.

### Planejamento

- Criado `DEV/SPECS/AUDITORIA_FUNCIONAL_REGRESSAO.md`.
- Definidas as ondas: fundação transversal, Urbano, Rural, Super Admin, Mega Admin, superfícies públicas e barreira permanente de regressão.
- Definidos gates, severidades, evidências e critérios globais de aceite.

### Escopo desta atividade

- Nenhuma função do produto foi alterada.
- Nenhuma correção, commit, push ou deploy foi executado.

---

## [2026-07-25] Fase 1: Financial Hub + Clube Imobzy

### Contexto

Após análise competitiva das plataformas CV CRM, MSYS Imob e Loft, identificamos os principais gaps do Imobzy. A Fase 1 implementa os dois gaps de maior impacto imediato.

---

### Arquivos Criados

#### `views/urban/FinancialHub.tsx`

Módulo de serviços financeiros integrados ao CRM com duas abas:

- **Crédito Imobiliário**: simulador com tabelas SAC e PRICE, seleção de 5 bancos (taxas indicativas), integração com `urban_financing_simulations`, export PDF e salvar no CRM.
- **Fiança Aluguel Digital**: fluxo em 2 passos para solicitar garantia locatícia, análise de comprometimento de renda (mín. 3x o encargo), listagem de solicitações por status, preparado para integração futura com CredPago, Porto Seguro e Tokio Marine.

Rota: `/urban/fintech`

#### `views/urban/ClubeImobzy.tsx`

Sistema de gamificação completo com 4 abas:

- **Meu Perfil**: hero card com nível (Bronze/Prata/Ouro/Diamante/Titânio), progress bar, stats e tabela de como ganhar pontos.
- **Ranking**: leaderboard da organização ordenado por pontos.
- **Resgatar**: catálogo de recompensas (Destaque no Portal, Curso Online, Voucher, Troféu) com lógica de resgate e deduação de pontos.
- **Conquistas**: badges desbloqueáveis com progresso individual.

Rota: `/urban/clube`

#### `migrations/20260725_gamification_and_fintech.sql`

Migration criando as tabelas:

- `gamification_profiles` — perfil de pontos por user+org com UNIQUE constraint
- `gamification_transactions` — log de pontos ganhos/gastos
- `gamification_redemptions` — registro de resgates
- `fianca_requests` — solicitações de fiança com coluna gerada `total_encargo`
- RLS policies por `organization_id` em todas as tabelas
- Indexes de performance (pontos DESC para ranking, status para fiança)
- Trigger `set_updated_at` em gamification_profiles e fianca_requests

---

### Arquivos Modificados

#### `App.tsx`

- Lazy imports adicionados: `FinancialHub` e `ClubeImobzy`
- Rotas adicionadas no Urban Panel: `/urban/fintech` e `/urban/clube`

#### `components/UrbanLayout.tsx`

- Imports de ícones adicionados: `Landmark` e `Trophy`
- Itens adicionados em `managementItems`: Financial Hub e Clube Imobzy

---

### Verificação

- Type-check executado: **zero erros nos arquivos novos**. Os erros existentes são todos pré-existentes em outros arquivos do projeto (DomainRouter, AuthContext, SettingsContext, etc.).
- **Próximo passo obrigatório**: Executar a migration `20260725_gamification_and_fintech.sql` no Supabase via Dashboard > SQL Editor.

---

### Próximas Fases (Planejamento)

- **Fase 2**: Empacotar PWA com Capacitor para App Store / Google Play
- **Fase 3**: Auditoria corporativa estrita (logs imutáveis) + módulo de Repasse de Financiamento de lançamentos

---

## [2026-07-26] Instagram Integration Module

### Contexto

Implementação completa do módulo de integração Instagram para o Imobzy, seguindo a arquitetura two-service (Node.js + Python worker) conforme especificação do maestro.

### Arquivos Criados

#### DB Migration

- `migrations/20260726_instagram_integration_module.sql` — 9 tabelas: `instagram_accounts`, `instagram_sessions`, `instagram_contacts`, `instagram_conversations`, `instagram_messages`, `instagram_templates`, `instagram_templates_variables`, `instagram_broadcast_groups`, `instagram_broadcast_recipients`. Todas com RLS por `company_id`, triggers `updated_at`, e índices de performance.

#### Node.js Service (`instagram-service/`)

- `package.json` — Dependências: Express, BullMQ, WebSocket, Supabase, Helmet, CORS
- `src/index.js` — Express server na porta 3200 com WebSocket para real-time, rotas `/api/instagram/*`
- `src/middleware/auth.js` — JWT auth via Supabase + company isolation via `x-company-id`
- `src/lib/worker-client.js` — HTTP client para comunicação com Python worker
- `src/lib/encryption.js` — AES-256-GCM encryption/decryption para credenciais
- `src/lib/queue.js` — BullMQ queue `instagram-worker-tasks`
- `src/routes/accounts.js` — CRUD contas Instagram + connect via QR code
- `src/routes/contacts.js` — Listagem, busca, update de contatos
- `src/routes/conversations.js` — Listagem de conversas com filtros
- `src/routes/messages.js` — Envio/recebimento de mensagens com WebSocket broadcast
- `src/routes/templates.js` — CRUD templates de mensagem com variáveis
- `src/routes/broadcasts.js` — Campanhas de broadcast com envio via BullMQ
- `src/routes/webhooks.js` — Webhooks para receber mensagens/status do worker Python

#### Python Worker (`instagram-worker/`)

- `requirements.txt` — instagrapi, fastapi, uvicorn, bullmq, redis, httpx
- `app/__init__.py`
- `app/config.py` — Configuração via env vars
- `app/models.py` — Pydantic models para requests
- `app/instagram_client.py` — Wrapper instagrapi com login QR, sessões, envio
- `app/worker.py` — BullMQ worker para processar tarefas da fila
- `app/main.py` — FastAPI server na porta 8000 com endpoints internos

#### Docker

- `Dockerfile.instagram-service` — Node.js 20 Alpine
- `Dockerfile.instagram-worker` — Python 3.12 slim
- `docker-compose.yml` — Adicionados services `instagram-service`, `instagram-worker`, `redis` + volumes
- `docker-compose.local.yml` — Adicionados services locais com healthchecks

#### Frontend

- `views/Instagram/InstagramDashboard.tsx` — Dashboard completo com inbox, contacts, templates, broadcasts, settings
- `views/Instagram/hooks/api.ts` — API client tipado para todas as rotas
- `views/Instagram/hooks/useWebSocket.ts` — Hook WebSocket para real-time

### Arquivos Modificados

- `App.tsx` — Lazy import `InstagramDashboard` + rotas `/instagram` no rural e urban panels

### Verificação

- Migration SQL válido (9 tabelas + RLS + triggers + indexes)
- Node.js service com 7 route files seguindo padrões existentes
- Python worker com FastAPI + BullMQ processing
- Docker compose atualizado para ambos ambientes
- Frontend com TypeScript types completos

### Próximos Passos

1. Executar migration `20260726_instagram_integration_module.sql` no Supabase SQL Editor
2. Subir serviços via `docker-compose up instagram-service instagram-worker redis`
3. Testar login QR code via `/api/instagram/accounts/connect`
4. Implementar ContactDrawer e TemplateManager completos (parcialmente feito no Dashboard)
5. Adicionar sidebar navigation para Instagram nos layouts RuralLayout e UrbanLayout

---

## [2026-07-26] Unified Inbox: Instagram + WhatsApp

### Contexto

Mesclar as conversas do Instagram no mesmo aba de mensagens do WhatsApp, diferenciadas por badge de plataforma. Antes, o Instagram tinha uma rota separada (`/instagram`), agora é integrado ao inbox principal.

### Arquivos Criados

#### `views/WhatsApp/hooks/unifiedInbox.ts`

Tipos e adaptadores unificados:

- `UnifiedChat` — estende `Chat` com `platform: 'whatsapp' | 'instagram'` + campos Instagram opcionais
- `UnifiedMessage` — estende `Message` com `platform` + `instagram_conversation_id`
- `whatsappChatToUnified()` — converte WhatsApp Chat para UnifiedChat
- `instagramConversationToUnified()` — converte InstagramConversation para UnifiedChat
- `instagramMessageToUnified()` — converte InstagramMessage para UnifiedMessage
- `sortUnifiedChats()` — ordena por last_message_at DESC

### Arquivos Modificados

#### `views/WhatsApp/WhatsAppDashboard.tsx`

- Importa `instagramApi` e adaptadores unificados
- Estados `chats`, `selectedChat`, `messages` agora usam tipos `Unified*`
- `loadChats()` mescla WhatsApp chats + Instagram conversations com `sortUnifiedChats()`
- `loadInstagramConversations()` busca conversas Instagram na montagem
- `loadMessages()` roteia para API correta baseado no `platform`
- `handleSendMessage()` roteia envio para WhatsApp ou Instagram API
- `handleSelectChat()` aceita `UnifiedChat`
- WebSocket handler `new_message` normaliza para `UnifiedChat`/`UnifiedMessage`
- Busca (`filteredChats`) inclui campos Instagram (`instagram_contact_username`, `instagram_contact_full_name`)

#### `views/WhatsApp/ChatSidebar.tsx`

- Importa `UnifiedChat`
- Props usam `UnifiedChat` em vez de `Chat`
- Nova aba de filtro de plataforma: Todos / WhatsApp / Instagram
- Badge de plataforma (ícone Instagram) ao lado do nome em conversas Instagram
- Badge de unread com gradiente Instagram (`wa-unread-ig`)
- Preview de conversa Instagram mostra `@username`

#### `views/WhatsApp/ChatWindow.tsx`

- Props usam `UnifiedChat`/`UnifiedMessage`
- Header mostra badge de plataforma (WhatsApp/Instagram com ícone SVG)
- Subtitle mostra `@username` ou `via @account_username` para Instagram
- Contato panel mostra plataforma, conta Instagram
- CRM actions desabilitadas para conversas Instagram
- `saveContactName()` funciona para ambas plataformas

#### `views/WhatsApp/whatsapp.css`

- `.wa-platform-tabs` — aba de filtro com 3 colunas
- `.wa-platform-tab` — botões de filtro com hover/active states
- `.wa-platform-badge` — badge no header do chat (WhatsApp verde, Instagram gradiente)
- `.wa-platform-badge-sm` — badge pequeno no sidebar
- `.wa-unread-ig` — badge de unread com gradiente Instagram
- `.wa-platform-text-whatsapp` / `.wa-platform-text-instagram` — cores de texto

### Verificação

- `type-check` passou: 0 erros novos (2 pré-existentes em SupportManager e PortalProprietarioUrbano)
- `lint` nos arquivos modificados: 0 erros, warnings pré-existentes de React Hooks deps
- Commit: `c941adf` pushado para `origin/codex/main-whatsapp-media-hotfix`

### Próximos Passos

1. Testar fluxo completo: inbox mostra WhatsApp + Instagram, filtro funciona, envio funciona
2. Considerar remover rota `/instagram` separada (ou manter como atalho)
3. WebSocket real-time para Instagram (polling por enquanto)

---

## [2026-07-28] Fix Backend Errors: 5 Rotas com Erro

### Contexto

Cinco endpoints estavam falhando no console:
1. `match_properties_to_lead` RPC 404 — função não existia no banco
2. `/api/crm/clients` POST 500 — tabela `clients` não existia
3. `/api/orulo/sync` 400 — credenciais vazias retornavam sem erro
4. `/api/ai/chat` 500 — sem chaves de API Gemini/Groq, mensagem genérica
5. `/api/storage/upload` 500 — MinIO inacessível + fallback Supabase falhava sem feedback

### Arquivos Criados

#### `migrations/20260728_fix_backend_errors.sql`

- Função RPC `match_properties_to_lead(p_lead_id, ...)` — faz matching de imóveis ao lead por tipo, preço, quartos e área com score de 0-100
- Tabela `clients` com colunas alinhadas ao route handler (`document_number`, `document_type`, `roles`, `address_*`), RLS por `organization_id`, trigger `updated_at`
- Grants para `authenticated`

### Arquivos Modificados

#### `server/api/crm/clients/index.js`

- GET e POST: detectam tabela ausente (`42P01`/`PGRST205`) e retornam `migration_required: true` em vez de 500 genérico

#### `server/api/orulo/index.js`

- `getMasterOruloCredentials()`: valida `clientId` e `clientSecret` antes de retornar — lança 400 com mensagem clara quando as variáveis `ORULO_CLIENT_ID`/`ORULO_CLIENT_SECRET` não estão configuradas

#### `server/api/ai/chat.routes.js`

- `/chat`: status code 503 (Service Unavailable) em vez de 500 quando não há provedores IA
- Mensagem de erro descreve quais chaves estão faltando
- Resposta inclui `details` com status de cada provedor

#### `server/api/storage/index.js`

- `uploadToConfiguredStorage()`: catch no MinIO com fallback automático para Supabase quando `ALLOW_SUPABASE_STORAGE_FALLBACK=true`
- Handler de rota `/upload`: detecta erros de storage (MinIO/fetch failed) e retorna 503 com hint de configuração

### Verificação

- `type-check`: 0 erros novos (2 pré-existentes em WhatsApp module)

### Próximos Passos

1. Executar migration `20260728_fix_backend_errors.sql` no Supabase SQL Editor
2. Configurar chaves de IA (`GEMINI_API_KEY` ou `GROQ_API_KEY`) no `.env` do servidor
3. Configurar MinIO ou definir `MEDIA_STORAGE_PROVIDER=supabase` no `.env`

---

## [2026-07-28] Recuperação do QR Code do WhatsMeow

### Causa raiz

- A instância `22222` estava presa em `connecting` sem QR Code.
- O endpoint reiniciava somente clientes em `disconnected`, mantendo `connecting` indefinidamente em `pending`.
- O dashboard urbano consultava `leads.broker_id`, coluna inexistente em produção, causando HTTP 400 separado do fluxo do QR.

### Correção

- O endpoint de QR reinicia sessões presas em `connecting` e preserva sessões com QR ativo.
- Adicionado teste de regressão para os estados de recuperação.
- Removido `broker_id` da consulta e do agrupamento do dashboard urbano.
- Instância real `22222` redefinida condicionalmente para `disconnected`, permitindo que o backend publicado reinicie o pareamento na próxima abertura do modal.

### Verificação

- Suíte Go completa e build do servidor: passaram.
- Build Vite de produção: passou.
- ESLint relacionado: 0 erros.
- Deploy não executado; a implantação das novas imagens permanece pendente.

---

## [2026-07-30] Landing Page: 11 novos settings + 3 atualizados

### Feito
- Criados settings para: Image, Gallery, Video, PropertyCarousel, PropertyFeatured, PropertySearch, Map, Timeline, Testimonials, BrokerCard, Divider (11 novos)
- Atualizados: HeroWithForm (formSubtitle, height, textColor, badges), Features (layout), Stats (columns, animated)
- Registrados todos os 14 components no switch do PropertiesSidebar
- Corrigido import path em FeaturesBlockSettings (typo `../../../../` → `../../../`)
- Corrigidos 2 lint errors no CRM: Agenda unclosed div + LeadDetailsModal extra `</div>` + import fantasma `buildMatchWhatsappMessage`
- Build e type-check: passam com 0 erros

### Pendente
- Testar cada novo settings panel na UI do editor

## [2026-07-30] TemplateManager 500 em produção - global_templates

- Causa raiz: tabela `public.global_templates` inexistente em produção; PostgREST retorna `PGRST205` (schema cache), mas `admin-templates.js` só tratava `42P01`.
- Código: adicionado helper `isMissingTable` em `server/routes/admin-templates.js` (42P01/PGRST205/msg), mesmo padrão do restante do repo.
- Runner: `migrations/20260713_global_templates.sql` adicionada à lista de `scripts/run-migrations.mjs`.
- Produção: migração executada via `exec_sql` (7 statements OK) em `epgaftsjmqmpczvzsrcc.supabase.co`; tabela criada, RLS + 2 policies ativas.
- Verificado: SELECT em `global_templates` retorna 0 linhas; seed dos 9 templates padrão ocorre no primeiro GET por organização.
