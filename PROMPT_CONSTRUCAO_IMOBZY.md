# PROMPT DE CONSTRUCAO — IMOBZY CRM

> **Plataforma SaaS Multi-Tenant para CRM Imobiliario Urbano e Rural**
> Versao do prompt: 2.0
> Data: Julho 2026

---

## 1. VISAO GERAL DO PROJETO

Construir do zero uma plataforma SaaS completa de CRM imobiliario chamada **IMOBZY** (tambem conhecida como WooTech Imob / Fazendas Brasil / OKA Imoveis). A plataforma atende **dois nichos simultaneos**: imoveis urbanos e imoveis rurais, cada um com painel, funcionalidades e dashboards proprios.

A plataforma opera em modelo **multi-tenant white-label**, onde cada organizacao (imobiliaria, corretor, fazenda) tem seu proprio painel, dominio customizado, e dados isolados. O dono da plataforma (superadmin) gerencia tenants, planos, billing, e suporte.

### Stack Tecnologica

| Camada          | Tecnologia               | Versao |
| --------------- | ------------------------ | ------ |
| Frontend        | React + TypeScript       | 19.x   |
| Estilo          | Tailwind CSS             | v4     |
| Roteamento      | React Router             | v7     |
| Backend         | Node.js + Express        | 5.x    |
| Banco de Dados  | PostgreSQL (Supabase)    | 15+    |
| Auth            | Supabase Auth (JWT)      | -      |
| Storage         | MinIO (S3-compatible)    | -      |
| Cache           | TTL Cache (in-memory)    | -      |
| Bundler         | Vite                     | 6.x    |
| Testes          | Vitest + Testing Library | 4.x    |
| Linting         | ESLint + Prettier        | 9.x    |
| Containerizacao | Docker + Docker Compose  | -      |
| Reverse Proxy   | Traefik                  | v3     |

### Princips Arquiteturais

1. **Multi-tenancy por organization_id** — todos os dados sao filtrados por tenant
2. **Isolamento completo** — RLS no Supabase + middleware backend
3. **White-label** — dominios customizados por organizacao
4. **Lazy loading** — todas as views sao carregadas sob demanda
5. **Backend modular** — rotas organizadas por dominio de negocio
6. **Seguranca em profundidade** — auth, tenant, role, CORS, rate limit

---

## 2. ESTRUTURA DO PROJETO

