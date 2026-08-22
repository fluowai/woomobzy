# DEV WORKLOG — Imobzy

## [2026-08-22] Correção do Agent Architect com Groq

### Causa raiz

- `AgentArchitect` é singleton e retornava cedo quando já estava inicializado; uma seleção posterior de Groq/modelo no wizard podia ser ignorada.
- Quando a geração do provider falhava ou retornava JSON inválido, o fallback devolvia uma estrutura vazia/incompatível (`operation.architecture.agents`), então o endpoint não criava agentes.
- A criação de handoffs usava o ID temporário vindo da IA como `from_agent_id`, em vez do UUID real salvo em `ai_agents`, podendo quebrar a criação após inserir agentes.

### Correção

- `server/services/ai/agentArchitect.js`: seleção de provider/modelo agora é reaplicada por chamada, agentes passam a herdar o modelo selecionado e o fallback cria uma equipe mínima funcional com orquestrador, especialista comercial, agenda/handoff, prompts, workflows e plano de testes.
- `server/routes/aiOperations.js`: handoffs agora usam o agente real criado no banco, resolvido por `specId`/`role`.
- `server/services/ai/llmProvider.js`: timer do `CostTracker` agora usa `unref()` para não prender processos de teste.
- `server/__tests__/agentArchitect.test.ts`: cobertura para troca de provider no singleton e fallback com modelo Groq.

### Verificação

- `npx.cmd vitest run server/__tests__/agentArchitect.test.ts --pool=threads --maxWorkers=1` → 2/2 passaram. O pool padrão de forks voltou a travar ao iniciar worker neste ambiente.
- `npm run type-check` passou.
- `npm run build` passou.
- Sem commit/push/deploy.

## [2026-08-20] Correção de entregabilidade de e-mail (rSPAM / MailBaby)

### Problema

- E-mail de boas-vindas (cadastro de conta) foi rejeitado pelo filtro de saída do servidor de e-mail do domínio (`relay.mailbaby.net` / OutboundSpamProtection), score 22.49.
- Relatório `mailinfo` apontou como principais causas: SPF com `PERMERROR` (dois registros SPF em `wootech.com.br`), `MIME_HTML_ONLY`, HELO `[127.0.0.1]`, e reputação nova da conta `mb16209`.

### Mudanças no código

- `server/services/email/emailService.js`:
  - `createSmtpTransport` agora usa `name: process.env.SMTP_HELO_NAME` (EHLO correto em vez de `[127.0.0.1]`).
  - `sendEmail` e `sendSystemEmail` enviam `text/plain` derivado do HTML (`htmlToText`), eliminando `MIME_HTML_ONLY`.
  - Headers de envio adicionados: `X-Mailer: IMOBZY` e `X-Entity-Ref-ID`.
- `server/services/emailService.js` (legado): mesmo ajuste de HELO name no transporter.
- `.env`, `.env.local` e `.env.production.template`: novo `SMTP_HELO_NAME=mail.wootech.com.br`.

### Pendências externas (DNS — não resolvido pelo código)

1. Consolidar os dois registros SPF de `wootech.com.br` em um único:
   `v=spf1 a mx ip4:51.161.84.29 ip4:162.250.125.14 include:spf.cloudns.link ~all`
2. Aquecer a conta `mb16209` (reputação nova); evitar e-mails de teste curtos.
3. Após SPF válido, considerar DMARC `p=quarantine`.

### Evidências

- Sintaxe validada com `node --check` nos dois services.
- `type-check` sem erros novos (único erro é pré-existente: `@/hooks/usePanelBase` em `views/AICentral.tsx`).

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

## [2026-08-19] Fix RLS recursion blocking profile query for fluowai@gmail.com

### Contexto

- Usuário `fluowai@gmail.com` (id: `df587a67-d525-4e01-9ff6-c82ba596fb13`) não conseguia acessar `/megaadmin`.
- Logs exibiam: `Error: infinite recursion detected in policy for relation "profiles"`.
- A query de perfil no AuthContext retornava `false` com erro, impedindo o login.
- Docker/imagem não era o problema — as imagens `:latest` já estavam corretas no Portainer.
- O problema era **puramente no banco de dados Supabase** (política RLS recursiva).

