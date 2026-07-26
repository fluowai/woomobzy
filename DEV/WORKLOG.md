# DEV WORKLOG — Imobzy

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