```
imobzy/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Router principal
│   ├── index.css                   # Tailwind entry
│   ├── vite-env.d.ts
│   │
│   ├── types/                      # Tipagens globais
│   │   ├── index.ts                # Re-exports
│   │   ├── property.ts             # Property (urbano + rural)
│   │   ├── lead.ts                 # Lead CRM
│   │   ├── contract.ts             # Contratos
│   │   ├── lease.ts                # Locacao
│   │   ├── user.ts                 # Usuario/Profile
│   │   └── landing-page.ts         # Landing pages
│   │
│   ├── constants/                  # Constantes de dominio
│   │   ├── index.ts
│   │   ├── propertyNiche.ts        # Enum rural/urbano
│   │   ├── contractTemplates.ts    # Templates de contrato
│   │   ├── siteTemplates.ts        # Templates de site
│   │   └── landingPageTemplates.ts # Templates de LP
│   │
│   ├── lib/                        # Bibliotecas compartilhadas
│   │   ├── api.ts                  # Fetch wrapper com auth
│   │   ├── supabase-browser.ts     # Client Supabase frontend
│   │   └── validators.ts           # Validacoes compartilhadas
│   │
│   ├── hooks/                      # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useProperties.ts
│   │   ├── useLeads.ts
│   │   └── useLease.ts
│   │
│   ├── context/                    # React Contexts
│   │   ├── AuthContext.tsx
│   │   ├── SettingsContext.tsx
│   │   ├── TenantContext.tsx
│   │   ├── PlansContext.tsx
│   │   └── TextsContext.tsx
│   │
│   ├── components/                 # Componentes compartilhados
│   │   ├── ui/                     # UI base (Button, Input, Modal, etc.)
│   │   ├── layout/                 # Layouts globais
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Breadcrumb.tsx
│   │   ├── guards/                 # Guards de acesso
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── PanelGuard.tsx
│   │   │   ├── SuperAdminGuard.tsx
│   │   │   ├── SubscriptionGuard.tsx
│   │   │   └── RoleGuard.tsx
│   │   ├── charts/                 # Graficos reutilizaveis
│   │   └── shared/                 # Componentes de dominio
│   │       ├── PropertyCard.tsx
│   │       ├── LeadCard.tsx
│   │       └── KanbanColumn.tsx
│   │
│   ├── modules/                    # Modulos por dominio
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ForgotPassword.tsx
│   │   │
│   │   ├── urban/                  # Modulo Urbano
│   │   │   ├── UrbanLayout.tsx     # Layout com sidebar urbano
│   │   │   ├── UrbanDashboard.tsx
│   │   │   ├── properties/
│   │   │   │   ├── PropertyManagement.tsx
│   │   │   │   ├── PropertyEditor.tsx
│   │   │   │   ├── PropertyDetail.tsx
│   │   │   │   └── PropertyListing.tsx  # Listagem publica
│   │   │   ├── crm/
│   │   │   │   ├── CRMLeads.tsx
│   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   ├── ClientsManager.tsx
│   │   │   │   ├── LeadDistributionModal.tsx
│   │   │   │   └── DripCampaignModal.tsx
│   │   │   ├── lease/              # Locacao/Aluguel
│   │   │   │   ├── LeaseDashboard.tsx
│   │   │   │   ├── LeaseWizard.tsx
│   │   │   │   ├── LeaseDetail.tsx
│   │   │   │   └── templates/
│   │   │   ├── finance/
│   │   │   │   ├── FinanceiroUrbano.tsx
│   │   │   │   ├── Cobranca.tsx
│   │   │   │   └── Simulator360.tsx
│   │   │   ├── condominios/
│   │   │   │   └── AdmCondominios.tsx
│   │   │   ├── keys/
│   │   │   │   └── ControleChaves.tsx
│   │   │   ├── documents/
│   │   │   │   └── GestaoDocumentos.tsx
│   │   │   ├── compliance/
│   │   │   │   └── ComplianceUrbano.tsx
│   │   │   ├── developments/
│   │   │   │   ├── Empreendimentos.tsx
│   │   │   │   └── LoteamentoDetails.tsx
│   │   │   ├── portals/            # Portais publicos
│   │   │   │   ├── PortalProprietario.tsx
│   │   │   │   ├── PortalComprador.tsx
│   │   │   │   └── PortalLocatario.tsx
│   │   │   ├── export/
│   │   │   │   └── ExportadorPortais.tsx
│   │   │   └── connections/
│   │   │       └── ConexoesUrbano.tsx
│   │   │
│   │   ├── rural/                  # Modulo Rural
│   │   │   ├── RuralLayout.tsx     # Layout com sidebar rural
│   │   │   ├── RuralDashboard.tsx
│   │   │   ├── properties/         # Mesmo CRUD de imoveis, adaptado
│   │   │   ├── territory/          # Hub territorial rural
│   │   │   │   ├── RuralTerritoryHub.tsx
│   │   │   │   ├── Geointeligencia.tsx   # Mapas + Leaflet
│   │   │   │   ├── CARLocationSearch.tsx
│   │   │   │   ├── ValuationRural.tsx
│   │   │   │   ├── DueDiligence.tsx
│   │   │   │   └── DossieInteligente.tsx
│   │   │   ├── technical/
│   │   │   │   └── CadastroTecnico.tsx
│   │   │   ├── finance/
│   │   │   │   └── FinanceiroRural.tsx
│   │   │   ├── portals/
│   │   │   │   ├── PortalProprietarioRural.tsx
│   │   │   │   └── PortalCompradorRural.tsx
│   │   │   └── connections/
│   │   │       └── ConexoesRural.tsx
│   │   │
│   │   ├── crm/                    # CRM compartilhado
│   │   │   ├── components/
│   │   │   │   ├── KanbanBoard/
│   │   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   │   ├── KanbanColumn.tsx
│   │   │   │   │   ├── KanbanCard.tsx
│   │   │   │   │   ├── NewLeadModal.tsx
│   │   │   │   │   ├── StageEditor.tsx
│   │   │   │   │   ├── IntentFilter.tsx
│   │   │   │   │   └── helpers.ts
│   │   │   │   └── LeadList/
│   │   │   │       ├── LeadList.tsx
│   │   │   │       ├── LeadRow.tsx
│   │   │   │       └── LeadFilters.tsx
│   │   │   ├── modals/
│   │   │   │   ├── LeadDistributionModal.tsx
│   │   │   │   └── DripCampaignModal.tsx
│   │   │   └── reports/
│   │   │       └── BIReport.tsx
│   │   │
│   │   ├── site-builder/           # Construtor de sites
│   │   │   ├── SiteManager.tsx
│   │   │   ├── SitePageEditor.tsx
│   │   │   ├── VisualSiteEditor.tsx
│   │   │   ├── SiteSetupWizard.tsx
│   │   │   └── blocks/             # Blocos do editor
│   │   │       ├── TextBlock.tsx
│   │   │       ├── HeroBlock.tsx
│   │   │       ├── GalleryBlock.tsx
│   │   │       ├── PropertyGridBlock.tsx
│   │   │       ├── FormBlock.tsx
│   │   │       ├── CTABlock.tsx
│   │   │       ├── MapBlock.tsx
│   │   │       ├── TestimonialsBlock.tsx
│   │   │       ├── StatsBlock.tsx
│   │   │       ├── FooterBlock.tsx
│   │   │       └── BlockRenderer.tsx
│   │   │
│   │   ├── landing-pages/          # Editor de landing pages
│   │   │   ├── LandingPageManager.tsx
│   │   │   ├── LandingPageEditor.tsx
│   │   │   ├── blocks/             # Blocos de LP
│   │   │   └── templates/          # Templates pre-definidos
│   │   │
│   │   ├── whatsapp/               # Integracao WhatsApp
│   │   │   ├── WhatsAppDashboard.tsx
│   │   │   ├── InstanceManager.tsx
│   │   │   ├── ChatSidebar.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── QRCodeModal.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── api.ts
│   │   │   │   └── useWebSocket.ts
│   │   │   └── AudioMessagePlayer.tsx
│   │   │
│   │   ├── ai/                     # Inteligencia Artificial
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── AIAgents.tsx
│   │   │   ├── IADashboardSummary.tsx
│   │   │   └── ConsultingAgent.tsx
│   │   │
│   │   ├── bi/                     # Business Intelligence
│   │   │   ├── BIUrbano.tsx
│   │   │   └── BIRural.tsx
│   │   │
│   │   ├── email/                  # Centro de emails
│   │   │   └── EmailCenter.tsx
│   │   │
│   │   ├── contracts/              # Contratos legais
│   │   │   └── LegalContracts.tsx
│   │   │
│   │   ├── quiz/                   # Campanhas quiz
│   │   │   ├── QuizCampaigns.tsx
│   │   │   └── PublicQuiz.tsx
│   │   │
│   │   └── settings/               # Configuracoes
│   │       ├── SystemSettings.tsx
│   │       ├── DomainSettings.tsx
│   │       ├── ConnectionSettings.tsx
│   │       ├── TrackingSettings.tsx
│   │       └── AppearanceSettings.tsx
│   │
│   ├── superadmin/                 # Modulo SuperAdmin
│   │   ├── SuperAdminLayout.tsx
│   │   ├── SuperAdminDashboard.tsx
│   │   ├── TenantManager.tsx
│   │   ├── PlanManager.tsx
│   │   ├── BillingManager.tsx
│   │   ├── DomainManager.tsx
│   │   ├── FeatureFlags.tsx
│   │   ├── AuditLog.tsx
│   │   ├── TemplateManager.tsx
│   │   ├── PlatformMonitoring.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── SupportManager.tsx
│   │   ├── TeamManager.tsx
│   │   ├── SmartImporter.tsx
│   │   ├── StorageIntelligence.tsx
│   │   ├── MarketingManager.tsx
│   │   ├── ConsultingLeads.tsx
│   │   └── GlobalSettings.tsx
│   │
│   ├── public/                     # Paginas publicas
│   │   ├── PublicLandingPage.tsx
│   │   ├── PublicSite.tsx
│   │   ├── SystemSalesPage.tsx
│   │   ├── OwnerPortal.tsx
│   │   └── DnsHelp.tsx
│   │
│   └── utils/                      # Utilitarios
│       ├── logger.ts               # Logger estruturado
│       ├── runtimeConfig.ts        # Env vars seguras
│       ├── propertyNiche.ts        # Deteccao rural/urbano
│       └── formatters.ts           # Formatacao de dados
│
├── server/
│   ├── index.js                    # Entrada Express
│   │
│   ├── middleware/                  # Middlewares globais
│   │   ├── auth.js                 # Autenticacao + role
│   │   ├── tenant.js               # Garantia de tenant
│   │   ├── validate.ts             # Validacao Zod
│   │   └── rateLimit.js            # Rate limiting por rota
│   │
│   ├── lib/                        # Bibliotecas backend
│   │   ├── supabase-server.js      # Singleton Supabase service
│   │   ├── cors-config.js          # CORS dinamico
│   │   ├── minio-storage.js        # Upload/download S3
│   │   ├── pg.js                   # Pool PostgreSQL direto
│   │   ├── platform-config.js      # Config da plataforma
│   │   └── ttl-cache.js            # Cache em memoria
│   │
│   ├── api/                        # Rotas modulares
│   │   ├── crm/
│   │   │   ├── index.js
│   │   │   ├── leads.routes.js
│   │   │   ├── clients.routes.js
│   │   │   ├── whatsapp.routes.js
│   │   │   ├── distribution.routes.js
│   │   │   ├── drip.routes.js
│   │   │   └── reports.routes.js
│   │   ├── properties/
│   │   │   └── index.js
│   │   ├── rural/
│   │   │   ├── index.js
│   │   │   ├── maps.routes.js
│   │   │   ├── analysis.routes.js
│   │   │   ├── legal.routes.js
│   │   │   ├── enrichment.routes.js
│   │   │   ├── integrations.routes.js
│   │   │   ├── market.routes.js
│   │   │   ├── pdf.routes.js
│   │   │   └── analysis/
│   │   │       ├── service.js
│   │   │       ├── controller.js
│   │   │       ├── processor.js
│   │   │       ├── repository.js
│   │   │       ├── worker.js
│   │   │       └── kmz-service.js
│   │   ├── urban/
│   │   │   └── index.js
│   │   ├── locacao/
│   │   │   └── index.js
│   │   ├── cobranca/
│   │   │   └── index.js
│   │   ├── ai/
│   │   │   └── index.js
│   │   ├── whatsapp/
│   │   │   ├── index.js            # Proxy WhatsApp + WS
│   │   │   └── providers/
│   │   │       ├── waha-router.js
│   │   │       ├── waha-client.js
│   │   │       └── provider-config.js
│   │   ├── email/
│   │   │   └── index.js
│   │   ├── sites/
│   │   │   └── index.js
│   │   ├── portals/
│   │   │   └── index.js
│   │   ├── storage/
│   │   │   └── index.js
│   │   ├── documents/
│   │   │   └── index.js
│   │   ├── valuation/
│   │   │   └── index.js
│   │   ├── orulo/
│   │   │   └── index.js
│   │   ├── quiz/
│   │   │   └── index.js
│   │   ├── settings/
│   │   │   └── index.js
│   │   ├── tenant/
│   │   │   └── index.js
│   │   ├── demo/
│   │   │   └── index.js
│   │   ├── external-data/
│   │   │   └── index.js
│   │   ├── fluowai-migration/
│   │   │   └── index.js
│   │   └── support/
│   │       └── impersonate.js
│   │
│   ├── services/                   # Logica de negocio backend
│   │   ├── leadPropertyMatcher.js
│   │   ├── leadDistributionService.js
│   │   ├── emailDripService.js
│   │   ├── emailService.js
│   │   ├── valuationService.js
│   │   ├── farmValuationService.js
│   │   ├── brokerReportService.js
│   │   ├── contractGenerationService.js
│   │   ├── siteCloner.js
│   │   ├── sicarService.js
│   │   ├── portalService.js
│   │   ├── scraperService.js
│   │   ├── storageIntelligenceService.js
│   │   ├── integracaoMapBiomas.js
│   │   ├── integracaoIbgeSidra.js
│   │   ├── integracaoIbamaEmbargos.js
│   │   ├── integracaoTerraBrasilis.js
│   │   └── integracaoConectaGov.js
│   │
│   ├── schemas/                    # Validacao Zod
│   │   └── index.ts
│   │
│   ├── routes/                     # Rotas legadas (migrar para api/)
│   │   ├── admin.js
│   │   ├── public.js
│   │   ├── import.js
│   │   ├── account.js
│   │   ├── onboarding.js
│   │   ├── domains.js
│   │   └── internal.js
│   │
│   └── __tests__/                  # Testes backend
│       ├── webhookSecurity.test.ts
│       ├── leadMatcher.test.ts
│       ├── schemas.test.ts
│       └── errorHandling.test.ts
│
├── migrations/                     # Migracoes SQL
│   └── *.sql
│
├── docker/                         # Configs Docker
│   └── ...
│
├── scripts/                        # Scripts utilitarios
│   ├── setup-db.mjs
│   ├── run-migrations.mjs
│   └── check-db.mjs
│
├── tests/                          # Testes frontend
│   └── ...
│
├── .env.example                    # Template de env vars
├── .env.local                      # Env local (nunca versionar)
├── .gitignore
├── docker-compose.yml
├── Dockerfile.frontend
├── Dockerfile.api
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
└── turbo.json
```