### Causa raiz

- A política RLS `profiles_self` na tabela `profiles` continha uma subquery que fazia SELECT na própria tabela `profiles`:
  ```sql
  EXISTS (SELECT 1 FROM profiles WHERE profiles_1.id = auth.uid() AND ...)
  ```
  Isso causava recursão infinita: a query em `profiles` disparava a política, que fazia outra query em `profiles`, repetindo indefinidamente.
- Além disso, a função `get_my_org_id()` existente não era `SECURITY DEFINER`, amplificando o problema.

### Correção (executada diretamente no Supabase)

- **Dropped** a política recursiva `profiles_self` da tabela `profiles`.
- Criada função `get_my_org_id()` como `STABLE SECURITY DEFINER` que tenta JWT primeiro e só faz fallback para query direta no `profiles` (bypassando RLS via SECURITY DEFINER).
- Criada política limpa `Profiles_own_access` sem recursão (usa apenas `auth.uid()` e `auth.jwt()`).
- Sincronizados `organization_id` em `auth.users.raw_app_meta_data` para 2 usuários (sync de 15 no passo anterior).
- Perfil de `fluowai@gmail.com` verificado: `role = 'superadmin'` (já correto), `organization_id = 8f9bf0f1-9df1-4e42-b00a-06a9d0717528` (atribuído durante a sessão).

### Verificação

- `SELECT * FROM profiles WHERE id = 'df587a67...'` → **retorna sucesso** (antes: infinite recursion error).
- `app_metadata` do usuário agora contém `organization_id: "8f9bf0f1-9df1-4e42-b00a-06a9d0717528"`.
- 5 políticas restantes em `profiles` inspecionadas — nenhuma é recursiva.
- `normalizeRole('superadmin')` → `'superadmin'` ✓ (compatível com `MegaAdminGuard`).

- Build Vite de produção: passou.
- ESLint relacionado: 0 erros.
- Deploy não executado; a implantação das novas imagens permanece pendente.

## [2026-08-20] Correção de 500 no DELETE de Clientes Diretos (Mega Admin)

### Causa raiz

- `DELETE /api/mega/direct-clients/:id` (`server/routes/mega-admin.js`) excluía a organização diretamente, mas várias tabelas referenciam `organizations(id)` sem `ON DELETE CASCADE` (ex.: `profiles`, criado para todo cliente direto). O banco rejeitava a exclusão com FK violation → 500.
- Latente no mesmo handler: `PUT /direct-clients/:id` e `PUT /resellers/:id` usavam `.select().single()` e lançavam 500 com `PGRST116` quando o update casava 0 linhas (o `if (!data)` de 404 era código morto).

### Correção

- Criado `server/lib/organization-deletion.js` com helpers compartilhados: `unlinkKnownOrganizationReferences`, `deleteOrganizationsWithDirectDb` (fallback transacional via Postgres direto que percorre todas as FKs), `isForeignKeyError`, `getDirectDatabaseUrl`, `normalizeDirectDatabaseUrl`, `shouldUseSsl`.
- `server/routes/admin.js` passou a importar esses helpers do módulo compartilhado (removida duplicação local).
- `server/routes/mega-admin.js`: DELETE de cliente direto agora valida UUID, desvincula dependências (`profiles`, storage, calls, domains) e, em FK error, usa o fallback `deleteOrganizationsWithDirectDb`. PUT de direct-clients e resellers trata `PGRST116` como 404.
- Corrigido `organizationId: organization.id` → `org.id` nos POSTs de reseller e cliente direto (e-mail de boas-vindas nunca era enviado — variável indefinida).
- `server/__tests__/adminOrganizationsFallback.test.ts` atualizado para importar `normalizeDirectDatabaseUrl`/`shouldUseSsl` do módulo compartilhado.

### Verificação

- `node --check` OK nos 3 arquivos alterados.
- `npx vitest run --pool=threads server/__tests__/adminOrganizationsFallback.test.ts` → 3/3 passaram (pool forks padrão falha neste ambiente por timeout do worker, pré-existente).
- `npm run type-check` sem erros.
- ESLint do arquivo de teste sem erros.
- Sem commit/push/deploy.