---

## 3. SISTEMA DE AUTENTICACAO E AUTORIZACAO

### 3.1 Autenticacao (Supabase Auth)

```
POST /auth/v1/token?grant_type=password
```

- Email + senha via Supabase Auth
- JWT retornado com `sub` = user ID
- Token armazenado no Supabase client (automatico)
- Refresh token automatico pelo SDK

### 3.2 Perfil do Usuario (profiles table)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'broker'
    CHECK (role IN ('superadmin','admin','gerente','broker','assistente','user')),
  avatar_url TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Multi-Tenancy (organizations table)

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_name TEXT,
  owner_email TEXT,
  niche TEXT NOT NULL DEFAULT 'traditional'
    CHECK (niche IN ('rural','traditional')),
  custom_domain TEXT UNIQUE,
  plan_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  subscription_status TEXT DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','payment_required','suspended')),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active','inactive','suspended')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 Fluxo de Autenticacao Backend

```
Request
  ↓
verifyAuth (middleware/auth.js)
  ├── Extrair Bearer token do header Authorization
  ├── Validar JWT via Supabase Auth (getUser)
  ├── Buscar profile no banco (profiles table)
  ├── Resolver organization_id do profile
  ├── Suporte a Impersonation (x-impersonate-org-id header)
  ├── Break-glass: fluowai@gmail.com = superadmin
  └── Injetar req.user, req.userRole, req.orgId
  ↓
requireTenant (middleware/tenant.js)
  ├── Garantir que req.orgId existe
  ├── Validar organizacao no banco
  └── Anti-spoofing: rejeitar body.organization_id != req.orgId
  ↓
Role Guard (middleware)
  ├── requireRole('admin', 'superadmin')
  ├── verifyAdmin
  └── verifySuperAdmin
  ↓
Handler da rota
```

### 3.5 Regras de Negocio por Role

| Acao                          | superadmin | admin | gerente | broker | assistente |
| ----------------------------- | ---------- | ----- | ------- | ------ | ---------- |
| Acessar superadmin panel      | ✅         | ❌    | ❌      | ❌     | ❌         |
| Gerenciar tenants             | ✅         | ❌    | ❌      | ❌     | ❌         |
| Gerenciar planos              | ✅         | ❌    | ❌      | ❌     | ❌         |
| Impersonar organizacao        | ✅         | ❌    | ❌      | ❌     | ❌         |
| Gerenciar usuarios da org     | ✅         | ✅    | ❌      | ❌     | ❌         |
| Configurar integracoes        | ✅         | ✅    | ❌      | ❌     | ❌         |
| Editar todos os imoveis       | ✅         | ✅    | ✅      | ❌     | ❌         |
| Criar/editar proprios imoveis | ✅         | ✅    | ✅      | ✅     | ❌         |
| Visualizar leads              | ✅         | ✅    | ✅      | ✅     | ✅         |
| Editar leads                  | ✅         | ✅    | ✅      | ✅     | ❌         |
| Acessar BI/Reports            | ✅         | ✅    | ✅      | ❌     | ❌         |
| Visualizar financeiro         | ✅         | ✅    | ✅      | ❌     | ❌         |

### 3.6 Impersonation (Suporte)

```
Frontend: sessionStorage.setItem('impersonated_org_id', orgId)
Headers: x-impersonate-org-id: <orgId>

Backend:
  1. Verificar se usuario e superadmin
  2. Validar se organizacao existe
  3. req.orgId = organizacao impersonada
  4. Todas as queries usam a org impersonada
  5. Auditoria: log de impersonation
```

---

## 4. BANCO DE DADOS (PRINCIPAIS TABELAS)

### 4.1 Nucleo

```sql
-- Organizacoes (Tenants)
organizations (id, name, slug, owner_name, owner_email, niche, custom_domain, plan_id, trial_ends_at, subscription_status, status)

-- Usuarios
profiles (id, email, name, full_name, role, avatar_url, organization_id)

-- Planos
plans (id, name, price_monthly, price_yearly, features JSONB, max_properties, max_users)
```

### 4.2 CRM / Leads

```sql
-- Leads
leads (
  id, organization_id, name, phone, email,
  status TEXT DEFAULT 'Novo',
  classification TEXT,  -- 'Comprador Fazenda', 'Vendedor Fazenda', 'Interesse Rural', etc.
  source TEXT,
  property_id UUID REFERENCES properties(id),
  budget NUMERIC,
  aptitude_interest TEXT,
  preferences JSONB,
  notes TEXT,
  ad_reference TEXT,
  organic_channel TEXT,
  campaign TEXT,
  score NUMERIC DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  created_at, updated_at
)

-- Atividades dos leads
lead_activities (
  id, lead_id, organization_id, created_by,
  type TEXT,  -- 'WhatsApp', 'Chamada', 'Email', 'Visita', 'Status', 'Sistema'
  description TEXT,
  metadata JSONB,
  created_at
)

-- Tags dos leads
lead_tags (id, lead_id, tag TEXT)
```

### 4.3 Imoveis

```sql
-- Imoveis (urbano + rural)
properties (
  id, organization_id,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  -- Dados basicos
  property_type TEXT,  -- 'casa', 'apartamento', 'terreno', 'fazenda', 'sitio', etc.
  transaction_type TEXT,  -- 'venda', 'aluguel', 'venda_aluguel'
  -- Endereco
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  -- Geographic
  latitude NUMERIC,
  longitude NUMERIC,
  -- Dimensoes
  area_total NUMERIC,        -- em hectares para rural
  area_built NUMERIC,        -- em m2
  bedrooms INT,
  bathrooms INT,
  parking_spaces INT,
  -- Status
  status TEXT DEFAULT 'ativo',
  niche TEXT,  -- 'rural' ou 'urbano'
  -- Dados rurais especificos
  car_number TEXT,            -- CAR (Cadastro Ambiental Rural)
  incra_number TEXT,
  itbi_number TEXT,
  legal_documentation JSONB,
  -- Midia
  images JSONB,
  -- IA
  ai_analysis JSONB,
  matched_leads_count INT DEFAULT 0,
  created_at, updated_at
)
```

### 4.4 Locacao

```sql
-- Contratos de locacao
leases (
  id, organization_id, property_id,
  tenant_profile JSONB,      -- dados do inquilino
  monthly_rent NUMERIC,
  deposit_amount NUMERIC,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft',
  template_id UUID,
  created_by UUID,
  created_at, updated_at
)

-- Templates de locacao
lease_templates (id, organization_id, name, content TEXT, variables JSONB)
```

### 4.5 WhatsApp

```sql
-- Instancias WhatsApp
whatsapp_instances (
  id, tenant_id UUID REFERENCES organizations(id),
  name TEXT, status TEXT,
  qr_code TEXT, phone TEXT, jid TEXT,
  created_at, updated_at
)

-- Mensagens
whatsapp_messages (
  id, tenant_id, instance_id, chat_id,
  from_me BOOLEAN,
  content TEXT, media_url TEXT,
  media_status TEXT, media_error TEXT,
  status TEXT,
  created_at
)

-- Midia
whatsapp_media (
  id, tenant_id, message_id,
  provider TEXT, bucket TEXT, object_key TEXT,
  public_url TEXT, mime_type TEXT, filename TEXT,
  status TEXT, retry_count INT DEFAULT 0,
  last_error TEXT
)
```

### 4.6 Sites e Landing Pages

```sql
-- Sites
sites (id, organization_id, slug, name, config JSONB, created_at)

-- Paginas do site
site_pages (id, site_id, slug, title, blocks JSONB, seo JSONB)

-- Landing pages
landing_pages (id, organization_id, slug, title, blocks JSONB, template_id, status, seo JSONB)
```

### 4.7 Integracoes Rurais

```sql
-- Analises rurais
rural_analyses (
  id, organization_id, property_id,
  car_data JSONB,
  environmental_data JSONB,  -- MapBiomas, IBAMA, Terra Brasilis
  economic_data JSONB,       -- IBGE SIDRA
  legal_data JSONB,
  valuation_data JSONB,
  dossie_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at
)
```

### 4.8 Regras RLS (Row Level Security)

```sql
-- TODAS as tabelas com organization_id devem ter:
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON leads
  USING (organization_id = current_setting('app.current_org_id')::UUID);

-- Superadmin bypass
CREATE POLICY "superadmin_bypass" ON leads
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
```

---

## 5. ROTAS DA API

### 5.1 Publicas (sem auth)

| Metodo | Rota                      | Descricao                   |
| ------ | ------------------------- | --------------------------- |
| GET    | `/`                       | Status da API               |
| GET    | `/health`                 | Health check                |
| GET    | `/api/system-status`      | Status detalhado            |
| GET    | `/api/public/properties`  | Listagem publica de imoveis |
| POST   | `/api/public/leads`       | Captura de lead publico     |
| GET    | `/api/public/sites/:slug` | Site publico                |
| GET    | `/api/public/lp/:slug`    | Landing page publica        |
| GET    | `/api/quiz/:slug`         | Quiz publico                |
| POST   | `/api/quiz/:slug/submit`  | Responder quiz              |

### 5.2 Autenticadas (verifyAuth)

| Metodo                | Rota                                  | Descricao               |
| --------------------- | ------------------------------------- | ----------------------- |
| GET/POST/PATCH/DELETE | `/api/crm/leads/*`                    | CRUD de leads           |
| POST                  | `/api/crm/leads/bulk-delete`          | Exclusao em massa       |
| POST                  | `/api/crm/leads/:id/match-properties` | Matching IA             |
| POST                  | `/api/crm/distribution/*`             | Distribuicao de leads   |
| POST                  | `/api/crm/drip/*`                     | Campanhas drip          |
| GET                   | `/api/crm/reports/*`                  | Relatorios CRM          |
| GET/POST/PATCH/DELETE | `/api/properties/*`                   | CRUD de imoveis         |
| GET                   | `/api/rural/maps/*`                   | Mapas rurais            |
| GET                   | `/api/rural/analysis/*`               | Analises rurais         |
| POST                  | `/api/rural/pdf/*`                    | Gerar PDFs rurais       |
| GET                   | `/api/rural/enrichment/*`             | Enriquecimento de dados |
| GET                   | `/api/rural/integrations/*`           | Integracoes gov         |
| POST                  | `/api/email/send`                     | Enviar email            |
| GET/POST/PATCH        | `/api/sites/*`                        | CRUD de sites           |
| GET/POST/PATCH        | `/api/portals/*`                      | Portais                 |
| POST                  | `/api/documents/*`                    | Documentos              |
| POST                  | `/api/valuation/*`                    | Valuation               |
| GET/POST              | `/api/settings/*`                     | Configuracoes           |
| POST                  | `/api/quiz/*`                         | Quiz campaigns          |

### 5.3 Admin (verifyAdmin)

| Metodo                | Rota                     | Descricao           |
| --------------------- | ------------------------ | ------------------- |
| GET/POST/PATCH/DELETE | `/api/admin/*`           | Gerenciamento admin |
| GET                   | `/api/admin/templates/*` | Templates           |
| POST                  | `/api/import/*`          | Importacao de dados |

### 5.4 SuperAdmin (verifySuperAdmin)

| Metodo                | Rota                          | Descricao                |
| --------------------- | ----------------------------- | ------------------------ |
| GET/POST/PATCH/DELETE | `/superadmin/api/*`           | Gerenciamento plataforma |
| GET                   | `/superadmin/api/analytics`   | Analytics                |
| GET                   | `/superadmin/api/monitoring`  | Monitoring               |
| POST                  | `/superadmin/api/impersonate` | Impersonation            |

### 5.5 WhatsApp Proxy

| Metodo | Rota                          | Descricao            |
| ------ | ----------------------------- | -------------------- |
| WS     | `/api/whatsapp/ws`            | WebSocket (com JWT)  |
| POST   | `/api/whatsapp/socket-token`  | Gerar token WS       |
| GET    | `/api/whatsapp/instances`     | Listar instancias    |
| GET    | `/api/whatsapp/status`        | Status WhatsApp      |
| GET    | `/api/whatsapp/media/:id/url` | URL de midia         |
| POST   | `/api/whatsapp/waha/*`        | Proxy WAHA           |
| \*     | `/api/whatsapp/*`             | Proxy para WhatsMeow |

---

## 6. SEGURANCA — REGRAS OBRIGATORIAS

### 6.1 Variaveis de Ambiente

NUNCA versionar credenciais. Usar:

```bash
# .env.example (versionado)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
WHATSAPP_SERVICE_TOKEN=
WHATSAPP_INTERNAL_TOKEN=
WHATSAPP_WS_JWT_SECRET=
DIRECT_ADMIN_URL=
DIRECT_ADMIN_USER=
DIRECT_ADMIN_API_KEY=
```

### 6.2 Middleware de Seguranca

```js
// Helmet com CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // SEM 'unsafe-inline' em producao
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
      frameAncestors: ["'self'"],
    },
  })
);

// Rate limiting por rotas criticas
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const whatsappLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 30 });
```

### 6.3 Validacao de Input

```js
// Zod schemas para TODAS as entradas
import { z } from 'zod';

const CreateLeadSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email().optional(),
  property_id: z.string().uuid().optional(),
  source: z.string().max(100).optional(),
  budget: z.number().positive().optional(),
});
```

### 6.4 Protecao de Tenant

```
TODA tabela com dados tem:
  - organization_id UUID NOT NULL
  - RLS habilitado com policy de tenant isolation
  - Backend: req.orgId sempre injetado pelo middleware
  - Backend: queries SEMPRE filtram por .eq('organization_id', req.orgId)
```

### 6.5 Regras Anti-Spoofing

```
1. Body NUNCA deve definir organization_id — e sempre derivado do JWT
2. Header x-organization-id e IGNORADO para usuarios normais
3. Impersonation so funciona para superadmin
4. Body com organization_id diferente do req.orgId e rejeitado
5. x-impersonate-org-id so e aceito com verificacao no banco
```

### 6.6 Anti-Break-Glass

NENHUM email hardcoded deve ganhar privilegios extras. Remover:

```js
// NUNCA fazer isso:
if (email === 'fluowai@gmail.com') {
  profile.role = 'superadmin';
}
```

Em vez disso, garantir que o role vem exclusivamente do banco de dados, com auditoria.

---

## 7. FUNCIONALIDADES POR MODULO

### 7.1 Modulo CRM

**Kanban Board**

- Board drag-and-drop com colunas por status
- Virtualizacao para listas grandes (>500 leads)
- Filtros por intent (Comprador/Vendedor/Parceria)
- Filtros por data, budget, fonte
- Cards com: nome, telefone, WhatsApp, score SLA, tags
- Modal de novo lead com validacao
- Match automatico de propriedades (IA)
- Campanhas drip por email

**Leads Manager**

- Lista paginada com busca
- Metricas: total, em atendimento, fechados
- Distribuicao de leads entre corretores
- Historico de atividades por lead
- Exportacao CSV

### 7.2 Modulo Imoveis

**Property Management**

- Grid e List view
- Filtros: tipo, status, preco, localizacao
- Sincronizacao com Orulo (empreendimentos)
- Upload de imagens (MinIO)
- Campos especificos para rural (CAR, INCRA, hectares)
- Campos especificos para urbano (condominio, andar, vagas)

**Property Editor**

- Wizard multi-step
- Upload de imagens com drag-and-drop
- Geolocalizacao com mapa
- IA para sugestao de preco e descricao
- Validacao obrigatoria por campos

### 7.3 Modulo Territorial Rural

**Geointeligencia**

- Mapa interativo (Leaflet/React-Leaflet)
- Camadas: CAR, MapBiomas, IBAMA, Solo, Hidrografia
- Desenho de poligonos (Leaflet Draw)
- Area e perimetro calculados automaticamente
- KMZ/KML import/export

**Analise CAR**

- Busca por numero CAR
- Busca por coordenadas
- Busca por municipio
- Dados do proprietario, area, modulos fiscais

**Due Diligence**

- Checklist documental
- Status de cada documento
- Alertas de pendencias
- PDF de relatorio consolidado

**Valuation Rural**

- Metodos: comparativo, produtividade, custo de reposicao
- Dados de mercado (IBGE SIDRA)
- Mapa de valorizacao

**Dossie Inteligente**

- Relatorio consolidado de todos os dados
- PDF gerado automaticamente
- Inclui: CAR, analise ambiental, valuation, documentos

### 7.4 Modulo Locacao (Urbano)

**Lease Wizard**

- Multi-step: inquilino -> imovel -> contrato -> revisao
- Templates de contrato editaveis
- Geracao de PDF com pdfkit
- Envio por email
- Notificacoes de vencimento

**Dashboard Locacao**

- Contratos ativos, pendentes, vencidos
- Fluxo de caixa projetado
- Alertas de renovacao

### 7.5 Modulo WhatsApp

**Dashboard**

- Lista de instancias por tenant
- Status: conectado/desconectado
- QR Code para pareamento
- Chat list com busca
- Janela de conversa com historico
- Audio player
- Envio de mensagens
- Importacao de historico

**Backend**

- Proxy WebSocket autenticado
- Suporte a dois providers: WhatsMeow e WAHA
- Upload de midia via MinIO
- Retry de download de midia
- Cache de status de instancias

### 7.6 Modulo IA

**AI Assistant**

- Chat com IA para consultoria imobiliaria
- Contexto: imoveis, leads, mercado
- Integracao Gemini + Groq

**AI Agents**

- Matching automatico lead x imovel
- Geracao de descrices
- Resumo de atividades
- Sugestoes de acao

**Consulting Agent**

- Qualificacao de leads via questionario
- Score de compatibilidade
- Recomendacoes personalizadas

### 7.7 Modulo Site Builder

**Editor Visual**

- Drag-and-drop de blocos
- Blocos disponiveis: Hero, Texto, Imagem, Galeria, Mapa, Form, CTA, Footer, Testimonials, Stats, Property Grid, Custom HTML
- Preview em tempo real
- Publicacao com dominio customizado

**Templates**

- Templates pre-definidos por nicho
- Customizacao de cores, fontes, espacamento
- SEO settings (title, description, og:image)

### 7.8 Modulo Landing Pages

**Editor**

- Simples ao site builder, focado em conversao
- Templates: premium, legacy, designed, elementor
- Integracao com forms de captura
- Tracking de conversao

### 7.9 Modulo Super Admin

**Tenant Manager**

- Lista de todas as organizacoes
- Criar/editar/suspender tenants
- Impersonation para suporte
- Metricas por tenant

**Plan Manager**

- Planos com features JSONB
- Limites por plano (imoveis, usuarios)
- Trial management

**Billing Manager**

- Historico de pagamentos
- Status de assinatura
- Geracao de boletos

**Feature Flags**

- Flags globais
- Flags por tenant
- Flags por plano

**Audit Log**

- Todas as acoes de admin
- Filtros por data, usuario, acao
- Exportacao

---

## 8. INTEGRACOES EXTERNAS

| Servico         | Uso                       | Credenciais         |
| --------------- | ------------------------- | ------------------- |
| Supabase        | Database + Auth           | URL + Keys          |
| MinIO           | Storage de imagens/midias | Access Key + Secret |
| Gemini (Google) | IA generativa             | API Key             |
| Groq            | IA rapida (matching)      | API Key             |
| Orulo           | Dados de empreendimentos  | Client ID + Secret  |
| MapBiomas       | Dados ambientais          | Email + Password    |
| IBGE SIDRA      | Dados economicos rurais   | Public API          |
| IBAMA           | Embargos ambientais       | Public API          |
| Terra Brasilis  | Desmatamento              | Public API          |
| ConectaGov      | Dados governamentais      | Public API          |
| SICAR           | CAR rural                 | Public API          |
| DirectAdmin     | Gestao de dominios        | API Key             |
| Traefik         | Reverse proxy / SSL       | Config files        |

---

## 9. DEPLOY E INFRAESTRUTURA

### 9.1 Docker

```yaml
services:
  frontend:
    build: Dockerfile.frontend
    ports: ['3006:3006']
    environment:
      - VITE_SUPABASE_URL
      - VITE_SUPABASE_ANON_KEY

  api:
    build: Dockerfile.api
    ports: ['3002:3002']
    env_file: .env
    depends_on: [whatsapp-service]

  whatsapp:
    build: Dockerfile.whatsapp
    ports: ['3100:3100']

  document-worker:
    build: Dockerfile.document-worker

  traefik:
    image: traefik:v3
    ports: ['80:80', '443:443']
    volumes:
      - traefik-certs:/acme
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

### 9.2 Rotas via Traefik

```
imob.wootech.com.br      → frontend:3006
api.imob.wootech.com.br  → api:3002
*.okaimoveis.com.br      → frontend (wildcard)
*.fazendasbrasil.com     → frontend (wildcard)
```

### 9.3 SSL/TLS

- Let's Encrypt via Traefik
- Certificados wildcard via DNS challenge
- Auto-renewal automatico

---

## 10. DIRETRIZES DE CODIGO

### 10.1 Frontend

- **React 19** com TypeScript estrito (`strict: true`)
- **Tailwind CSS v4** via plugin Vite
- **Lazy loading** de TODAS as views com `React.lazy()`
- **Suspense** com fallback de carregamento
- **Error Boundary** global
- **Toast notifications** via `sonner`
- **NUNCA** usar `console.log` — usar `logger` de `@/utils/logger`
- **Componentes** max 200 linhas — decompor se maior
- **Hooks customizados** para logica de negocio reativa
- **Zod** para validacao de forms

### 10.2 Backend

- **Express 5** com rotas modulares
- **Middleware chain**: verifyAuth → requireTenant → handler
- **Todas as queries** filtram por `organization_id`
- **Rate limiting** por rota
- **Zod** para validacao de body
- **TTL Cache** para queries frequentes (profiles, orgs)
- **Error handler** global com códigos padronizados
- **NUNCA** expor `err.message` em producao
- **Logger estruturado** em vez de console.log

### 10.3 Testes

- **Minimo 30%** de cobertura para comecar
- **Unit tests** para services e helpers
- **Integration tests** para rotas criticas (auth, leads, properties)
- **E2E tests** para fluxos principais (login, criar lead, kanban)

---

## 11. METRICAS DE SUCESSO

| Metrica                       | Meta    |
| ----------------------------- | ------- |
| Time to First Load            | < 3s    |
| Lighthouse Score              | > 85    |
| Test Coverage                 | > 30%   |
| Bundle Size (gzipped)         | < 500KB |
| API Response Time (p95)       | < 500ms |
| Zero Critical Vulnerabilities | 0       |
| Error Rate (5xx)              | < 0.1%  |

---

## 12. ORDEM DE CONSTRUCAO (ROADMAP)

### Fase 1 — Fundacao (Semanas 1-2)

1. Setup do projeto (Vite + React + TS + Tailwind)
2. Supabase client + auth context
3. Login / Register
4. ProtectedRoute + PanelGuard
5. Layout base (AppShell, Sidebar, Header)
6. Database schema (organizations, profiles, properties)

### Fase 2 — Core CRM (Semanas 3-4)

7. CRUD de leads (backend + frontend)
8. Kanban Board (drag-and-drop)
9. Lead matching basico
10. Atividades de leads
11. Metricas CRM

### Fase 3 — Imoveis (Semanas 5-6)

12. CRUD de imoveis (urbano)
13. CRUD de imoveis (rural)
14. Upload de imagens (MinIO)
15. Listagem publica
16. Detalhe de imovel

### Fase 4 — WhatsApp (Semanas 7-8)

17. Proxy WhatsApp
18. WebSocket autenticado
19. Dashboard WhatsApp
20. Chat + historico
21. QR Code + instancias

### Fase 5 — Rural Intelligence (Semanas 9-10)

22. Mapas (Leaflet)
23. Integracao CAR
24. Due Diligence
25. Valuation rural
26. Dossie Inteligente

### Fase 6 — Locacao (Semanas 11-12)

27. Lease Wizard
28. Templates de contrato
29. Geracao de PDF
30. Dashboard de locacao

### Fase 7 — Super Admin (Semanas 13-14)

31. Tenant Manager
32. Plan Manager
33. Feature Flags
34. Audit Log
35. Impersonation

### Fase 8 — Marketing (Semanas 15-16)

36. Landing Page Editor
37. Site Builder
38. Quiz / Campanhas
39. Email center

### Fase 9 — IA (Semanas 17-18)

40. AI Assistant
41. AI Agents (matching)
42. Matching automatico lead x imovel

### Fase 10 — Polimento (Semanas 19-20)

43. Testes (30%+ coverage)
44. Performance optimization
45. Seguranca audit
46. Documentacao API
47. Deploy production

---

> **Este prompt serve como blueprint completo para reconstruir o IMOBZY do zero,
> incorporando todas as lições aprendidas, correções de segurança,
> e uma arquitetura mais limpa e escalável.**
