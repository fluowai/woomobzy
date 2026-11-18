# WOOTECH CRM IMOBILIÁRIO — AUDITORIA DE ACESSOS, FUNÇÕES E ARQUITETURA DE MENUS

**Documento:** `WOOTECH_IMOB_AUDITORIA_ACESSOS_E_MENUS.md`  
**Escopo:** Auditoria arquitetural e de UX (modo somente leitura) do ecossistema **Wootech CRM Imobiliário** (`woomobzy`)  
**Diretriz Visual do Novo Design System Wootech:** Interface 100% clara com fundo branco (`#FFFFFF`), superfícies secundárias em cinza ultraleve (`#F8FAFC`), tipografia **Inter**, texto principal escuro (`#0F172A` / `#334155`) e laranja institucional da marca (`#FF6A00`) aplicado em itens ativos, badges de destaque e chamadas para ação (CTAs).

---

## 1. RESUMO DOS NÍVEIS ENCONTRADOS E SEUS ESCOPOS

A arquitetura de autenticação e autorização do Wootech CRM Imobiliário combina autenticação via **Supabase Auth (JWT)** com enriquecimento de perfil na tabela `public.profiles`, vínculo organizacional em `public.organizations`, normalização de papéis no middleware Express (`server/middleware/auth.js`) e roteamento contextual no frontend (`src/lib/panelNavigation.ts` e guards em `components/`).

### 1.1. Mecanismo de Normalização de Papéis (`normalizeRole`)

No backend (`server/middleware/auth.js#L686-L723`), toda requisição autenticada passa por `verifyAuth`, que lê `profiles.role` (armazenando o valor bruto em `req.profileRole`) e o normaliza em `req.userRole`:

- **Papéis da Plataforma (`PLATFORM_ROLES` em `server/middleware/auth.js#L686-L689`):**
  - `'PLATFORM_OWNER'`, `'PLATFORM_ADMIN'`, `'MASTER_RESELLER_ADMIN'`, `'RESELLER_ADMIN'` (além de `'superadmin'`, `'megaadmin'`, `'platform_owner'`, `'platform_admin'`, `'master_reseller_admin'`, `'reseller_admin'`) $\rightarrow$ normalizados para `req.userRole = 'superadmin'`.
- **Papéis Administrativos / Corporativos (`server/middleware/auth.js#L704-L713`):**
  - `'admin'`, `'CUSTOMER_ADMIN'`, `'SUPPORT_MANAGER'`, `'FINANCE_ADMIN'`, `'DEPLOYMENT_MANAGER'` $\rightarrow$ normalizados para `req.userRole = 'admin'`.
- **Papéis Operacionais da Imobiliária (`server/middleware/auth.js#L714-L716`):**
  - `'gerente'` $\rightarrow$ `req.userRole = 'gerente'`
  - `'broker'` $\rightarrow$ `req.userRole = 'broker'`
  - `'assistente'` $\rightarrow$ `req.userRole = 'assistente'`
- **Papéis de Usuário Final (`server/middleware/auth.js#L717-L722`):**
  - `'user'`, `'CUSTOMER_USER'` (ou ausente) $\rightarrow$ `req.userRole = 'user'`.

---

### 1.2. Catálogo Completo dos Níveis Reais de Acesso

#### Nível 1 — Master / Dono da Plataforma (`PLATFORM_OWNER`)
- **Nome exibido na UI:** `Master` / `WooControl` / `Dono da Plataforma` (`components/WorkspaceTopBar.tsx#L53-L58`, `views/woocontrol/WooControlLayout.tsx#L170-L185`).
- **Identificador no código:**
  - Banco (`profiles.role`): `'PLATFORM_OWNER'` (ou `'platform_owner'`).
  - Frontend (`src/lib/panelNavigation.ts#L19-L26`): `isPlatformOwnerRole(role)` valida `'platform_owner'`.
  - Backend (`server/middleware/auth.js#L691-L702`, `server/lib/woo-control-access.js`): `req.profileRole = 'PLATFORM_OWNER'`, `req.userRole = 'superadmin'`.
- **Escopo dos dados:** **Plataforma Global (Multi-organização irrestrito)**. Enxerga todas as revendas (`is_reseller = true`), todas as imobiliárias urbanas, rurais e híbridas, licenças (`woo_licenses`), deployments (`woo_deployments`), snapshots, releases e métricas de receita global.
- **Como entra e quais contextos acessa:**
  - Ao autenticar sem impersonação ativa, `getAuthenticatedPanelPath()` (`src/lib/panelNavigation.ts#L71-L73`) redireciona para `/woo-control`.
  - Pela barra superior global (`components/WorkspaceTopBar.tsx#L41-L132`), pode alternar livremente entre **5 ambientes**: `/woo-control` (Master), `/megaadmin` (Mega Admin), `/superadmin` (Painel de Revenda), `/urban` (CRM Urbano) e `/rural` (CRM Rural).
  - Também pode iniciar sessões formais de suporte/impersonação (`impersonation_sessions`) para assumir o `organization_id` de qualquer revenda ou imobiliária (`server/middleware/auth.js#L35-L84`).
- **Permissões fixas vs. variáveis:** Todas as permissões são fixas e máximas; ignora bloqueios de assinatura (`SubscriptionGuard.tsx#L106`) e suspensão (`SuspendedGuard.tsx#L21`), e faz bypass de `requireTenant` (`server/middleware/tenant.js#L29`). **Restrição importante:** a API `/api/woo-control/*` (`server/routes/woo-control.js#L17-L28`) bloqueia chamadas enquanto o Master estiver em modo suporte (`isImpersonating`), exigindo saída do modo suporte para operar o WooControl.

#### Nível 2 — Administrador Global da Plataforma (`MegaAdmin` / `PLATFORM_ADMIN` / `superadmin` Global)
- **Nome exibido na UI:** `Mega Admin` / `God Mode` (`views/megaadmin/MegaAdminLayout.tsx#L168-L176`).
- **Identificador no código:**
  - Banco (`profiles.role`): `'superadmin'`, `'megaadmin'` ou `'PLATFORM_ADMIN'` vinculado a uma organização com `organizations.is_reseller = false` (ou `organization_id = null`).
  - Frontend (`src/lib/panelNavigation.ts#L36-L46`): `isMegaAdminProfile(profile)` verifica `isPlatformAdminRole(profile.role)` e `!profile.organization?.is_reseller`.
  - Backend (`server/middleware/auth.js#L918-L946`): `verifyMegaAdmin` exige `req.userRole === 'superadmin'` e confirma no banco que a organização real do usuário **não** possui `is_reseller = true`.
- **Escopo dos dados:** **Plataforma Global**. Gerencia todas as organizações (`parent_id IS NULL` ou filhas), planos globais, domínios, feature flags globais, monitoramento de infraestrutura, inteligência de storage MinIO/S3 e migrações.
- **Como entra e quais contextos acessa:**
  - Redirecionado no login para `/megaadmin` (`src/lib/panelNavigation.ts#L81-L83`).
  - Pela `WorkspaceTopBar.tsx#L41-L72`, pode alternar diretamente entre `/megaadmin`, `/superadmin`, `/urban` e `/rural` (exceto `/woo-control`, que é exclusivo de `PLATFORM_OWNER`).
  - Pode impersonar qualquer imobiliária ou revenda via `/api/admin/tenants/:id/impersonate`.
- **Permissões fixas vs. variáveis:** Fixas em nível de plataforma; bypassa `SubscriptionGuard` e `SuspendedGuard`.

#### Nível 3 — Revenda Whitelabel (`SuperAdmin` / `RESELLER_ADMIN` / `MASTER_RESELLER_ADMIN`)
- **Nome exibido na UI:** `Super Admin` / `Painel da Revenda` (`views/superadmin/SuperAdminLayout.tsx#L152-L165`).
- **Identificador no código:**
  - Banco (`profiles.role`): `'superadmin'`, `'RESELLER_ADMIN'` ou `'MASTER_RESELLER_ADMIN'` vinculado a uma organização onde `organizations.is_reseller = true`.
  - Frontend (`src/lib/panelNavigation.ts#L76-L78`, `components/SuperAdminGuard.tsx#L19-L41`): identificado por `isPlatformAdminRole(profile.role)` com `profile.organization?.is_reseller === true`.
  - Backend (`server/routes/admin.js#L49-L105`): `getSuperAdminOrganizationScope(req)` detecta `org.is_reseller === true` e retorna `mode: 'reseller'`, restringindo todas as queries de `organizations` a `.eq('parent_id', scope.organizationId).eq('is_reseller', false)`.
- **Escopo dos dados:** **Carteira da Revenda (`parent_id = reseller_org_id`)** + **Própria Organização da Revenda (`req.orgId = reseller_org_id`)** quando navega nos módulos operacionais `/urban` ou `/rural`.
- **Como entra e quais contextos acessa:**
  - Entra por padrão em `/superadmin` (`src/lib/panelNavigation.ts#L76-L78`).
  - Pela `WorkspaceTopBar.tsx#L41-L72` e pelos atalhos do menu lateral (`SuperAdminLayout.tsx#L130-L141`), pode alternar para `/urban` (Painel Urbano) e `/rural` (Painel Rural) usando a própria organização da revenda ou impersonando uma imobiliária filha (`impersonation_sessions`).
- **Permissões fixas vs. variáveis:**
  - **Fixas:** Gestão de imobiliárias filhas (`tenants`), planos da revenda, billing da revenda, domínios das filhas, templates, equipe da revenda, créditos de conexão WhatsApp e acesso total às funções de `/urban` e `/rural`.
  - **Bloqueadas (exclusivas de MegaAdmin/Master):** `FeatureFlags`, `PlatformMonitoring`, `StorageIntelligence`, `SmartImporter`, `FluowaiMigration` e criação de outras revendas (`is_reseller = true`).

#### Nível 4 — Admin da Imobiliária (`admin` / `CUSTOMER_ADMIN`)
- **Nome exibido na UI:** `Administrador` / `Gestor` (`components/UrbanLayout.tsx#L451-L457`, `views/admin/UserManagement.tsx`).
- **Identificador no código:**
  - Banco (`profiles.role`): `'admin'` (ou `'CUSTOMER_ADMIN'`, `'SUPPORT_MANAGER'`, `'FINANCE_ADMIN'`, `'DEPLOYMENT_MANAGER'`).
  - Normalizado em `server/middleware/auth.js#L704-L713` para `req.userRole = 'admin'`.
  - Passa no middleware `verifyAdmin` (`server/middleware/auth.js#L888-L900`).
- **Escopo dos dados:** **Imobiliária (`organization_id = profile.organization_id`)**. Isolamento garantido pelo middleware `requireTenant` (`server/middleware/tenant.js#L15-L205`), que injeta `req.orgId` a partir do perfil autenticado.
- **Como entra e quais contextos acessa:**
  - Redirecionado no login por `getTenantPanelPath(profile)` (`src/lib/panelNavigation.ts#L48-L62`):
    - Se `organization.type === 'rural'` $\rightarrow$ `/rural`
    - Se `organization.type === 'traditional'` ou `'both'` $\rightarrow$ `/urban`
  - Se a organização for `'both'` (híbrida) ou se o usuário acessar diretamente, o `PanelGuard.tsx` controla a entrada em `/urban` e `/rural` conforme `organizations.type`.
- **Permissões fixas vs. variáveis:**
  - **Fixas no código:** Acesso completo a todas as rotas da imobiliária, incluindo `verifyAdmin` (`POST/PUT/DELETE /api/properties`, `POST/PATCH/DELETE /api/admin/users`, configurações de sistema `SystemSettings.tsx`).
  - **Variáveis por Plano/Assinatura:** Sujeito a `SubscriptionGuard.tsx` (status `active` ou `trial` dentro de 7 dias; se expirado, redireciona para `/ billing-blocked` ou tela de bloqueio) e `SuspendedGuard.tsx` (`organizations.status === 'suspended'`).
  - **Variáveis por Tipo de Organização (`organizations.type`):** Define se opera em `/urban` (`traditional`), `/rural` (`rural`) ou ambos (`both`).

#### Nível 5 — Supervisor / Gerente Comercial (`gerente`)
- **Nome exibido na UI:** `Gerente` (`views/admin/UserManagement.tsx`, `server/routes/admin.js#L1584`).
- **Identificador no código:**
  - Banco (`profiles.role`): `'gerente'`.
  - Backend (`server/middleware/auth.js#L714`): `req.userRole = 'gerente'`.
  - Frontend (`context/AuthContext.tsx#L27`): a interface TypeScript `UserProfile` declara apenas `role: 'admin' | 'broker' | 'superadmin'`, mas em tempo de execução recebe `'gerente'` do banco.
- **Escopo dos dados:** **Imobiliária (`organization_id`)**. Não há filtro de "equipe" (`team_id`) implementado nas rotas de leads, imóveis ou locação; portanto, enxerga todos os registros da organização (`req.orgId`).
- **Como entra e quais contextos acessa:** Entra em `/urban` ou `/rural` conforme `organizations.type`.
- **Permissões fixas vs. variáveis (Divergência Crítica Identificada):**
  - No frontend (`UrbanLayout.tsx` e `RuralLayout.tsx`), como `profile.role !== 'broker'`, o `gerente` **vê exatamente o mesmo menu lateral do `admin`** e vê todas as 8 abas de `SystemSettings.tsx` (`views/SystemSettings.tsx#L274`).
  - Porém, no backend, o middleware `verifyAdmin` (`server/middleware/auth.js#L888-L900`) aceita apenas `['admin', 'superadmin']`. Assim, o `gerente` **recebe HTTP 403** ao tentar criar/editar/excluir imóveis (`POST/PUT/DELETE /api/properties` em `server/api/properties/index.js#L140,L199,L241`) ou gerir usuários (`/api/admin/users`), mas **consegue executar tudo** em rotas protegidas apenas por `verifyAuth` (`/api/crm/leads`, `/api/locacao/*`, `/api/cobranca/*`, `/api/sites/*`, `/api/quiz/*`, `/api/ai/*`, `/api/documents/*`).

#### Nível 6 — Corretor / Consultor Imobiliário (`broker`)
- **Nome exibido na UI:** `Corretor` (`components/UrbanLayout.tsx#L455`, `views/admin/UserManagement.tsx`).
- **Identificador no código:**
  - Banco (`profiles.role`): `'broker'`.
  - Backend (`server/middleware/auth.js#L715`): `req.userRole = 'broker'`.
- **Escopo dos dados:** **Imobiliária (`organization_id`) com restrições parciais na UI**.
  - Embora exista a coluna `broker_id` / `assigned_to` em `leads` e `broker_id` em `properties`, o endpoint `GET /api/crm/leads` (`server/api/crm/leads.routes.js#L31-L55`) e `GET /api/properties` (`server/api/properties/index.js#L35-L120`) filtram apenas por `organization_id = req.orgId`, retornando todos os leads e imóveis da imobiliária para qualquer corretor autenticado.
- **Como entra e quais contextos acessa:** Entra em `/urban` ou `/rural` conforme `organizations.type`.
- **Permissões fixas vs. variáveis:**
  - **No Frontend:** Vê todo o menu lateral de `UrbanLayout` e `RuralLayout`, mas ao abrir `/urban/settings` ou `/rural/settings` (`views/SystemSettings.tsx#L274-L343`), a tela bloqueia as 8 abas administrativas e renderiza **exclusivamente o cartão "Integração Órulo — Minha conta Órulo"** para conexão individual OAuth2 do corretor.
  - **No Backend:** Bloqueado por `verifyAdmin` (`HTTP 403` em `POST/PUT/DELETE /api/properties` e `/api/admin/users`), mas autorizado por `verifyAuth` em Leads, Clientes, Agenda, Locação, Cobrança, Sites, Landing Pages, Quiz e IA.

#### Nível 7 — Atendente / Assistente Administrativo (`assistente`)
- **Nome exibido na UI:** `Assistente` (`views/admin/UserManagement.tsx`, `server/routes/admin.js#L1584`).
- **Identificador no código:**
  - Banco (`profiles.role`): `'assistente'`.
  - Backend (`server/middleware/auth.js#L716`): `req.userRole = 'assistente'`.
- **Escopo dos dados:** **Imobiliária (`organization_id`)**.
- **Como entra e quais contextos acessa:** Entra em `/urban` ou `/rural` conforme `organizations.type`.
- **Permissões fixas vs. variáveis:**
  - **No Frontend:** Como `SystemSettings.tsx#L274` testa apenas `if (profile?.role === 'broker')`, o perfil `assistente` acaba vendo todas as abas de Configurações e todo o menu lateral.
  - **No Backend:** Mesmo comportamento de `broker` e `gerente` — bloqueado em rotas `verifyAdmin` (`POST/PUT/DELETE /api/properties`, `/api/admin/users`) e liberado em rotas `verifyAuth`.

#### Nível 8 — Usuário Final Autenticado / Cliente (`user` / `CUSTOMER_USER`) e Atores dos Portais
- **Identificador no código:**
  - Banco (`profiles.role`): `'user'` ou `'CUSTOMER_USER'` $\rightarrow$ normalizado para `req.userRole = 'user'` (`server/middleware/auth.js#L717-L722`).
- **Subperfis de Portal determinados por vínculo de dados:**
  1. **Proprietário (Urbano e Rural):** Autenticado via Supabase Auth; a tela `PortalProprietarioUrbano.tsx` (`#L64-L70`) e `PortalProprietarioRural.tsx` busca na tabela `clients` um registro com `.eq('organization_id', profile.organization_id).ilike('email', profile.email).contains('roles', ['Proprietario'])` e filtra `properties` por `.eq('owner_id', owner.id)`.
  2. **Comprador / Investidor (Urbano e Rural):** Autenticado via Supabase Auth; acessa `PortalCompradorUrbano.tsx` (`#L46-L71`) e `PortalCompradorRural.tsx`, consultando imóveis da organização e salvando favoritos em `urban_property_favorites` / `rural_property_favorites` vinculados a `profile.id`.
  3. **Locatário (`PortalLocatario.tsx#L57-L90`):** Acessível na rota pública `/portal-locatario` (`App.tsx#L289`) ou interna `/urban/portal-locatario` (`App.tsx#L493`). Filtra contratos ativos em `rental_contracts` onde `tenant_cpf = profile.cpf` ou `tenant_email ILIKE profile.email` e lista faturas da tabela `billing`.
  4. **Signatário Externo (`SignaturePortal.tsx#L7-L90`):** Acesso público sem login via token único em `/assinatura/:token` (`App.tsx#L291`). Realiza leitura do contrato, selfie, foto do documento, geolocalização e validação de código WhatsApp via `/api/locacao/internal-signature/sign/:token`.
  5. **Visitante Público:** Acessa vitrines imobiliárias (`/site/:slug/*`, `/sites/:slug/*` ou domínio próprio via `DomainRouter.tsx`), Landing Pages (`/lp/:slug`) e Quizzes interativos (`/quiz/:slug`).

---

### 1.3. Relação Estrutural entre Urbano, Rural e Revenda

| Conceito | Natureza no Sistema | Onde é Definido | Como se Relaciona com os Perfis |
| :--- | :--- | :--- | :--- |
| **Urbano (`urban` / `traditional`)** | **Contexto de Navegação + Módulo de Negócio** | `organizations.type = 'traditional'` ou `'both'`; rotas sob `/urban/*` com layout `components/UrbanLayout.tsx` e guarda `components/PanelGuard.tsx`. | Acessado nativamente por `admin`, `gerente`, `broker` e `assistente` de imobiliárias urbanas/híbridas. Também acessível por `PLATFORM_OWNER`, `MegaAdmin` e `Revenda` via `WorkspaceTopBar` ou impersonação. |
| **Rural (`rural`)** | **Contexto de Navegação + Módulo de Negócio Agro/Fundiário** | `organizations.type = 'rural'` ou `'both'`; rotas sob `/rural/*` com layout `components/RuralLayout.tsx` e guarda `components/PanelGuard.tsx`. | Acessado nativamente por `admin`, `gerente`, `broker` e `assistente` de imobiliárias rurais/híbridas. Adiciona módulos de Inteligência Territorial (Mapas GIS, CAR, Valuation CAR, Dossiê 360, Due Diligence Fundiária). |
| **Revenda (`superadmin` + `is_reseller`)** | **Perfil Administrativo + Contexto de Gestão Multi-Tenant (B2B2B)** | `organizations.is_reseller = true` combinado com `profiles.role IN ('superadmin', 'RESELLER_ADMIN', 'MASTER_RESELLER_ADMIN')`; rotas sob `/superadmin/*` em `views/superadmin/SuperAdminLayout.tsx`. | Atua como painel gestor de carteira de imobiliárias filhas (`parent_id = reseller.id`). Além do painel `/superadmin`, o gestor da revenda possui acesso liberado pelo `PanelGuard.tsx#L28-L35` para navegar em `/urban` e `/rural`. |

---

## 2. INVENTÁRIO DE FUNÇÕES E MATRIZ DE ACESSO

A tabela a seguir cruza todos os itens de barra lateral (`UrbanLayout`, `RuralLayout`, `SuperAdminLayout`, `MegaAdminLayout`, `WooControlLayout`), cabeçalho (`WorkspaceTopBar`), abas internas, telas acessíveis por URL direta em `App.tsx` e endpoints de backend em `server/`.

### Legenda de Status de Verificação
- **Confirmada no código:** Rota, componente e regra de autorização verificados no código-fonte e validados no ambiente local (`localhost:3006` / `localhost:3002`).
- **Condicionada:** Função depende de tipo de organização (`traditional`/`rural`/`both`), assinatura ativa (`SubscriptionGuard`), feature flag ou vínculo de cadastro (`owner_id`, `tenant_cpf`).
- **Parcial:** Tela existe na rota ou no backend, mas não está exposta no menu lateral principal ou apresenta divergência entre permissão visual e permissão de API.

### 2.1. Matriz Completa de Funções e Autorizações

| Área | Função | Nome no menu atual | Rota | Perfis que veem | Perfis autorizados | Ações autorizadas e escopo | Condições | Evidência |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Governança Master (WooControl)** | Visão Geral de Licenças, MRR e Heartbeats | `Overview` | `/woo-control/overview` | `PLATFORM_OWNER` | `PLATFORM_OWNER` | **Visualizar:** KPIs globais de organizações, licenças, deployments e receita. Escopo: Plataforma Global. | Exige `!isImpersonating` (fora do modo suporte). **Confirmada no código.** | `App.tsx#L533-L545`, `WooControlGuard.tsx#L18-L23`, `server/routes/woo-control.js#L17-L29,L112` |
| **Governança Master (WooControl)** | Rede Global de Revendas e Imobiliárias | `Network` | `/woo-control/network` | `PLATFORM_OWNER` | `PLATFORM_OWNER` | **Visualizar, Criar, Editar, Excluir, Suspender:** Organizações, revendas e clientes finais. Escopo: Plataforma Global. | Exige `PLATFORM_OWNER` fora do modo suporte. **Confirmada no código.** | `WooControlLayout.tsx#L41-L55`, `server/routes/woo-control.js#L210-L480` |
| **Governança Master (WooControl)** | Catálogo de Produtos e Planos Master | `Products` | `/woo-control/products` | `PLATFORM_OWNER` | `PLATFORM_OWNER` | **Visualizar, Criar, Editar, Excluir:** Produtos SaaS (`woo_products`) e planos (`woo_plans`). Escopo: Plataforma Global. | Exige `PLATFORM_OWNER`. **Confirmada no código.** | `App.tsx#L540`, `server/routes/woo-control.js#L510-L680` |
| **Governança Master (WooControl)** | Gestão de Licenças e Chaves | `Licensing` | `/woo-control/licensing` | `PLATFORM_OWNER` | `PLATFORM_OWNER` | **Visualizar, Emitir, Renovar, Suspender, Revogar:** Licenças (`woo_licenses`). Escopo: Plataforma Global. | Exige `PLATFORM_OWNER`. **Confirmada no código.** | `App.tsx#L541`, `server/routes/woo-control.js#L685-L830` |
| **Governança Master (WooControl)** | Deployments, Snapshots, Releases e Stack Generator | `Deployments`, `Snapshots`, `Releases`, `Stack Generator` | `/woo-control/deployments`, `/woo-control/snapshots`, `/woo-control/releases`, `/woo-control/stack-generator` | `PLATFORM_OWNER` | `PLATFORM_OWNER` | **Visualizar, Criar, Configurar, Exportar:** Instâncias, snapshots de banco, releases de versão e geração de `docker-compose`/stack. Escopo: Plataforma Global. | Exige `PLATFORM_OWNER`. **Confirmada no código.** | `App.tsx#L542-L545`, `WooControlLayout.tsx#L45-L52`, `server/routes/woo-control.js#L835-L1120` |
| **Governança Master (WooControl)** | Suporte Master, Academy, Receita e Segurança | `Support`, `Academy`, `Revenue`, `Security` | `/woo-control/support`, `/woo-control/academy`, `/woo-control/revenue`, `/woo-control/security` | `PLATFORM_OWNER` | `PLATFORM_OWNER` | **Visualizar, Responder, Auditar, Configurar:** Tickets globais, trilhas de treinamento, auditoria de segurança e faturamento global. | Exige `PLATFORM_OWNER`. **Confirmada no código.** | `App.tsx#L546-L549`, `server/routes/woo-control.js#L1125-L1343` |
| **Admin Global (MegaAdmin)** | Dashboard Global da Plataforma | `Dashboard Global` | `/megaadmin` | `PLATFORM_OWNER`, `MegaAdmin` | `PLATFORM_OWNER`, `MegaAdmin` | **Visualizar:** Métricas globais de tenants, usuários, imóveis e MRR. Escopo: Plataforma Global. | Bloqueado para revendas (`!org.is_reseller`). **Confirmada no código.** | `MegaAdminGuard.tsx#L17-L38`, `MegaAdminLayout.tsx#L42`, `server/middleware/auth.js#L918-L946` |
| **Admin Global (MegaAdmin)** | Gestão Global de Imobiliárias e Revendas | `Imobiliárias & Revendas` | `/megaadmin/tenants` | `PLATFORM_OWNER`, `MegaAdmin` | `PLATFORM_OWNER`, `MegaAdmin` | **Visualizar, Criar, Editar, Suspender, Excluir, Impersonar:** Qualquer organização ou revenda (`is_reseller`). Escopo: Plataforma Global. | **Confirmada no código.** | `App.tsx#L565`, `views/superadmin/TenantManager.tsx`, `server/routes/admin.js#L107-L520` |
| **Admin Global (MegaAdmin)** | Feature Flags Globais | `Feature Flags` | `/megaadmin/features` | `PLATFORM_OWNER`, `MegaAdmin` | `PLATFORM_OWNER`, `MegaAdmin` | **Visualizar, Configurar:** Ativar/desativar módulos globais (`ai_assistant`, `whatsapp_integration`, `portal_sync`, `rural_gis`, `custom_domains`, etc.). | Persistido em `site_settings.integrations_config.feature_flags`. **Confirmada no código.** | `App.tsx#L570`, `views/megaadmin/FeatureFlags.tsx#L28-L135` |
| **Admin Global (MegaAdmin)** | Monitoramento, Analytics e Inteligência de Storage | `Monitoramento`, `Analytics Global`, `Storage S3/MinIO` | `/megaadmin/monitoring`, `/megaadmin/analytics`, `/megaadmin/storage` | `PLATFORM_OWNER`, `MegaAdmin` | `PLATFORM_OWNER`, `MegaAdmin` | **Visualizar, Auditar, Limpar:** Saúde da API/DB, métricas de uso e ocupação do bucket MinIO (`imob.erp`). Escopo: Plataforma Global. | Exige `verifyMegaAdmin` no backend. **Confirmada no código.** | `App.tsx#L573-L579`, `server/routes/admin.js`, `views/megaadmin/StorageIntelligence.tsx` |
| **Admin Global (MegaAdmin)** | Importador Inteligente e Migração FluowAI | `Smart Importer`, `Migração FluowAI` | `/megaadmin/importer`, `/megaadmin/fluowai-migration` | `PLATFORM_OWNER`, `MegaAdmin` | `PLATFORM_OWNER`, `MegaAdmin` | **Criar, Importar, Executar:** Importação massiva de imóveis/leads e migração de legados. Escopo: Plataforma Global. | **Confirmada no código.** | `App.tsx#L577-L578`, `views/megaadmin/SmartImporter.tsx`, `views/megaadmin/FluowaiMigration.tsx` |
| **Gestão de Revenda (SuperAdmin)** | Dashboard da Revenda | `Dashboard` | `/superadmin` | `PLATFORM_OWNER`, `MegaAdmin`, `Revenda` | `PLATFORM_OWNER`, `MegaAdmin`, `Revenda` | **Visualizar:** Total de imobiliárias filhas, assinaturas ativas, divisão Urbano/Rural e MRR da revenda. Escopo: Carteira da Revenda (`parent_id = reseller.id`). | Condicionada a `isPlatformAdminRole` (`SuperAdminGuard.tsx`). **Confirmada no código.** | `App.tsx#L596`, `SuperAdminLayout.tsx#L53`, `server/routes/admin.js#L85-L105` |
| **Gestão de Revenda (SuperAdmin)** | Gestão de Imobiliárias da Revenda | `Imobiliárias` | `/superadmin/tenants` | `PLATFORM_OWNER`, `MegaAdmin`, `Revenda` | `PLATFORM_OWNER`, `MegaAdmin`, `Revenda` | **Visualizar, Criar, Editar, Suspender, Excluir, Impersonar:** Imobiliárias filhas (`parent_id = reseller.id`, `is_reseller = false`). | Revenda não pode criar outra revenda (`server/routes/admin.js#L290-L315`). **Confirmada no código.** | `App.tsx#L597`, `views/superadmin/TenantManager.tsx`, `server/routes/admin.js#L85-L340` |
| **Gestão de Revenda (SuperAdmin)** | Suporte, Equipe, Planos e Billing da Revenda | `Suporte`, `Equipe`, `Planos`, `Billing` | `/superadmin/support`, `/superadmin/team`, `/superadmin/plans`, `/superadmin/billing` | `PLATFORM_OWNER`, `MegaAdmin`, `Revenda` | `PLATFORM_OWNER`, `MegaAdmin`, `Revenda` | **Visualizar, Criar, Editar, Atribuir, Cobrar:** Tickets das imobiliárias filhas, membros da revenda, planos comerciais e faturas. Escopo: Revenda. | **Confirmada no código.** | `SuperAdminLayout.tsx#L54-L90`, `App.tsx#L598-L611`, `server/routes/admin.js` |
| **Gestão de Revenda (SuperAdmin)** | Audit Log, Templates, Domínios, Consultoria, Marketing & SEO, Conexões WA e Configurações | `Audit Log`, `Templates`, `Domínios`, `Consultoria`, `Marketing & SEO`, `Conexões WA`, `Configurações` | `/superadmin/audit`, `/superadmin/templates`, `/superadmin/domains`, `/superadmin/consulting`, `/superadmin/marketing`, `/superadmin/connections`, `/superadmin/settings` | `PLATFORM_OWNER`, `MegaAdmin`, `Revenda` | `PLATFORM_OWNER`, `MegaAdmin`, `Revenda` | **Visualizar, Criar, Editar, Configurar:** Logs de auditoria, templates de sites/contratos, domínios customizados, leads de consultoria, SEO da landing de vendas, cotas de WhatsApp e whitelabel da revenda. | **Confirmada no código.** | `SuperAdminLayout.tsx#L91-L128`, `App.tsx#L600-L614` |
| **Visão Geral (Urbano / Rural)** | Dashboard Operacional Urbano / Rural | `Dashboard` | `/urban`, `/rural` | Todos os perfis do tenant + Admins de Plataforma/Revenda | Todos os perfis autenticados (`verifyAuth`) | **Visualizar:** VGV, imóveis ativos, leads no funil, visitas agendadas, gráficos de performance e atalhos rápidos. Escopo: Imobiliária (`organization_id`). | Redirecionado conforme `organizations.type`. **Confirmada no código.** | `UrbanLayout.tsx#L96`, `RuralLayout.tsx#L94`, `views/UrbanDashboard.tsx`, `views/RuralDashboard.tsx` |
| **Visão Geral (Urbano / Rural)** | Visão 360 Executiva | `Visão 360` | `/urban/dashboard-360`, `/rural/dashboard-360` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Filtrar:** Visão consolidada executiva de vendas, locação, atendimento e marketing. Escopo: Imobiliária (`organization_id`). | **Confirmada no código.** | `UrbanLayout.tsx#L97`, `RuralLayout.tsx#L95`, `views/admin/Dashboard360.tsx` |
| **Visão Geral (Urbano / Rural)** | Business Intelligence (BI Urbano / BI Rural) | `Relatórios / BI` | `/urban/bi`, `/rural/bi` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Exportar:** Indicadores analíticos de conversão, origem de leads, ticket médio e performance por corretor/região. Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L140`, `RuralLayout.tsx#L139`, `views/BIUrbano.tsx`, `views/BIRural.tsx` |
| **Atendimento (Urbano / Rural)** | Inbox Omnichannel e Assistente IA | `Atendimento` (Urbano) / `Mensagens` (Rural) | `/urban/atendimento`, `/rural/atendimento` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Responder, Atribuir, Transferir Humana/IA:** Conversas de WhatsApp (Evolution API), Instagram e Webchat. Escopo: Imobiliária (`organization_id`). | **Confirmada no código.** | `UrbanLayout.tsx#L101`, `RuralLayout.tsx#L99`, `views/AIAssistant.tsx`, `server/api/ai/chat.routes.js` |
| **Atendimento (Urbano / Rural)** | Central IA Workforce (Operações e Agentes) | `Central IA` | `/urban/ai`, `/rural/ai` (e sub-rotas `/ai/operations/new`, `/ai/operations/:id`, `/ai/agents/:id`, `/ai/sandbox`, `/ai/architecture`, `/ai/knowledge`, `/ai/history`, `/ai/logs`) | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar, Editar, Testar (Sandbox), Treinar Base de Conhecimento:** Operações de IA, agentes SDR/Closer, fluxos de arquitetura e logs. Escopo: Imobiliária. | Sub-rotas acessíveis por botões internos da `AICentral.tsx`. **Confirmada no código.** | `UrbanLayout.tsx#L102`, `RuralLayout.tsx#L100`, `App.tsx#L326-L361,L434-L469`, `server/api/ai/agents.routes.js#L15` |
| **Atendimento (Urbano / Rural)** | Fila de Espera (Waitlist) | `Fila de Espera` | `/urban/waitlist`, `/rural/waitlist` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar, Editar, Atribuir:** Leads aguardando disponibilidade de imóvel ou atendimento. Escopo: Imobiliária (`organization_id`). | **Confirmada no código.** | `UrbanLayout.tsx#L103`, `RuralLayout.tsx#L101`, `views/admin/WaitlistLeads.tsx` |
| **Comercial (Urbano / Rural)** | Gestão de Leads (Lista) | `Leads` | `/urban/leads`, `/rural/leads` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar, Editar, Excluir, Qualificar, Vincular Imóvel:** Leads da imobiliária. *Nota:* Backend retorna todos os leads de `req.orgId` sem filtrar por `broker_id`. | **Confirmada no código.** | `UrbanLayout.tsx#L107`, `RuralLayout.tsx#L105`, `views/CRM/CRMLeads.tsx`, `server/api/crm/leads.routes.js#L18-L215` |
| **Comercial (Urbano / Rural)** | Funil / Pipeline Kanban | `Funil / CRM` | `/urban/kanban`, `/rural/kanban` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Mover Etapas (Drag & Drop), Editar:** Cards de oportunidades do mesmo banco `leads`. Escopo: Imobiliária (`organization_id`). | **Confirmada no código.** | `UrbanLayout.tsx#L108`, `RuralLayout.tsx#L106`, `views/CRM/KanbanBoard.tsx` |
| **Comercial (Urbano / Rural)** | Carteira de Clientes (Proprietários, Compradores, Locatários) | `Clientes` | `/urban/clientes`, `/rural/clientes` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar, Editar, Excluir:** Cadastro unificado em `clients` com papéis (`Proprietario`, `Comprador`, `Locatario`, `Fiador`). Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L109`, `RuralLayout.tsx#L107`, `views/CRM/ClientsManager.tsx`, `server/api/crm/clients/index.js#L9` |
| **Comercial (Urbano / Rural)** | Agenda Comercial e Visitas | `Minha Agenda` | `/urban/agenda`, `/rural/agenda` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar, Editar, Concluir, Cancelar:** Compromissos, visitas e follow-ups (`appointments`). Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L110`, `RuralLayout.tsx#L108`, `views/CRM/Agenda.tsx` |
| **Comercial (Urbano / Rural)** | Matchmaking 360 (Cruzamento Lead x Imóvel) | `Matchmaking 360` | `/urban/matchmaking`, `/rural/matchmaking` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Cruzar Perfis, Disparar Oportunidade:** Algoritmo de compatibilidade entre demandas de leads e carteira de imóveis. Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L111`, `RuralLayout.tsx#L109`, `views/admin/Matchmaking360.tsx` |
| **Comercial (Urbano / Rural)** | Qualificação de Consultoria | *(Sem item no menu lateral)* | `/urban/qualificacao`, `/rural/qualificacao` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`ProtectedRoute`) | **Visualizar, Qualificar:** Diagnóstico consultivo de leads de alto ticket. Escopo: Imobiliária. | **Parcial** (rota ativa no `App.tsx`, oculta no menu lateral). | `App.tsx#L362,L470`, `views/ConsultingQualificacao.tsx` |
| **Comercial / Imóveis (Urbano)** | Funil de Captação de Imóveis | *(Sem item no menu lateral)* | `/urban/captacao` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar, Aprovar, Converter em Imóvel:** Prospecção de imóveis de proprietários (`urban_captacoes`). Escopo: Imobiliária. | **Parcial** (rota e API `/api/urban/captacoes` ativas, ausente na sidebar). | `App.tsx#L502`, `views/urban/CaptacaoFunil.tsx`, `server/api/urban/index.js#L18` |
| **Imóveis (Urbano / Rural)** | Catálogo e Gestão de Imóveis | `Imóveis` | `/urban/properties`, `/rural/properties` | Todos os perfis do tenant | **Leitura:** `verifyAuth` (Todos). **Criar/Editar/Excluir:** `verifyAdmin` (`admin`, `superadmin`). | **Visualizar:** Todos os perfis da imobiliária. **Criar (`POST`), Editar (`PUT`), Excluir (`DELETE`):** Apenas `admin` e `superadmin` (`gerente`, `broker` e `assistente` recebem 403 na API). | **Divergência Menu vs. API confirmada no código.** | `UrbanLayout.tsx#L115`, `RuralLayout.tsx#L113`, `views/PropertyManagement.tsx`, `server/api/properties/index.js#L35,L140,L199,L241` |
| **Imóveis (Urbano / Rural)** | Editor de Imóvel (Novo / Edição) | *(Acionado dentro de Imóveis)* | `/urban/properties/new`, `/urban/properties/:id`, `/rural/properties/new`, `/rural/properties/:id` | Todos os perfis (botão "+ Novo Imóvel" visível a todos) | `admin`, `superadmin` (`verifyAdmin` no `POST`/`PUT`) | **Criar, Editar, Upload de Fotos (MinIO):** Dados cadastrais, preço, endereço, características e mídia. Escopo: Imobiliária. | `broker`/`gerente` abrem o formulário, mas a gravação na API exige `verifyAdmin`. **Confirmada no código.** | `App.tsx#L316-L319,L424-L427`, `views/PropertyEditor.tsx`, `server/api/properties/index.js#L140,L199` |
| **Imóveis (Urbano)** | Empreendimentos, Incorporações e Loteamentos | `Empreendimentos` | `/urban/empreendimentos`, `/urban/empreendimentos/:id` | Todos os perfis do tenant Urbano | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar, Editar, Gerir Espelho de Vendas/Quadras/Lotes:** Empreendimentos verticais e horizontais. Escopo: Imobiliária. | Exclusivo do contexto Urbano. **Confirmada no código.** | `UrbanLayout.tsx#L116`, `App.tsx#L477-L478`, `views/urban/Empreendimentos.tsx`, `views/urban/LoteamentoDetails.tsx` |
| **Imóveis (Urbano)** | Controle de Chaves e Portaria | *(Sem item no menu lateral)* | `/urban/chaves` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Retirar Chave, Devolver Chave:** Controle físico de chaves no quadro da imobiliária (`urban_key_logs`). Escopo: Imobiliária. | **Parcial** (rota e API `/api/urban/chaves` ativas, ausente na sidebar). | `App.tsx#L497`, `views/urban/ControleChaves.tsx`, `server/api/urban/index.js` |
| **Imóveis (Urbano)** | Administração de Condomínios | *(Sem item no menu lateral)* | `/urban/condominios` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar, Editar:** Condomínios, assembleias, ocorrências e unidades. Escopo: Imobiliária. | **Parcial** (rota ativa em `App.tsx#L496`, ausente na sidebar). | `App.tsx#L496`, `views/urban/AdmCondominios.tsx` |
| **Imóveis / Inteligência Territorial (Rural)** | Hub de Território Rural (Mapas, Localizar CAR, Valuation CAR, Dossiê 360, Due Diligence) | `Território & CAR`, `Valuation Rural`, `Dossiê Inteligente`, `Due Diligence` | `/rural/territorio` (abas: `/maps`, `/localizar-car`, `/valuation`, `/dossie`, `/due-diligence`) e rotas diretas `/rural/geointeligencia`, `/rural/localizar-car`, `/rural/valuation`, `/rural/dossie`, `/rural/due-diligence` | Todos os perfis do tenant Rural | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Consultar SICAR/SIGEF, Calcular Valuation, Emitir Dossiê PDF, Gerir Checklist Fundiário (CCIR, ITR, Matrícula, CAR):** Inteligência geoespacial e ambiental. Escopo: Imobiliária. | Exclusivo do contexto Rural. **Confirmada no código.** | `RuralLayout.tsx#L114-L119`, `views/rural/RuralTerritoryHub.tsx#L11-L42`, `App.tsx#L380-L398`, `server/api/valuation/index.js#L46` |
| **Imóveis / Técnico (Rural)** | Cadastro Técnico Rural (Glebas, Solo, Benfeitorias) | *(Sem item no menu lateral)* | `/rural/cadastro-tecnico` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar, Editar:** Laudos agronômicos, aptidão do solo, recursos hídricos e benfeitorias. Escopo: Imobiliária. | **Parcial** (rota ativa em `App.tsx#L379`, ausente na sidebar). | `App.tsx#L379`, `views/rural/CadastroTecnico.tsx` |
| **Locação (Urbano / Rural)** | Gestão de Contratos de Locação e Garantias | `Gestão de Locação` | `/urban/locacao`, `/rural/locacao` (e editor `/locacao/contrato/:id`) | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar Contrato, Editar, Gerar Aditivo, Aplicar Reajuste (IGPM/IPCA), Enviar para Assinatura:** Ciclo completo de locação (`leases` / `rental_contracts`). Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L121`, `RuralLayout.tsx#L123`, `views/RentalsManagement.tsx`, `server/api/locacao/lease.routes.js`, `server/api/locacao/contract.routes.js` |
| **Locação (Urbano / Rural)** | Borderô de Repasses ao Proprietário | `Repasses / Borderô` | `/urban/locacao/bordero`, `/rural/locacao/bordero` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Calcular Taxa de Administração, Aprovar Repasse, Exportar Comprovante:** Liquidação financeira para proprietários. Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L122`, `RuralLayout.tsx#L124`, `views/RentalsBordero.tsx` |
| **Locação / Financeiro (Urbano / Rural)** | Régua de Cobrança e Faturas | `Cobrança` | `/urban/cobranca`, `/rural/cobranca` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Emitir Boleto/PIX, Disparar Lembrete WhatsApp/E-mail, Baixar Pagamento:** Faturas de aluguel (`billing`). Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L123`, `RuralLayout.tsx#L125`, `views/urban/Cobranca.tsx`, `server/api/cobranca/index.js#L13` |
| **Marketing (Urbano / Rural)** | Meu Site & Criador de Landing Pages | `Meu Site & Páginas` | `/urban/pages`, `/rural/pages` (e editor `/pages/:id`) | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar Página, Editar Layout/Blocos, Publicar Slug, Configurar SEO:** Gestão do site institucional e páginas de alta conversão (`landing_pages`). Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L127`, `RuralLayout.tsx#L129`, `views/LandingPageManager.tsx`, `views/LandingPageEditor.tsx`, `server/api/sites/index.js#L12` |
| **Marketing (Urbano / Rural)** | Campanhas de Quiz Interativo | `Campanhas & Quiz` | `/urban/quiz`, `/rural/quiz` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar Quiz, Editar Perguntas, Publicar Funil:** Qualificação gamificada de leads (`quizzes`). Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L128`, `RuralLayout.tsx#L130`, `views/QuizCampaigns.tsx`, `server/api/quiz/index.js` |
| **Marketing (Urbano / Rural)** | Exportador de Imóveis para Portais (XML/Feeds) | `Exportador Portais` | `/urban/exportador`, `/rural/exportador` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Selecionar Imóveis, Gerar Feed XML (ZAP, VivaReal, OLX, Imovelweb, Chaves na Mão), Sincronizar:** Integração de anúncios. Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L129`, `RuralLayout.tsx#L131`, `views/urban/ExportadorPortais.tsx` |
| **Marketing / Parcerias (Urbano)** | Clube de Benefícios e Parcerias (`Clube Imobzy`) | *(Sem item no menu lateral atual)* | `/urban/clube` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`ProtectedRoute`) | **Visualizar, Resgatar Benefícios, Indicar Parceiros:** Programa de fidelidade e parcerias. Escopo: Imobiliária. | **Parcial** (rota ativa em `App.tsx#L500`, foi removida da sidebar atual). | `App.tsx#L500`, `views/urban/ClubeImobzy.tsx` |
| **Financeiro e Jurídico (Urbano / Rural)** | Fluxo de Caixa e Comissões | `Financeiro` | `/urban/financeiro` (Urbano) / `/rural/financeiro` (Rural, via URL) | Urbano: Todos no menu. Rural: Apenas via URL direta. | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Lançar Receita/Despesa, Gerir Comissões de Corretores, Emitir DRE:** Controle financeiro da imobiliária (`financial_transactions`). Escopo: Imobiliária. | **Parcial no Rural** (rota `/rural/financeiro` existe em `App.tsx#L401`, mas não consta no `RuralLayout.tsx`). | `UrbanLayout.tsx#L133`, `App.tsx#L401,L498`, `views/urban/FinanceiroUrbano.tsx`, `views/rural/FinanceiroRural.tsx` |
| **Financeiro e Jurídico (Urbano)** | Financial Hub / Fintech (Simulador de Crédito, Parcelamento e Fiança) | *(Sem item no menu lateral atual)* | `/urban/fintech` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`ProtectedRoute`) | **Simular Financiamento (SAC/Price — Caixa, Itaú, Bradesco), Simular Parcelamento Direto, Contratar Fiança Locatícia, Salvar no CRM:** Hub de produtos financeiros. | **Parcial** (rota ativa em `App.tsx#L499`, vista na captura de tela do usuário, mas ausente no `UrbanLayout.tsx` atual). | `App.tsx#L499`, `views/urban/FinancialHub.tsx` |
| **Financeiro e Jurídico (Urbano / Rural)** | Contratos Jurídicos e Minutas | `Contratos` | `/urban/contracts`, `/rural/contracts` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Criar Minuta, Gerar Contrato de Compra e Venda / Corretagem / Arrendamento, Enviar para Assinatura:** Gestão contratual (`contracts`). Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L134`, `RuralLayout.tsx#L135`, `views/LegalContracts.tsx` |
| **Financeiro e Jurídico (Urbano / Rural)** | Data Room e Cofre de Documentos | `Data Room` | `/urban/dataroom`, `/rural/dataroom` | Todos os perfis do tenant | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Upload de Certidões/Laudos (MinIO), Compartilhar Sala Segura com Investidor:** Repositório seguro de due diligence. Escopo: Imobiliária. | **Confirmada no código.** | `UrbanLayout.tsx#L135`, `RuralLayout.tsx#L136`, `views/DataRoom.tsx`, `server/api/documents/index.js` |
| **Financeiro e Jurídico (Urbano)** | Gestão de Documentos e Certidões Urbanas | *(Sem item no menu lateral)* | `/urban/documentos` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Validar, Arquivar:** Documentação de imóveis e partes urbanas. Escopo: Imobiliária. | **Parcial** (rota ativa em `App.tsx#L501`, sobreposta ao `DataRoom`). | `App.tsx#L501`, `views/urban/GestaoDocumentos.tsx` |
| **Financeiro e Jurídico (Urbano)** | Compliance e KYC Urbano | *(Sem item no menu lateral)* | `/urban/compliance` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`verifyAuth`) | **Visualizar, Executar Background Check / COAF / KYC:** Análise de risco de partes em transações urbanas. Escopo: Imobiliária. | **Parcial** (rota ativa em `App.tsx#L490`, ausente na sidebar). | `App.tsx#L490`, `views/urban/ComplianceUrbano.tsx` |
| **Configurações (Urbano / Rural)** | Gestão de Equipe e Usuários da Imobiliária | `Equipe & Acessos` | `/urban/users`, `/rural/users` | Todos os perfis veem no menu lateral | `admin`, `superadmin` (`verifyAdmin` na API `/api/admin/users`) | **Visualizar, Convidar/Criar Usuário, Alterar Papel (`admin`, `gerente`, `broker`, `assistente`), Ativar/Desativar, Excluir:** Membros da organização. | `gerente`, `broker` e `assistente` veem o link no menu, mas a API exige `verifyAdmin`. **Confirmada no código.** | `UrbanLayout.tsx#L139`, `RuralLayout.tsx#L138`, `views/admin/UserManagement.tsx`, `server/routes/admin.js#L1550-L1690` |
| **Configurações (Urbano / Rural)** | Configurações Gerais do Sistema (8 Abas) vs. Conta Órulo do Corretor | `Configurações` | `/urban/settings`, `/rural/settings` | Todos os perfis veem no menu lateral | **Abas completas:** `admin`, `superadmin` (e `gerente`/`assistente` na UI). **Visão restrita Órulo:** `broker`. | **Para `admin`/`superadmin`:** Configurar `Aparência`, `Domínios`, `Integrações 360 (IA)`, `Tracking (Pixels)`, `Canais (WhatsApp)`, `Portais (Órulo/XML)`, `Servidor de E-mail (SMTP)` e `Ajuda & Suporte`. **Para `broker`:** Conectar/Desconectar conta individual Órulo. | Condicionada em `SystemSettings.tsx#L274` por `profile?.role === 'broker'`. **Confirmada no código.** | `UrbanLayout.tsx#L141`, `RuralLayout.tsx#L140`, `views/SystemSettings.tsx#L274-L355` |
| **Configurações / Canais (Urbano / Rural)** | Hub Dedicado de Conexões (WhatsApp, Portais, Webhooks) | *(Sem item no menu lateral)* | `/urban/conexoes`, `/rural/conexoes` | Nenhum no menu lateral (acesso via URL direta) | Todos os perfis autenticados (`ProtectedRoute`) | **Visualizar, Conectar QR Code WhatsApp, Testar Webhook:** Painel legado/paralelo à aba `Canais` de `SystemSettings`. | **Parcial** (rotas ativas em `App.tsx#L402,L503`, duplicadas com a aba `Canais` de `SystemSettings`). | `App.tsx#L402,L503`, `views/urban/ConexoesUrbano.tsx`, `views/rural/ConexoesRural.tsx` |
| **Portais Externos (Urbano / Rural)** | Portal do Proprietário (Urbano e Rural) | *(Sem item no menu lateral)* | `/urban/portal-proprietario`, `/rural/portal-proprietario` | Acesso via URL direta (protegido por `ProtectedRoute`) | Usuário autenticado cujo `email` conste em `clients` com papel `'Proprietario'` | **Visualizar:** Imóveis próprios (`owner_id = client.id`), quantidade de leads interessados, status de documentos (`overview`, `docs`) e repasses/extratos (`financeiro`). | Exige vínculo em `clients.roles` contendo `'Proprietario'`. **Condicionada.** | `App.tsx#L399,L494`, `views/urban/PortalProprietarioUrbano.tsx#L64-L87`, `views/rural/PortalProprietarioRural.tsx` |
| **Portais Externos (Urbano / Rural)** | Portal do Comprador / Investidor (Urbano e Rural) | *(Sem item no menu lateral)* | `/urban/portal-comprador`, `/rural/portal-comprador` | Acesso via URL direta (protegido por `ProtectedRoute`) | Qualquer usuário autenticado na organização | **Visualizar, Filtrar, Favoritar Imóveis:** Abas `Buscar Imóveis` e `Meus Favoritos` (`urban_property_favorites` / `rural_property_favorites`). | **Condicionada.** | `App.tsx#L400,L495`, `views/urban/PortalCompradorUrbano.tsx#L37-L90`, `views/rural/PortalCompradorRural.tsx` |
| **Portais Externos (Locação)** | Portal do Locatário (Autoatendimento de Aluguel) | *(Sem item no menu lateral)* | `/portal-locatario` (pública/autenticada) e `/urban/portal-locatario` (interna) | Locatário autenticado ou equipe interna via URL | Usuário autenticado cujo `cpf` ou `email` conste em `rental_contracts` | **Visualizar, Baixar 2ª Via de Boleto, Copiar PIX, Baixar Contrato:** Abas `Contratos`, `Boletos` e `Histórico`. Escopo: Contratos próprios do locatário. | **Condicionada** ao vínculo de CPF/e-mail em `rental_contracts`. | `App.tsx#L289,L493`, `views/urban/PortalLocatario.tsx#L47-L90` |
| **Portais Externos (Jurídico)** | Portal Público de Assinatura Digital com Biometria Facial | *(Link enviado por WhatsApp/E-mail)* | `/assinatura/:token` | Signatário externo portador do token | Público com token criptográfico válido | **Visualizar Minuta, Capturar Selfie e Documento via Câmera, Registrar Geolocalização, Validar OTP WhatsApp e Assinar PDF:** Assinatura eletrônica avançada. | **Confirmada no código.** | `App.tsx#L291`, `views/public/SignaturePortal.tsx#L7-L90` |

---

### 2.2. Divergências Arquiteturais Encontradas entre Menu, Rota e Autorização de Backend

1. **Menus Laterais Idênticos para `admin`, `gerente`, `broker` e `assistente` (`components/UrbanLayout.tsx#L94-L143` e `components/RuralLayout.tsx#L92-L142`):**
   - Os arrays `menuGroups` de `UrbanLayout` e `RuralLayout` são estáticos e não filtram itens por `profile.role`. Consequentemente, um `broker` ou `assistente` vê `Equipe & Acessos` (`/urban/users`) e `Configurações` (`/urban/settings`), além de páginas financeiras e jurídicas sensíveis.
2. **Assimetria entre `verifyAdmin` e `verifyAuth` para o papel `gerente` (`server/middleware/auth.js#L714,L888-L900`):**
   - O papel `gerente` é reconhecido na normalização (`req.userRole = 'gerente'`), mas `verifyAdmin` permite apenas `req.userRole === 'admin' || req.userRole === 'superadmin'`. Assim, o `gerente` **não consegue cadastrar ou editar imóveis** (`POST/PUT /api/properties` exigem `verifyAdmin` em `server/api/properties/index.js#L140,L199`), enquanto qualquer perfil (`broker`, `assistente` ou mesmo `user`) consegue criar/excluir leads, contratos de locação e cobranças porque essas rotas usam apenas `verifyAuth`.
3. **Ausência de Escopo de Carteira Própria (`broker_id`) no Backend de Leads e Imóveis (`server/api/crm/leads.routes.js#L31-L55`):**
   - Embora o banco possua `broker_id` e `assigned_to`, o endpoint `GET /api/crm/leads` filtra unicamente por `.eq('organization_id', req.orgId)`. Na prática, todo corretor tem acesso de leitura/edição à carteira inteira da imobiliária via API.
4. **Verificação Parcial de Papel em `SystemSettings.tsx` (`views/SystemSettings.tsx#L274`):**
   - A condição `if (profile?.role === 'broker')` restringe a tela de Configurações apenas para o corretor (exibindo somente a conexão individual Órulo), mas deixa todas as 8 abas técnicas (`Domínios`, `SMTP`, `Tracking`, `Canais`, `Integrações 360`) abertas na interface para `gerente`, `assistente` e `user`.
5. **Rotas Órfãs de Menu Lateral (Implementadas no `App.tsx`, mas invisíveis na navegação atual):**
   - **No Urbano:** `/urban/fintech` (`FinancialHub`), `/urban/clube` (`ClubeImobzy`), `/urban/captacao` (`CaptacaoFunil`), `/urban/chaves` (`ControleChaves`), `/urban/condominios` (`AdmCondominios`), `/urban/compliance` (`ComplianceUrbano`), `/urban/documentos` (`GestaoDocumentos`), `/urban/conexoes` (`ConexoesUrbano`) e `/urban/qualificacao` (`ConsultingQualificacao`).
   - **No Rural:** `/rural/cadastro-tecnico` (`CadastroTecnico`), `/rural/financeiro` (`FinanceiroRural`), `/rural/conexoes` (`ConexoesRural`) e `/rural/qualificacao` (`ConsultingQualificacao`).
6. **Portais de Proprietário e Comprador Embutidos Dentro do Layout do CRM (`App.tsx#L399-L400,L494-L495`):**
   - As rotas `/urban/portal-proprietario`, `/urban/portal-comprador`, `/rural/portal-proprietario` e `/rural/portal-comprador` são filhas de `<Route path="/urban" element={<UrbanLayout />}>` e `<Route path="/rural" element={<RuralLayout />}>`. Isso significa que, quando um proprietário ou comprador acessa seu portal, ele é renderizado **dentro da moldura completa do CRM da imobiliária** (com o menu lateral de Leads, Funil, Locação e Configurações visível!), em vez de possuir um layout limpo e isolado de portal externo.

---

## 3. MENU ATUAL E MENU PROPOSTO DE CADA PERFIL

### Diretriz Estética e de UX para Todos os Menus Propostos
Todas as árvores de **Menu Proposto** abaixo foram projetadas para o novo padrão visual do **Wootech CRM Imobiliário**:
- **Superfície:** Fundo branco puro (`#FFFFFF`) no menu lateral, cabeçalho e área de conteúdo, com separadores sutis (`#E2E8F0`) e fundo de apoio em `#F8FAFC`.
- **Tipografia:** Fonte **Inter** (`400` regular, `500` medium para itens de menu, `600`/`700` semibold/bold para títulos de seção).
- **Cores e Contraste:** Texto primário escuro (`#0F172A`), ícones neutros (`#475569`) e destaque ativo em **Laranja Wootech (`#FF6A00`)** com fundo suave `rgba(255, 106, 0, 0.08)` no item selecionado.
- **Arquitetura de 8 Áreas Base nos Painéis de Imobiliária:** `Visão geral`, `Atendimento`, `Comercial`, `Imóveis`, `Locação`, `Marketing`, `Financeiro e Jurídico` e `Configurações`, adaptadas conforme o perfil e a vocação (`Urbano` vs. `Rural`).

---

### 3.1. Perfil 1 — Master / Dono da Plataforma (`PLATFORM_OWNER`)

#### 3.1.1. Menu Atual (`PLATFORM_OWNER` em `/woo-control`)

```text
Perfil: Master / Dono da Plataforma (PLATFORM_OWNER)
Escopo: Plataforma Global (Multi-organização, Licenciamento, Deployments, Revendas e Imobiliárias)

Cabeçalho
├── Barra Global de Contextos (WorkspaceTopBar: Master | Mega Admin | Revenda | Urbano | Rural)
├── Indicador de Heartbeat Global e Status da Plataforma
└── Conta Master (Paulo Argolo) e Botão Sair

Menu lateral
├── Governança & Rede
│   ├── Overview — /woo-control/overview
│   ├── Network (Revendas & Tenants) — /woo-control/network
│   ├── Products (Catálogo SaaS) — /woo-control/products
│   └── Licensing (Chaves & Licenças) — /woo-control/licensing
├── Infraestrutura & DevOps
│   ├── Deployments — /woo-control/deployments
│   ├── Snapshots — /woo-control/snapshots
│   ├── Releases — /woo-control/releases
│   └── Stack Generator — /woo-control/stack-generator
└── Operação & Negócios
    ├── Support — /woo-control/support
    ├── Academy — /woo-control/academy
    ├── Revenue — /woo-control/revenue
    └── Security — /woo-control/security

Dentro da tela
├── Overview (/woo-control/overview)
│   ├── Abas: [Visão Executiva Única]
│   └── Ações disponíveis: [ Provisionar Organização, Emitir Licença, Inspecionar Heartbeats ]
├── Network (/woo-control/network)
│   ├── Abas: [Todas, Revendas, Imobiliárias Urbanas, Imobiliárias Rurais, Suspensas]
│   └── Ações disponíveis: [ Criar Organização/Revenda, Impersonar (Modo Suporte), Alterar Plano, Suspender/Reativar, Excluir Definitivamente ]
└── Licensing (/woo-control/licensing)
    ├── Abas: [Ativas, Expirando, Grace Period, Suspensas/Revogadas]
    └── Ações disponíveis: [ Emitir Nova Licença, Renovar Validade, Revogar Chave ]
```

#### 3.1.2. Menu Proposto (`PLATFORM_OWNER` — Unificando Governança Master + Operação Global)

```text
Perfil: Master / Dono da Plataforma (PLATFORM_OWNER)
Escopo: Plataforma Global (Acesso total ao WooControl + MegaAdmin + Simulador de Contextos)

Cabeçalho
├── Seletor Rápido de Ambiente (Master Control | Revenda | CRM Urbano | CRM Rural) + Impersonação Rápida
├── Busca Global Unificada (Buscar organização, domínio, licença, usuário ou ticket)
└── Alertas de Infraestrutura, Notificações e Menu da Conta Master

Menu lateral
├── Visão Geral
│   ├── Dashboard Executivo & MRR — /woo-control/overview
│   └── Analytics & Consumo Global — /megaadmin/analytics
├── Rede & Licenciamento
│   ├── Organizações & Revendas — /woo-control/network
│   ├── Licenças & Assinaturas — /woo-control/licensing
│   ├── Catálogo de Produtos & Planos — /woo-control/products
│   └── Domínios & DNS Global — /megaadmin/domains
├── Infraestrutura & DevOps
│   ├── Deployments & Instâncias — /woo-control/deployments
│   ├── Monitoramento & Saúde — /megaadmin/monitoring
│   ├── Storage S3 / MinIO — /megaadmin/storage
│   ├── Snapshots & Releases — /woo-control/snapshots
│   └── Stack Generator & Migrações — /woo-control/stack-generator
├── Operação & Suporte
│   ├── Central de Suporte Global — /woo-control/support
│   ├── Leads de Consultoria — /megaadmin/consulting
│   ├── Woo Academy — /woo-control/academy
│   └── Créditos de Conexão WhatsApp — /megaadmin/connections
├── Financeiro Global
│   ├── Receita, Royalties & Split — /woo-control/revenue
│   └── Faturamento & Gateways (Billing) — /megaadmin/billing
└── Governança & Configurações
    ├── Feature Flags por Plano/Nicho — /megaadmin/features
    ├── Segurança & Audit Log — /woo-control/security
    ├── Templates Globais — /megaadmin/templates
    ├── Equipe Interna da Plataforma — /megaadmin/team
    └── Configurações Master — /megaadmin/settings

Dentro da tela
├── Organizações & Revendas (/woo-control/network)
│   ├── Abas: [Visão Hierárquica (Revendas > Filhas), Lista Global, Auditoria de Consumo]
│   └── Ações disponíveis: [ + Nova Revenda, + Nova Imobiliária, Entrar em Modo Suporte (Impersonate), Configurar Limites, Suspender, Excluir ]
├── Snapshots & Releases (/woo-control/snapshots)
│   ├── Abas: [Snapshots de Banco, Releases de Versão (/woo-control/releases), Importador & FluowAI (/megaadmin/importer)]
│   └── Ações disponíveis: [ Criar Snapshot, Publicar Release, Executar Migração ]
└── Segurança & Audit Log (/woo-control/security)
    ├── Abas: [Políticas de Segurança, Trilha de Auditoria (/megaadmin/audit), Sessões de Suporte Ativas]
    └── Ações disponíveis: [ Encerrar Sessão de Impersonação, Exportar Logs CSV, Bloquear IP/Token ]
```

---

### 3.2. Perfil 2 — Administrador Global da Plataforma (`MegaAdmin` / `PLATFORM_ADMIN`)

#### 3.2.1. Menu Atual (`MegaAdmin` em `/megaadmin`)

```text
Perfil: Administrador Global da Plataforma (MegaAdmin / superadmin sem revenda)
Escopo: Plataforma Global (Todas as revendas e imobiliárias, exceto emissão de licenças Master)

Cabeçalho
├── Barra Global de Contextos (WorkspaceTopBar: Mega Admin | Revenda | Urbano | Rural)
├── Banner de Modo Suporte (quando impersonando uma organização)
└── Identificação "Mega Admin — God Mode" e Botão Sair

Menu lateral
├── Comando Central
│   ├── Dashboard Global — /megaadmin
│   ├── Analytics Global — /megaadmin/analytics
│   └── Monitoramento — /megaadmin/monitoring
├── Gestão de Rede
│   ├── Imobiliárias & Revendas — /megaadmin/tenants
│   ├── Domínios & SSL — /megaadmin/domains
│   ├── Planos & Preços — /megaadmin/plans
│   └── Billing & Faturas — /megaadmin/billing
├── Engenharia & Dados
│   ├── Feature Flags — /megaadmin/features
│   ├── Storage S3/MinIO — /megaadmin/storage
│   ├── Smart Importer — /megaadmin/importer
│   ├── Migração FluowAI — /megaadmin/fluowai-migration
│   └── Templates — /megaadmin/templates
└── Operação & Governança
    ├── Suporte Global — /megaadmin/support
    ├── Consultoria — /megaadmin/consulting
    ├── Marketing & SEO — /megaadmin/marketing
    ├── Conexões WA — /megaadmin/connections
    ├── Equipe Master — /megaadmin/team
    ├── Audit Log — /megaadmin/audit
    └── Configurações Globais — /megaadmin/settings

Dentro da tela
├── Imobiliárias & Revendas (/megaadmin/tenants)
│   ├── Abas: [Todas, Urbanas, Rurais, Híbridas, Revendas]
│   └── Ações disponíveis: [ Cadastrar Organização, Acessar Painel (Modo Suporte), Editar Nicho/Plano, Suspender, Excluir ]
└── Feature Flags (/megaadmin/features)
    ├── Abas: [Todas, Core, IA & Automação, Integrações, Rural, Urbano, Whitelabel]
    └── Ações disponíveis: [ Ativar/Desativar Flag Global, Filtrar por Categoria, Restaurar Padrões ]
```

#### 3.2.2. Menu Proposto (`MegaAdmin` em `/megaadmin`)

```text
Perfil: Administrador Global da Plataforma (MegaAdmin / PLATFORM_ADMIN)
Escopo: Plataforma Global

Cabeçalho
├── Seletor de Contexto (Mega Admin | Simular Revenda | Simular Urbano | Simular Rural)
├── Busca Global de Tenants, Usuários e Domínios
└── Notificações do Sistema e Menu de Conta

Menu lateral
├── Visão Geral
│   ├── Dashboard Global — /megaadmin
│   └── Analytics & Saúde da Plataforma — /megaadmin/analytics
├── Rede & Clientes (Tenants)
│   ├── Imobiliárias & Revendas — /megaadmin/tenants
│   ├── Domínios & Certificados SSL — /megaadmin/domains
│   └── Leads de Consultoria — /megaadmin/consulting
├── Comercial & Planos SaaS
│   ├── Planos & Pacotes — /megaadmin/plans
│   ├── Faturamento & Assinaturas — /megaadmin/billing
│   └── Marketing, Landing SaaS & SEO — /megaadmin/marketing
├── Atendimento & Operações
│   ├── Central de Suporte — /megaadmin/support
│   ├── Créditos & Instâncias WhatsApp — /megaadmin/connections
│   └── Templates Oficiais (Sites & Contratos) — /megaadmin/templates
├── Engenharia & Infraestrutura
│   ├── Feature Flags & Módulos — /megaadmin/features
│   ├── Storage S3 / MinIO — /megaadmin/storage
│   └── Importação & Migrações — /megaadmin/importer
└── Governança & Configurações
    ├── Equipe da Plataforma — /megaadmin/team
    ├── Auditoria (Audit Log) — /megaadmin/audit
    └── Configurações Globais — /megaadmin/settings

Dentro da tela
├── Analytics & Saúde da Plataforma (/megaadmin/analytics)
│   ├── Abas: [Métricas de Crescimento, Monitoramento de Serviços (/megaadmin/monitoring)]
│   └── Ações disponíveis: [ Filtrar Período, Exportar Relatório, Testar Latência DB/API ]
└── Importação & Migrações (/megaadmin/importer)
    ├── Abas: [Smart Importer (XML/CSV), Migração FluowAI (/megaadmin/fluowai-migration)]
    └── Ações disponíveis: [ Upload de Arquivo, Mapear Campos, Executar Job de Importação ]
```

---

### 3.3. Perfil 3 — Revenda Whitelabel (`SuperAdmin` / `RESELLER_ADMIN`)

#### 3.3.1. Menu Atual (`Revenda` em `/superadmin`)

```text
Perfil: Gestor de Revenda Whitelabel (superadmin com organization.is_reseller = true)
Escopo: Carteira de Imobiliárias Filhas (parent_id = reseller.id) + Operação Própria

Cabeçalho
├── Barra Global de Contextos (WorkspaceTopBar: Revenda | Urbano | Rural)
├── Banner de Modo Suporte (quando visualizando uma imobiliária filha)
└── Identificação do Gestor no rodapé da sidebar

Menu lateral
├── Gestão da Revenda
│   ├── Dashboard — /superadmin
│   ├── Imobiliárias — /superadmin/tenants
│   ├── Suporte — /superadmin/support
│   ├── Equipe — /superadmin/team
│   ├── Planos — /superadmin/plans
│   ├── Billing — /superadmin/billing
│   ├── Audit Log — /superadmin/audit
│   ├── Templates — /superadmin/templates
│   ├── Domínios — /superadmin/domains
│   ├── Consultoria — /superadmin/consulting
│   ├── Marketing & SEO — /superadmin/marketing
│   ├── Conexões WA — /superadmin/connections
│   └── Configurações — /superadmin/settings
└── Atalhos Operacionais
    ├── Painel Urbano — /urban
    └── Painel Rural — /rural

Dentro da tela
├── Dashboard (/superadmin)
│   ├── Abas: [Visão Geral Única]
│   └── Ações disponíveis: [ Configurar Planos, Cadastrar Imobiliária, Ver Alertas ]
└── Imobiliárias (/superadmin/tenants)
    ├── Abas: [Todas as Imobiliárias da Carteira]
    └── Ações disponíveis: [ + Nova Imobiliária (Urbana, Rural ou Ambas), Entrar em Modo Suporte, Alterar Plano, Suspender, Excluir ]
```

#### 3.3.2. Menu Proposto (`Revenda` em `/superadmin`)

```text
Perfil: Gestor de Revenda Whitelabel (RESELLER_ADMIN)
Escopo: Carteira da Revenda (parent_id = reseller.id)

Cabeçalho
├── Seletor de Contexto (Painel Revenda | Testar Meu CRM Urbano | Testar Meu CRM Rural)
├── Busca de Imobiliárias Filhas, Domínios e Faturas
└── Central de Notificações e Perfil da Revenda

Menu lateral
├── Visão Geral
│   └── Dashboard da Revenda — /superadmin
├── Carteira de Imobiliárias
│   ├── Imobiliárias Clientes — /superadmin/tenants
│   └── Domínios dos Clientes — /superadmin/domains
├── Comercial & Marketing Whitelabel
│   ├── Leads de Consultoria — /superadmin/consulting
│   ├── Minha Página de Vendas & SEO — /superadmin/marketing
│   └── Templates para Clientes — /superadmin/templates
├── Planos & Financeiro
│   ├── Meus Planos de Assinatura — /superadmin/plans
│   └── Faturamento & Cobrança (Billing) — /superadmin/billing
├── Atendimento ao Cliente
│   ├── Chamados de Suporte — /superadmin/support
│   └── Cotas de Conexão WhatsApp — /superadmin/connections
└── Configurações da Revenda
    ├── Equipe da Revenda — /superadmin/team
    ├── Auditoria da Carteira — /superadmin/audit
    └── Marca & Whitelabel — /superadmin/settings

Dentro da tela
├── Imobiliárias Clientes (/superadmin/tenants)
│   ├── Abas: [Ativas, Em Trial, Urbanas, Rurais, Híbridas, Inadimplentes/Suspensas]
│   └── Ações disponíveis: [ + Cadastrar Imobiliária, Acessar como Suporte (Impersonate), Liberar Recursos, Alterar Plano, Suspender ]
└── Marca & Whitelabel (/superadmin/settings)
    ├── Abas: [Identidade Visual (Logo/Cores), Domínio do Painel, Gateway de Pagamento, SMTP da Revenda]
    └── Ações disponíveis: [ Salvar Identidade Whitelabel, Testar Disparo de E-mail, Configurar Webhook Asaas/Stripe ]
```

---

### 3.4. Perfil 4 — Admin da Imobiliária (`admin` / `CUSTOMER_ADMIN`)

Como o menu muda entre **Urbano** (`organizations.type = 'traditional'`) e **Rural** (`organizations.type = 'rural'`), e ambos ficam disponíveis em imobiliárias híbridas (`organizations.type = 'both'`), apresentamos as duas variações completas.

#### 3.4.1. Variação A — Menu Atual (`Admin da Imobiliária` no Contexto URBANO `/urban`)

```text
Perfil: Admin da Imobiliária (admin) — Contexto Urbano
Escopo: Imobiliária (organization_id)

Cabeçalho
├── Seletor Urbano/Rural (exibido apenas se organization.type === 'both')
├── Busca Rápida ("Buscar leads, imóveis, clientes...")
└── Ícone de Notificações e Menu do Usuário

Menu lateral
├── Visão Geral
│   ├── Dashboard — /urban
│   └── Visão 360 — /urban/dashboard-360
├── Atendimento & IA
│   ├── Atendimento — /urban/atendimento
│   ├── Central IA — /urban/ai
│   └── Fila de Espera — /urban/waitlist
├── Comercial & CRM
│   ├── Leads — /urban/leads
│   ├── Funil / CRM — /urban/kanban
│   ├── Clientes — /urban/clientes
│   ├── Minha Agenda — /urban/agenda
│   └── Matchmaking 360 — /urban/matchmaking
├── Imóveis
│   ├── Imóveis — /urban/properties
│   └── Empreendimentos — /urban/empreendimentos
├── Locação & Cobrança
│   ├── Gestão de Locação — /urban/locacao
│   ├── Repasses / Borderô — /urban/locacao/bordero
│   └── Cobrança — /urban/cobranca
├── Marketing & Canais
│   ├── Meu Site & Páginas — /urban/pages
│   ├── Campanhas & Quiz — /urban/quiz
│   └── Exportador Portais — /urban/exportador
├── Financeiro & Jurídico
│   ├── Financeiro — /urban/financeiro
│   ├── Contratos — /urban/contracts
│   └── Data Room — /urban/dataroom
└── Administração
    ├── Equipe & Acessos — /urban/users
    ├── Relatórios / BI — /urban/bi
    └── Configurações — /urban/settings

Dentro da tela
├── Configurações (/urban/settings)
│   ├── Abas: [Aparência, Domínios, Integrações 360, Tracking, Canais, Portais, Servidor de E-mail, Ajuda & Suporte]
│   └── Ações disponíveis: [ Salvar Chaves, Conectar WhatsApp, Configurar Órulo/XML, Configurar SMTP ]
└── Rotas Órfãs (Acessíveis apenas digitando a URL)
    ├── /urban/fintech (Financial Hub), /urban/clube (Clube), /urban/captacao (Captação)
    └── /urban/chaves (Controle de Chaves), /urban/condominios (Condomínios), /urban/compliance, /urban/documentos
```

#### 3.4.2. Variação A — Menu Proposto (`Admin da Imobiliária` no Contexto URBANO `/urban`)

```text
Perfil: Admin da Imobiliária (admin) — Contexto Urbano
Escopo: Imobiliária (organization_id) — Todas as funções liberadas nas 8 áreas do novo Design System

Cabeçalho
├── Seletor de Contexto (Urbano | Rural, quando híbrida) + Atalho "Ver Meu Site Público"
├── Busca Global Instantânea (Imóveis por código, Leads, Clientes, Contratos)
└── Botão "+ Criação Rápida" (Novo Imóvel, Novo Lead, Novo Contrato), Notificações e Perfil

Menu lateral
├── 1. Visão geral
│   ├── Painel Principal — /urban
│   ├── Visão Executiva 360 — /urban/dashboard-360
│   └── Inteligência & BI — /urban/bi
├── 2. Atendimento
│   ├── Caixa de Entrada (Omnichannel) — /urban/atendimento
│   ├── Fila de Espera — /urban/waitlist
│   └── Central de Agentes IA — /urban/ai
├── 3. Comercial
│   ├── Pipeline & Leads — /urban/leads
│   ├── Clientes & Proprietários — /urban/clientes
│   ├── Captação de Imóveis — /urban/captacao
│   ├── Matchmaking 360 — /urban/matchmaking
│   └── Minha Agenda — /urban/agenda
├── 4. Imóveis
│   ├── Catálogo de Imóveis — /urban/properties
│   ├── Empreendimentos & Loteamentos — /urban/empreendimentos
│   ├── Controle de Chaves — /urban/chaves
│   └── Condomínios — /urban/condominios
├── 5. Locação
│   ├── Contratos de Locação — /urban/locacao
│   ├── Cobranças & Boletos — /urban/cobranca
│   └── Repasses / Borderô — /urban/locacao/bordero
├── 6. Marketing
│   ├── Meu Site & Criador de Páginas — /urban/pages
│   ├── Campanhas & Quiz — /urban/quiz
│   ├── Portais & Feeds XML — /urban/exportador
│   └── Clube de Parcerias — /urban/clube
├── 7. Financeiro e Jurídico
│   ├── Fluxo de Caixa & Comissões — /urban/financeiro
│   ├── Crédito & Garantia (Fintech) — /urban/fintech
│   ├── Contratos & Documentos — /urban/contracts
│   └── Compliance & KYC — /urban/compliance
└── 8. Configurações
    ├── Equipe & Permissões — /urban/users
    ├── Canais, Domínios & Sistema — /urban/settings
    └── Acessos dos Portais (Clientes) — /urban/portal-proprietario

Dentro da tela
├── Caixa de Entrada (/urban/atendimento)
│   ├── Abas: [Todos, WhatsApp, Instagram, E-mail, Atendimento IA, Fila de Espera (/urban/waitlist)]
│   └── Ações disponíveis: [ Assumir Conversa, Transferir para Corretor, Criar Lead, Agendar Visita, Disparar Proposta ]
├── Pipeline & Leads (/urban/leads)
│   ├── Abas: [Visão Kanban (/urban/kanban), Visão em Lista (/urban/leads), Qualificação Consultiva (/urban/qualificacao)]
│   └── Ações disponíveis: [ + Novo Lead, Atribuir Corretor, Mover Etapa, Exportar CSV, Excluir ]
├── Central de Agentes IA (/urban/ai)
│   ├── Abas: [Operações Ativas, Criar Operação (/urban/ai/operations/new), Base de Conhecimento (/urban/ai/knowledge), Sandbox (/urban/ai/sandbox), Arquitetura (/urban/ai/architecture), Histórico & Logs (/urban/ai/logs)]
│   └── Ações disponíveis: [ + Novo Agente IA, Treinar Conhecimento, Testar no Sandbox, Publicar Operação ]
├── Contratos & Documentos (/urban/contracts)
│   ├── Abas: [Minutas & Contratos (/urban/contracts), Gestão de Documentos (/urban/documentos), Data Room Seguro (/urban/dataroom)]
│   └── Ações disponíveis: [ + Gerar Contrato, Enviar para Assinatura Digital (/assinatura/:token), Upload para Data Room, Aprovar Certidão ]
└── Canais, Domínios & Sistema (/urban/settings)
    ├── Abas: [Identidade & Aparência, Domínios, Canais (WhatsApp/Instagram/E-mail SMTP), Portais & Órulo, IA & Integrações 360, Tracking & Pixels, Portais do Cliente]
    └── Ações disponíveis: [ Salvar Configurações, Ler QR Code WhatsApp, Sincronizar Órulo, Configurar DNS ]
```

#### 3.4.3. Variação B — Menu Atual (`Admin da Imobiliária` no Contexto RURAL `/rural`)

```text
Perfil: Admin da Imobiliária (admin) — Contexto Rural
Escopo: Imobiliária Rural / Agro (organization_id)

Cabeçalho
├── Seletor Urbano/Rural (quando híbrida)
├── Busca Rápida ("Buscar propriedades, investidores, CAR...")
└── Notificações e Perfil do Usuário

Menu lateral
├── Visão Geral
│   ├── Dashboard — /rural
│   └── Visão 360 — /rural/dashboard-360
├── Atendimento & IA
│   ├── Mensagens — /rural/atendimento
│   ├── Central IA — /rural/ai
│   └── Fila de Espera — /rural/waitlist
├── Comercial & CRM
│   ├── Leads — /rural/leads
│   ├── Funil / CRM — /rural/kanban
│   ├── Clientes — /rural/clientes
│   ├── Minha Agenda — /rural/agenda
│   └── Matchmaking 360 — /rural/matchmaking
├── Propriedades & Território
│   ├── Imóveis — /rural/properties
│   ├── Território & CAR — /rural/territorio
│   ├── Valuation Rural — /rural/valuation
│   ├── Dossiê Inteligente — /rural/dossie
│   └── Due Diligence — /rural/due-diligence
├── Arrendamento & Locação
│   ├── Gestão de Locação — /rural/locacao
│   ├── Repasses / Borderô — /rural/locacao/bordero
│   └── Cobrança — /rural/cobranca
├── Marketing & Canais
│   ├── Meu Site & Páginas — /rural/pages
│   ├── Campanhas & Quiz — /rural/quiz
│   └── Exportador Portais — /rural/exportador
├── Jurídico & Documentos
│   ├── Contratos — /rural/contracts
│   └── Data Room — /rural/dataroom
└── Administração
    ├── Equipe & Acessos — /rural/users
    ├── Relatórios / BI — /rural/bi
    └── Configurações — /rural/settings

Dentro da tela
├── Território & CAR (/rural/territorio)
│   ├── Abas: [Mapas (/rural/territorio/maps), Localizar CAR (/rural/territorio/localizar-car), Valuation CAR (/rural/territorio/valuation), Dossiê 360 (/rural/territorio/dossie), Documentação (/rural/territorio/due-diligence)]
│   └── Ações disponíveis: [ Importar KML/GeoJSON, Consultar Base SICAR/SIGEF, Emitir Laudo de Valuation, Gerar Dossiê PDF ]
└── Rotas Órfãs no Rural (Acessíveis apenas via URL direta)
    └── /rural/cadastro-tecnico (Cadastro Técnico), /rural/financeiro (Financeiro Rural), /rural/conexoes, /rural/qualificacao
```

#### 3.4.4. Variação B — Menu Proposto (`Admin da Imobiliária` no Contexto RURAL `/rural`)

```text
Perfil: Admin da Imobiliária (admin) — Contexto Rural
Escopo: Imobiliária Rural / Agro (organization_id) — Estruturado nas 8 áreas do mockup com Inteligência Territorial consolidada

Cabeçalho
├── Seletor de Contexto (Rural | Urbano, quando híbrida) + Atalho "Ver Meu Site Rural"
├── Busca Global (Fazendas, Código CAR, Matrícula, Investidores, Contratos)
└── Botão "+ Nova Captação Rural", Notificações e Perfil

Menu lateral
├── 1. Visão geral
│   ├── Dashboard Rural — /rural
│   ├── Visão Executiva 360 — /rural/dashboard-360
│   └── Inteligência & BI Agro — /rural/bi
├── 2. Atendimento
│   ├── Caixa de Entrada (Omnichannel) — /rural/atendimento
│   ├── Fila de Investidores — /rural/waitlist
│   └── Central de Agentes IA — /rural/ai
├── 3. Comercial
│   ├── Funil & Leads Agro — /rural/leads
│   ├── Investidores & Proprietários — /rural/clientes
│   ├── Matchmaking 360 (Fazenda x Investidor) — /rural/matchmaking
│   └── Agenda de Visitas & Vistorias — /rural/agenda
├── 4. Imóveis (Propriedades & Território)
│   ├── Propriedades Rurais — /rural/properties
│   ├── Cadastro Técnico & Laudos — /rural/cadastro-tecnico
│   └── Inteligência Territorial & CAR — /rural/territorio
├── 5. Locação (Arrendamento & Parceria Rural)
│   ├── Contratos de Arrendamento/Locação — /rural/locacao
│   ├── Cobranças & Parcelas — /rural/cobranca
│   └── Repasses ao Proprietário — /rural/locacao/bordero
├── 6. Marketing
│   ├── Meu Site & Criador de Páginas — /rural/pages
│   ├── Campanhas & Quiz de Investidores — /rural/quiz
│   └── Exportador para Portais — /rural/exportador
├── 7. Financeiro e Jurídico
│   ├── Financeiro & Comissões Rurais — /rural/financeiro
│   ├── Contratos & Minutas Agrárias — /rural/contracts
│   ├── Due Diligence Fundiária — /rural/due-diligence
│   └── Data Room de Ativos — /rural/dataroom
└── 8. Configurações
    ├── Equipe & Permissões — /rural/users
    ├── Canais, Domínios & Sistema — /rural/settings
    └── Portais de Proprietário e Investidor — /rural/portal-proprietario

Dentro da tela
├── Inteligência Territorial & CAR (/rural/territorio)
│   ├── Abas: [Mapas GIS (/rural/territorio/maps), Localizar CAR (/rural/territorio/localizar-car), Valuation CAR (/rural/territorio/valuation), Dossiê 360 (/rural/territorio/dossie), Regularidade Ambiental (/rural/territorio/due-diligence)]
│   └── Ações disponíveis: [ Importar Polígono KML/Shapefile, Consultar CAR por Coordenada, Calcular Valuation Agronômico, Exportar Dossiê Executivo ]
└── Funil & Leads Agro (/rural/leads)
    ├── Abas: [Pipeline Kanban (/rural/kanban), Lista de Leads (/rural/leads), Qualificação de Investidor (/rural/qualificacao)]
    └── Ações disponíveis: [ + Novo Investidor/Lead, Vincular Propriedade, Enviar Sala de Data Room, Agendar Vistoria ]
```

---

### 3.5. Perfil 5 — Supervisor / Gerente Comercial (`gerente`)

#### 3.5.1. Menu Atual (`gerente` em `/urban` e `/rural`)

```text
Perfil: Supervisor / Gerente Comercial (gerente)
Escopo: Imobiliária (organization_id) — ATENÇÃO: Atualmente vê 100% do mesmo menu lateral do Admin, mas sofre bloqueio HTTP 403 em rotas protegidas por verifyAdmin (/api/properties POST/PUT/DELETE e /api/admin/users).

Cabeçalho
├── Busca Rápida
└── Notificações e Perfil (exibido como "Corretor" no cabeçalho atual por fallback de ternário role === 'admin')

Menu lateral
└── [Exatamente a mesma árvore atual de 8 grupos do Admin em /urban e /rural, incluindo Equipe & Acessos e Configurações]

Dentro da tela
├── Imóveis (/urban/properties ou /rural/properties)
│   ├── Abas: [Todos os Imóveis]
│   └── Ações disponíveis: [ Visualizar (OK); Criar/Editar/Excluir retorna HTTP 403 no backend por verifyAdmin ]
└── Equipe & Acessos (/urban/users)
    ├── Abas: [Lista de Membros]
    └── Ações disponíveis: [ Visualiza a tela, mas criar/editar usuário retorna HTTP 403 no backend ]
```

#### 3.5.2. Menu Proposto (`gerente` em `/urban` e `/rural`)

> **Recomendação de Governança:** O `gerente` deve ter seu menu focado na gestão da operação comercial, carteira de imóveis, locação e marketing, ocultando configurações críticas de infraestrutura (Domínios, SMTP, Exclusão de Usuários) e habilitando permissão de criação/edição de imóveis no backend.

```text
Perfil: Supervisor / Gerente Comercial (gerente)
Escopo: Equipe Comercial e Carteira da Imobiliária (organization_id)

Cabeçalho
├── Seletor Urbano/Rural (se organização híbrida)
├── Busca Global (Leads, Corretores, Imóveis, Visitas)
└── Filtro "Visão da Equipe / Minha Carteira", Notificações e Conta

Menu lateral
├── 1. Visão geral
│   ├── Dashboard Comercial — /urban (ou /rural)
│   ├── Visão 360 da Equipe — /urban/dashboard-360 (ou /rural/dashboard-360)
│   └── Relatórios & Performance (BI) — /urban/bi (ou /rural/bi)
├── 2. Atendimento
│   ├── Caixa de Entrada & Monitoria — /urban/atendimento (ou /rural/atendimento)
│   ├── Fila de Espera & Redistribuição — /urban/waitlist (ou /rural/waitlist)
│   └── Operações de IA Comercial — /urban/ai (ou /rural/ai)
├── 3. Comercial
│   ├── Pipeline & Leads da Equipe — /urban/leads (ou /rural/leads)
│   ├── Carteira de Clientes — /urban/clientes (ou /rural/clientes)
│   ├── Captação de Imóveis (Urbano) — /urban/captacao
│   ├── Matchmaking 360 — /urban/matchmaking (ou /rural/matchmaking)
│   └── Agenda da Equipe — /urban/agenda (ou /rural/agenda)
├── 4. Imóveis
│   ├── Catálogo de Imóveis — /urban/properties (ou /rural/properties)
│   ├── [Urbano] Empreendimentos & Chaves — /urban/empreendimentos
│   └── [Rural] Inteligência Territorial & CAR — /rural/territorio
├── 5. Locação
│   ├── Contratos de Locação — /urban/locacao (ou /rural/locacao)
│   └── Cobranças & Vistoria — /urban/cobranca (ou /rural/cobranca)
├── 6. Marketing
│   ├── Criador de Páginas & Landing Pages — /urban/pages (ou /rural/pages)
│   ├── Campanhas & Quiz — /urban/quiz (ou /rural/quiz)
│   └── Publicação em Portais — /urban/exportador (ou /rural/exportador)
├── 7. Financeiro e Jurídico
│   ├── Simulador de Crédito (Fintech) — /urban/fintech
│   └── Contratos & Data Room — /urban/contracts (ou /rural/contracts)
└── 8. Configurações
    ├── Roleta de Leads & Equipe (Somente Leitura/Escala) — /urban/users
    └── Integrações de Corretores (Órulo/Canais) — /urban/settings

Dentro da tela
├── Pipeline & Leads da Equipe (/urban/leads | /rural/leads)
│   ├── Abas: [Kanban (/urban/kanban), Lista (/urban/leads), Por Corretor, Leads Sem Atendimento]
│   └── Ações disponíveis: [ + Novo Lead, Reatribuir Corretor, Auditar Conversa, Aprovar Proposta, Exportar Relatório ]
└── Catálogo de Imóveis (/urban/properties | /rural/properties)
    ├── Abas: [Ativos, Em Captação (/urban/captacao), Controle de Chaves (/urban/chaves)]
    └── Ações disponíveis: [ + Cadastrar Imóvel, Aprovar Captação, Destacar no Site, Sincronizar Portais ]
```

---

### 3.6. Perfil 6 — Corretor / Consultor Imobiliário (`broker`)

#### 3.6.1. Menu Atual (`broker` em `/urban` e `/rural`)

```text
Perfil: Corretor Imobiliário (broker)
Escopo: Imobiliária (organization_id) — Restrição ativa apenas dentro da tela SystemSettings.tsx

Cabeçalho
├── Busca Rápida
└── Notificações e Perfil ("Corretor • Urbano" ou "Corretor • Rural")

Menu lateral
└── [Exatamente a mesma árvore atual de 8 grupos do Admin em /urban e /rural, incluindo Financeiro, Borderô, Equipe & Acessos e Configurações]

Dentro da tela
├── Configurações (/urban/settings ou /rural/settings)
│   ├── Abas: [Nenhuma aba administrativa é exibida (bloqueio na linha 274 de SystemSettings.tsx)]
│   └── Ações disponíveis: [ Conectar minha conta Órulo, Reconectar minha conta, Desconectar ]
└── Imóveis (/urban/properties ou /rural/properties)
    ├── Abas: [Todos os Imóveis]
    └── Ações disponíveis: [ Visualizar ficha e compartilhar link; tentativa de Salvar/Excluir retorna HTTP 403 ]
```

#### 3.6.2. Menu Proposto (`broker` em `/urban` e `/rural`)

> **Racional de UX:** O corretor precisa de uma interface limpa e focada em **conversão, atendimento rápido, agenda de visitas, divulgação de imóveis e simulação de financiamento/propostas**, sem exposição ao fluxo de caixa administrativo da imobiliária, folha de repasses de outros proprietários ou gestão de usuários/DNS.

```text
Perfil: Corretor Imobiliário (broker)
Escopo: Carteira Própria de Leads/Atendimentos (broker_id = profile.id) + Catálogo de Imóveis da Imobiliária

Cabeçalho
├── Seletor Urbano/Rural (se organização híbrida)
├── Busca Rápida (Código do Imóvel, Meus Leads, Empreendimentos)
└── Botão "+ Novo Lead", Notificações de Atendimento e Perfil do Corretor

Menu lateral
├── 1. Visão geral
│   └── Meu Painel & Metas — /urban (ou /rural)
├── 2. Atendimento
│   ├── Meus Atendimentos (WhatsApp/Instagram) — /urban/atendimento (ou /rural/atendimento)
│   └── Fila de Oportunidades — /urban/waitlist (ou /rural/waitlist)
├── 3. Comercial
│   ├── Meu Funil & Leads — /urban/kanban (ou /rural/kanban)
│   ├── Meus Clientes — /urban/clientes (ou /rural/clientes)
│   ├── Matchmaking 360 — /urban/matchmaking (ou /rural/matchmaking)
│   ├── [Urbano] Minhas Captações — /urban/captacao
│   └── Minha Agenda & Visitas — /urban/agenda (ou /rural/agenda)
├── 4. Imóveis
│   ├── Catálogo de Imóveis — /urban/properties (ou /rural/properties)
│   ├── [Urbano] Empreendimentos & Tabelas — /urban/empreendimentos
│   ├── [Urbano] Retirada de Chaves — /urban/chaves
│   └── [Rural] Mapas, CAR & Dossiê 360 — /rural/territorio
├── 5. Locação
│   └── Propostas & Imóveis para Alugar — /urban/locacao (ou /rural/locacao)
├── 6. Marketing
│   ├── Minhas Landing Pages — /urban/pages (ou /rural/pages)
│   ├── Meus Quizzes de Captação — /urban/quiz (ou /rural/quiz)
│   └── [Urbano] Clube de Benefícios — /urban/clube
├── 7. Financeiro e Jurídico
│   ├── [Urbano] Simulador de Crédito & Fiança — /urban/fintech
│   ├── Minutas & Propostas — /urban/contracts (ou /rural/contracts)
│   └── Data Room (Compartilhar com Cliente) — /urban/dataroom (ou /rural/dataroom)
└── 8. Configurações
    └── Meu Perfil & Conta Órulo — /urban/settings (ou /rural/settings)

Dentro da tela
├── Meu Funil & Leads (/urban/kanban | /rural/kanban)
│   ├── Abas: [Visão Kanban (/urban/kanban), Visão em Lista (/urban/leads)]
│   └── Ações disponíveis: [ + Novo Lead, Mover Etapa, Registrar Follow-up, Chamar no WhatsApp, Agendar Visita ]
├── [Urbano] Simulador de Crédito & Fiança (/urban/fintech)
│   ├── Abas: [Crédito Imobiliário (SAC/Price), Parcelamento Direto, Fiança Aluguel]
│   └── Ações disponíveis: [ Simular Caixa/Itaú/Bradesco, Salvar Simulação no Lead, Exportar PDF para Cliente ]
└── Meu Perfil & Conta Órulo (/urban/settings | /rural/settings)
    ├── Abas: [Credencial Órulo, Meus Dados & CRECI, Notificações]
    └── Ações disponíveis: [ Conectar/Reconectar Conta Órulo, Atualizar Telefone/Assinatura ]
```

---

### 3.7. Perfil 7 — Atendente / Assistente Administrativo (`assistente`)

#### 3.7.1. Menu Atual (`assistente` em `/urban` e `/rural`)

```text
Perfil: Atendente / Assistente Administrativo (assistente)
Escopo: Imobiliária (organization_id) — Atualmente vê o mesmo menu lateral completo do Admin

Cabeçalho
├── Busca Rápida
└── Notificações e Perfil

Menu lateral
└── [Mesma árvore de 8 grupos do Admin em /urban e /rural]

Dentro da tela
└── Configurações (/urban/settings)
    ├── Abas: [Exibe as 8 abas porque SystemSettings.tsx só oculta para role === 'broker']
    └── Ações disponíveis: [ Visualização aberta na UI; rotas verifyAdmin bloqueadas no backend ]
```

#### 3.7.2. Menu Proposto (`assistente` em `/urban` e `/rural`)

> **Racional de UX:** O perfil de recepção/assistência administrativa atua na triagem omnichannel, distribuição da fila de espera, agendamento de visitas, controle de portaria/chaves, apoio documental de locação e emissão de 2ª via de boletos, sem acesso a configurações de servidores, exclusão de usuários ou DRE estratégico.

```text
Perfil: Atendente / Assistente Administrativo (assistente)
Escopo: Triagem, Recepção, Controle de Chaves e Apoio Operacional da Imobiliária (organization_id)

Cabeçalho
├── Busca Rápida (Clientes, Chaves, Protocolos, Boletos, Visitas do Dia)
└── Botão "+ Registrar Atendimento / Retirada de Chave", Notificações e Conta

Menu lateral
├── 1. Visão geral
│   └── Painel de Recepção & Agenda do Dia — /urban (ou /rural)
├── 2. Atendimento
│   ├── Caixa de Entrada (Triagem Omnichannel) — /urban/atendimento (ou /rural/atendimento)
│   └── Fila de Espera — /urban/waitlist (ou /rural/waitlist)
├── 3. Comercial
│   ├── Cadastro de Leads — /urban/leads (ou /rural/leads)
│   ├── Cadastro de Clientes — /urban/clientes (ou /rural/clientes)
│   └── Agenda de Visitas — /urban/agenda (ou /rural/agenda)
├── 4. Imóveis
│   ├── Consulta de Imóveis — /urban/properties (ou /rural/properties)
│   ├── [Urbano] Controle de Chaves — /urban/chaves
│   ├── [Urbano] Condomínios — /urban/condominios
│   └── [Rural] Consulta Territorial & Documental — /rural/territorio
├── 5. Locação
│   ├── Contratos de Locação — /urban/locacao (ou /rural/locacao)
│   └── 2ª Via & Cobranças — /urban/cobranca (ou /rural/cobranca)
└── 7. Financeiro e Jurídico
    ├── Checklist de Documentos — /urban/documentos (ou /rural/due-diligence)
    └── Contratos & Assinaturas — /urban/contracts (ou /rural/contracts)

Dentro da tela
├── Controle de Chaves (/urban/chaves)
│   ├── Abas: [Quadro de Chaves Disponíveis, Chaves Emprestadas, Histórico de Retiradas]
│   └── Ações disponíveis: [ Registrar Retirada de Chave, Registrar Devolução, Imprimir Recibo ]
└── 2ª Via & Cobranças (/urban/cobranca | /rural/cobranca)
    ├── Abas: [Vencendo Hoje, Em Atraso, Pagas]
    └── Ações disponíveis: [ Enviar 2ª Via por WhatsApp/E-mail, Copiar Linha Digitável/PIX ]
```

---

### 3.8. Perfis 8 a 11 — Portais Externos (Proprietário, Comprador, Locatário e Signatário)

#### 3.8.1. Menu Atual dos Portais Externos

```text
Perfil: Proprietário, Comprador e Locatário (user / CUSTOMER_USER)
Escopo: Registros vinculados ao CPF/E-mail do cliente na organização

Situação Atual no Código:
├── Portal do Proprietário (/urban/portal-proprietario e /rural/portal-proprietario)
│   └── Renderizado DENTRO de UrbanLayout / RuralLayout (expondo indevidamente o menu lateral completo do CRM)
├── Portal do Comprador (/urban/portal-comprador e /rural/portal-comprador)
│   └── Renderizado DENTRO de UrbanLayout / RuralLayout (expondo indevidamente o menu lateral completo do CRM)
├── Portal do Locatário (/portal-locatario e /urban/portal-locatario)
│   ├── Na rota /portal-locatario: Layout próprio isolado (Sem sidebar do CRM)
│   └── Na rota /urban/portal-locatario: Renderizado dentro de UrbanLayout
└── Portal de Assinatura (/assinatura/:token)
    └── Layout público passo a passo isolado (Sem sidebar)
```

#### 3.8.2. Menu Proposto para os Portais Externos (Layouts Dedicados em Fundo Branco + Laranja Wootech)

```text
Perfil: Proprietário de Imóvel (Urbano e Rural)
Escopo: Imóveis onde owner_id corresponde ao cadastro do cliente em clients (papel 'Proprietario')

Cabeçalho (Layout Limpo de Portal do Cliente — Sem Sidebar do CRM)
├── Logo da Imobiliária (Whitelabel) + Seletor "Meus Imóveis Urbanos | Minhas Propriedades Rurais"
├── Resumo Rápido (Imóveis Ativos | Propostas em Andamento | Próximo Repasse)
└── Botão "Falar com Meu Gestor" e Conta do Proprietário

Menu de Navegação do Portal (Horizontal / Lateral Compacto)
├── Visão Geral dos Meus Imóveis — /urban/portal-proprietario (ou /rural/portal-proprietario)
├── Documentos & Contratos — ?tab=docs
└── Extrato de Repasses & Informe de Rendimentos — ?tab=financeiro

Dentro da tela
└── Portal do Proprietário (/urban/portal-proprietario | /rural/portal-proprietario)
    ├── Abas: [Visão Geral (overview), Documentos & Regularidade (docs), Financeiro & Repasses (financeiro)]
    └── Ações disponíveis: [ Acompanhar Quantidade de Leads/Visitas, Baixar Contrato Assinado, Enviar Documento Pendente, Baixar Extrato de Repasse / DIMOB ]
```

```text
Perfil: Comprador / Investidor (Urbano e Rural)
Escopo: Catálogo Público/Privado da Imobiliária + Favoritos e Data Rooms liberados para profile.id

Cabeçalho (Layout Limpo de Portal do Comprador/Investidor)
├── Logo da Imobiliária + Busca por Cidade, Bairro, Finalidade ou Aptidão Rural
└── Botão "Agendar Atendimento" e Perfil do Comprador

Menu de Navegação do Portal
├── Explorar Imóveis — /urban/portal-comprador (ou /rural/portal-comprador)
├── Meus Favoritos — ?tab=favoritos
└── Propostas & Simulações — ?tab=propostas

Dentro da tela
└── Portal do Comprador (/urban/portal-comprador | /rural/portal-comprador)
    ├── Abas: [Buscar Imóveis (buscar), Meus Favoritos (favoritos)]
    └── Ações disponíveis: [ Filtrar por Tipo/Valor, Favoritar/Desfavoritar Imóvel, Solicitar Visita ou Dossiê 360 ]
```

```text
Perfil: Locatário / Inquilino
Escopo: Contratos ativos em rental_contracts vinculados a tenant_cpf ou tenant_email

Cabeçalho (Layout Dedicado em /portal-locatario)
├── Logo da Imobiliária + Identificação do Imóvel Locado
└── Botão Mostrar/Ocultar Valores e Botão Sair

Menu de Navegação do Portal
├── Meus Contratos — /portal-locatario?tab=contratos
├── Boletos & PIX — /portal-locatario?tab=boletos
└── Histórico de Pagamentos — /portal-locatario?tab=historico

Dentro da tela
└── Portal do Locatário (/portal-locatario)
    ├── Abas: [Contratos (contratos), Boletos & Faturas (boletos), Histórico (historico)]
    └── Ações disponíveis: [ Baixar PDF do Contrato, Emitir 2ª Via de Boleto, Copiar Código PIX, Baixar Comprovantes Quitados ]
```

```text
Perfil: Signatário Externo (Token Público)
Escopo: Documento único vinculado ao token criptográfico em /assinatura/:token

Cabeçalho
├── Selo de Segurança e Validade Jurídica Wootech Sign
└── Indicador de Etapas (1. Leitura -> 2. Biometria Facial -> 3. Documento -> 4. Token WhatsApp -> 5. Concluído)

Dentro da tela
└── Portal de Assinatura (/assinatura/:token)
    ├── Abas: [Fluxo Linear Guiado em 4 Etapas]
    └── Ações disponíveis: [ Ler Minuta e Aceitar Termos, Capturar Selfie na Câmera, Fotografar RG/CNH, Autorizar Geolocalização, Validar Código WhatsApp, Baixar PDF Assinado ]
```

---

## 4. MAPA DE MUDANÇAS COM OS CAMINHOS ANTIGOS E PROPOSTOS

A tabela abaixo consolida cada função realocada, reexposta ou acoplada, garantindo **100% de retrocompatibilidade de rotas** (nenhuma URL existente em `App.tsx` deixa de funcionar).

| Contexto | Função | Caminho Antigo no Menu | Caminho Proposto no Menu (8 Áreas) | Rota Existente Preservada | Tipo de Mudança |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Urbano & Rural** | Relatórios Analíticos (BI) | `Administração > Relatórios / BI` | `1. Visão geral > Inteligência & BI` | `/urban/bi`, `/rural/bi` | **Realocação no menu** (une métricas estratégicas ao Dashboard e Visão 360) |
| **Urbano & Rural** | Caixa de Entrada (WhatsApp, Instagram, E-mail) | `Atendimento & IA > Atendimento` (Urbano) / `Mensagens` (Rural) | `2. Atendimento > Caixa de Entrada (Omnichannel)` | `/urban/atendimento`, `/rural/atendimento` | **Padronização de nomenclatura + Abas por canal** |
| **Urbano & Rural** | Fila de Espera (Waitlist) | `Atendimento & IA > Fila de Espera` | `2. Atendimento > Fila de Espera` (e aba integrada na Caixa de Entrada) | `/urban/waitlist`, `/rural/waitlist` | **Agrupamento no menu + Atalho em aba** |
| **Urbano & Rural** | Central IA e Sub-rotas Workforce | `Atendimento & IA > Central IA` (sub-rotas sem navegação em abas fixas) | `2. Atendimento > Central de Agentes IA` (com barra de abas para Operações, Conhecimento, Sandbox, Arquitetura e Logs) | `/urban/ai`, `/rural/ai`, `/urban/ai/sandbox`, `/urban/ai/knowledge`, `/urban/ai/architecture`, `/urban/ai/logs` | **Organização em abas internas** |
| **Urbano & Rural** | Gestão de Leads (Lista) e Funil Kanban | `Comercial & CRM > Leads` + `Comercial & CRM > Funil / CRM` (2 itens separados) | `3. Comercial > Pipeline & Leads` (com seletor de visualização `Kanban` \| `Lista` \| `Qualificação` no topo da tela) | `/urban/leads`, `/urban/kanban`, `/urban/qualificacao`, `/rural/leads`, `/rural/kanban`, `/rural/qualificacao` | **Unificação de visualização com preservação de rotas** |
| **Urbano** | Funil de Captação de Imóveis | *(Oculto / Órfão de menu lateral)* | `3. Comercial > Captação de Imóveis` (e aba em `Catálogo de Imóveis`) | `/urban/captacao` | **Reexposição de função existente no menu** |
| **Urbano** | Controle de Chaves | *(Oculto / Órfão de menu lateral)* | `4. Imóveis > Controle de Chaves` | `/urban/chaves` | **Reexposição de função existente no menu** |
| **Urbano** | Administração de Condomínios | *(Oculto / Órfão de menu lateral)* | `4. Imóveis > Condomínios` | `/urban/condominios` | **Reexposição de função existente no menu** |
| **Rural** | Cadastro Técnico Rural | *(Oculto / Órfão de menu lateral)* | `4. Imóveis > Cadastro Técnico & Laudos` | `/rural/cadastro-tecnico` | **Reexposição de função existente no menu** |
| **Rural** | Mapas GIS, Localizar CAR, Valuation Rural, Dossiê Inteligente e Due Diligence | `Propriedades & Território` (4 itens repetindo o que já existe dentro de `RuralTerritoryHub`) | `4. Imóveis > Inteligência Territorial & CAR` (centralizando as 5 abas nativas de `RuralTerritoryHub.tsx`) | `/rural/territorio`, `/rural/territorio/maps`, `/rural/territorio/localizar-car`, `/rural/territorio/valuation`, `/rural/territorio/dossie`, `/rural/territorio/due-diligence` (mantendo `/rural/valuation`, `/rural/dossie`, `/rural/due-diligence` ativos) | **Eliminação de duplicidade lateral via Hub de Abas existente** |
| **Urbano & Rural** | Gestão de Locação, Cobrança e Borderô | `Locação & Cobrança` (Urbano) / `Arrendamento & Locação` (Rural) | `5. Locação > Contratos de Locação`, `Cobranças & Boletos`, `Repasses / Borderô` | `/urban/locacao`, `/urban/cobranca`, `/urban/locacao/bordero`, `/rural/locacao`, `/rural/cobranca`, `/rural/locacao/bordero` | **Padronização na área 5 (Locação)** |
| **Urbano & Rural** | Meu Site, Criador de Páginas e Quiz | `Marketing & Canais > Meu Site & Páginas` + `Campanhas & Quiz` | `6. Marketing > Meu Site & Criador de Páginas` + `Campanhas & Quiz` | `/urban/pages`, `/urban/quiz`, `/rural/pages`, `/rural/quiz` | **Agrupamento na área 6 (Marketing)** |
| **Urbano** | Clube de Benefícios (`ClubeImobzy`) | *(Oculto / Órfão no menu atual)* | `6. Marketing > Clube de Parcerias` | `/urban/clube` | **Reexposição de função existente no menu** |
| **Rural** | Financeiro Rural | *(Oculto / Órfão no menu lateral Rural)* | `7. Financeiro e Jurídico > Financeiro & Comissões Rurais` | `/rural/financeiro` | **Reexposição de função crítica existente no menu Rural** |
| **Urbano** | Financial Hub / Simulador Fintech | *(Oculto / Órfão no menu lateral atual)* | `7. Financeiro e Jurídico > Crédito & Garantia (Fintech)` | `/urban/fintech` | **Reexposição de função existente no menu Urbano** |
| **Urbano & Rural** | Contratos, Documentos e Data Room | `Financeiro & Jurídico > Contratos` + `Data Room` (`/urban/documentos` órfão) | `7. Financeiro e Jurídico > Contratos & Documentos` (com abas `Minutas & Contratos`, `Checklist Documental` e `Data Room`) | `/urban/contracts`, `/urban/documentos`, `/urban/dataroom`, `/rural/contracts`, `/rural/due-diligence`, `/rural/dataroom` | **Acoplamento em abas na área 7** |
| **Urbano** | Compliance e KYC Urbano | *(Oculto / Órfão no menu lateral atual)* | `7. Financeiro e Jurídico > Compliance & KYC` | `/urban/compliance` | **Reexposição de função existente no menu Urbano** |
| **Urbano & Rural** | Equipe & Acessos | `Administração > Equipe & Acessos` | `8. Configurações > Equipe & Permissões` (visível apenas para `admin`, `superadmin` e leitura para `gerente`) | `/urban/users`, `/rural/users` | **Realocação para Configurações + Restrição por perfil** |
| **Urbano & Rural** | Hub de Conexões e Canais | Duplicado entre `/urban/conexoes` (`/rural/conexoes`) e aba `Canais` em `/urban/settings` | `8. Configurações > Canais, Domínios & Sistema` (aba `Canais` consolidada com sub-abas WhatsApp, Instagram, E-mail SMTP e Webhooks) | `/urban/settings`, `/rural/settings`, `/urban/conexoes`, `/rural/conexoes` | **Unificação em abas dentro de Configurações** |
| **Urbano & Rural** | Portais de Proprietário, Comprador e Locatário | Rotas embutidas em `UrbanLayout` / `RuralLayout` sem item no menu | **Para Admin:** `8. Configurações > Acessos dos Portais (Clientes)`. **Para o Cliente Externo:** Layout próprio isolado sem sidebar do CRM. | `/urban/portal-proprietario`, `/urban/portal-comprador`, `/rural/portal-proprietario`, `/rural/portal-comprador`, `/portal-locatario` | **Desacoplamento de layout (segurança/UX) + Gestão em Configurações** |

---

## 5. FUNÇÕES QUE PODEM SER AGRUPADAS E FUSÕES QUE DEPENDEM DE VALIDAÇÃO

Abaixo está o parecer arquitetural e de UX para cada um dos **7 grupos funcionais** analisados, fundamentado nas tabelas do banco, rotas de API e permissões atuais.

---

### 5.1. Caso 1 — WhatsApp, Instagram, E-mail e Fila de Espera em Atendimento
- **Recomendação:** **Unificar a Caixa de Entrada (WhatsApp, Instagram e E-mail) em uma única tela com filtro por canal + Manter a Fila de Espera como aba integrada e atalho no menu `2. Atendimento`.**
- **Fundamentação Técnica:**
  - A view `views/AIAssistant.tsx` (`/urban/atendimento` e `/rural/atendimento`) e as rotas em `server/api/ai/chat.routes.js` já operam sobre conversas omnichannel associadas à organização (`organization_id`), distinguindo a origem pelo campo de canal (`whatsapp`, `instagram`, `webchat`, `email`).
  - A `Fila de Espera` (`views/admin/WaitlistLeads.tsx`, rota `/urban/waitlist` e `/rural/waitlist`) consulta leads pendentes de atendimento humano ou aguardando disponibilidade de imóvel.
  - **Caminho antigo:** `Atendimento & IA > Atendimento` (ou `Mensagens`) e `Atendimento & IA > Fila de Espera`.
  - **Caminho proposto:** `2. Atendimento > Caixa de Entrada` (contendo abas `Todos | WhatsApp | Instagram | E-mail | IA Ativa | Fila de Espera`) e item direto `2. Atendimento > Fila de Espera`.
  - **Rotas preservadas:** `/urban/atendimento`, `/rural/atendimento`, `/urban/waitlist`, `/rural/waitlist`.

---

### 5.2. Caso 2 — Leads e Kanban como Visualizações da Mesma Operação Comercial
- **Recomendação:** **Unificar em um único item de menu (`3. Comercial > Pipeline & Leads`) com alternador de visualização (`Kanban` | `Lista` | `Qualificação`) no cabeçalho da tela.**
- **Fundamentação Técnica:**
  - Tanto `views/CRM/CRMLeads.tsx` (`/urban/leads`, `/rural/leads`) quanto `views/CRM/KanbanBoard.tsx` (`/urban/kanban`, `/rural/kanban`) consomem **exatamente a mesma tabela `leads` e a mesma API `/api/crm/leads`** (`server/api/crm/leads.routes.js`), com as mesmas permissões (`verifyAuth` + `requireTenant`).
  - Manter dois itens separados na barra lateral (`Leads` e `Funil / CRM`) fragmenta a percepção do corretor sobre uma única base de oportunidades.
  - **Caminho antigo:** `Comercial & CRM > Leads` e `Comercial & CRM > Funil / CRM`.
  - **Caminho proposto:** `3. Comercial > Pipeline & Leads`, com abas superiores que alternam instantaneamente entre `/urban/kanban` (visão em colunas drag-and-drop) e `/urban/leads` (visão tabular para filtros em massa e exportação), além da aba `Qualificação Consultiva` (`/urban/qualificacao`).
  - **Rotas preservadas:** `/urban/leads`, `/urban/kanban`, `/urban/qualificacao`, `/rural/leads`, `/rural/kanban`, `/rural/qualificacao`.

---

### 5.3. Caso 3 — Meu Site, Criador de Páginas e Quiz em Marketing
- **Recomendação:** **Agrupar sob a área `6. Marketing` e organizar `Meu Site Institucional`, `Landing Pages de Imóveis/Lançamentos` e `Campanhas de Quiz` como abas de um Hub de Aquisição Digital (mantendo itens diretos no submenu de Marketing).**
- **Fundamentação Técnica:**
  - `views/LandingPageManager.tsx` (`/urban/pages`, `/rural/pages`) e `views/LandingPageEditor.tsx` (`/urban/pages/:id`) gerenciam a vitrine pública e as páginas de captura via `/api/sites` (`server/api/sites/index.js`).
  - `views/QuizCampaigns.tsx` (`/urban/quiz`, `/rural/quiz`) gerencia funis interativos via `/api/quiz` (`server/api/quiz/index.js`), cujo objetivo final é injetar leads qualificados na mesma tabela `leads` das Landing Pages.
  - Ambos compartilham configurações de domínio (`site_settings.custom_domain`) e pixels de rastreamento (`TrackingPixels.tsx`).
  - **Caminho antigo:** `Marketing & Canais > Meu Site & Páginas` e `Marketing & Canais > Campanhas & Quiz`.
  - **Caminho proposto:** `6. Marketing > Meu Site & Criador de Páginas` (`/urban/pages`, `/rural/pages`) e `6. Marketing > Campanhas & Quiz` (`/urban/quiz`, `/rural/quiz`), com navegação cruzada por abas no topo de ambas as telas.
  - **Rotas preservadas:** `/urban/pages`, `/urban/pages/:id`, `/urban/quiz`, `/rural/pages`, `/rural/pages/:id`, `/rural/quiz`.

---

### 5.4. Caso 4 — Contratos, Documentos e Data Room
- **Recomendação:** **Organizar em abas dentro de `7. Financeiro e Jurídico > Contratos & Documentos`, mantendo o `Data Room` também acessível diretamente para transações rurais e corporativas.**
- **Fundamentação Técnica:**
  - Atualmente existem três telas com forte sobreposição documental:
    1. `views/LegalContracts.tsx` (`/urban/contracts`, `/rural/contracts`) — geração de minutas e acompanhamento de assinaturas.
    2. `views/urban/GestaoDocumentos.tsx` (`/urban/documentos`, hoje órfã de menu) e `views/rural/DueDiligence.tsx` (`/rural/due-diligence`) — checklist de certidões do imóvel e das partes.
    3. `views/DataRoom.tsx` (`/urban/dataroom`, `/rural/dataroom`) — cofre seguro de arquivos no MinIO (`/api/documents` em `server/api/documents/index.js`) para compartilhamento com compradores/investidores.
  - No fluxo real da imobiliária, o documento nasce no checklist (`GestaoDocumentos` / `DueDiligence`), compõe o cofre auditável (`DataRoom`) e anexa-se à minuta assinada (`LegalContracts` $\rightarrow$ `/assinatura/:token`).
  - **Caminho antigo:** `Financeiro & Jurídico > Contratos`, `Financeiro & Jurídico > Data Room` e `/urban/documentos` (sem menu).
  - **Caminho proposto:** `7. Financeiro e Jurídico > Contratos & Documentos` com 3 abas (`1. Minutas & Assinaturas`, `2. Checklist & Certidões`, `3. Cofre Data Room`).
  - **Rotas preservadas:** `/urban/contracts`, `/urban/documentos`, `/urban/dataroom`, `/rural/contracts`, `/rural/due-diligence`, `/rural/dataroom`.

---

### 5.5. Caso 5 — Gestão de Locação, Repasses e Financeiro
- **Recomendação:** **Manter `Gestão de Locação`, `Cobranças` e `Repasses / Borderô` acoplados na área `5. Locação`, e manter `Financeiro da Imobiliária` separado na área `7. Financeiro e Jurídico` (NÃO fundir o caixa da imobiliária com a conta gráfica de repasses de aluguel).**
- **Fundamentação Técnica e Contábil:**
  - As telas `RentalsManagement.tsx` (`/urban/locacao`), `Cobranca.tsx` (`/urban/cobranca`) e `RentalsBordero.tsx` (`/urban/locacao/bordero`) operam sobre `leases` / `rental_contracts` e `billing`, tratando **valores de terceiros** (aluguel recebido do inquilino que deve ser repassado ao proprietário descontando apenas a taxa de administração de 8%–10%).
  - Já `FinanceiroUrbano.tsx` (`/urban/financeiro`) e `FinanceiroRural.tsx` (`/rural/financeiro`) operam sobre `financial_transactions` (receita própria da imobiliária, comissões de vendas de corretores, despesas operacionais e DRE).
  - **Por que depende de validação antes de qualquer fusão de tela:** Unificar `Borderô de Locação` com `Financeiro Geral` sem segregação contábil mistura dinheiro do proprietário (passivo transitório) com receita própria da imobiliária, gerando risco fiscal (DIMOB) e expondo o DRE da empresa para operadores de locação. Portanto, devem permanecer em áreas distintas (`5. Locação` vs. `7. Financeiro e Jurídico`), integrando-se apenas pelo lançamento automático da "Taxa de Administração retida" no caixa da imobiliária.
  - **Rotas preservadas:** `/urban/locacao`, `/urban/locacao/bordero`, `/urban/cobranca`, `/urban/financeiro`, `/rural/locacao`, `/rural/locacao/bordero`, `/rural/cobranca`, `/rural/financeiro`.

---

### 5.6. Caso 6 — Conexões e Canais em Configurações, com Abas por Canal
- **Recomendação:** **Unificar as telas paralelas `/urban/conexoes` e `/rural/conexoes` dentro de `8. Configurações > Canais, Domínios & Sistema` (`views/SystemSettings.tsx`), estruturando a aba `Canais & Mensageria` com sub-abas por canal.**
- **Fundamentação Técnica:**
  - Atualmente o sistema possui duplicidade: as rotas `/urban/conexoes` (`views/urban/ConexoesUrbano.tsx`) e `/rural/conexoes` (`views/rural/ConexoesRural.tsx`) cumprem o mesmo papel das abas `Canais` (`ChannelsSettings.tsx`) e `Servidor de E-mail` (`SmtpSettings.tsx`) dentro de `views/SystemSettings.tsx` (`/urban/settings` e `/rural/settings`).
  - **Estrutura proposta dentro de `SystemSettings.tsx`:**
    - Aba **Canais de Atendimento** com sub-abas:
      1. `WhatsApp (Evolution API / QR Code)`
      2. `Instagram Direct & Messenger`
      3. `Servidor de E-mail (SMTP)` (absorvendo a aba isolada `smtp`)
      4. `Webhooks & Chat Widget`
  - **Caminho antigo:** Aba `Canais` + Aba `Servidor de E-mail` em `/urban/settings` + rotas soltas `/urban/conexoes` e `/rural/conexoes`.
  - **Caminho proposto:** `8. Configurações > Canais, Domínios & Sistema > Aba Canais`.
  - **Rotas preservadas:** `/urban/settings`, `/rural/settings`, `/urban/conexoes`, `/rural/conexoes`.

---

### 5.7. Caso 7 — Exportação de Imóveis para Portais e Administração dos Portais de Proprietário, Comprador e Locatário
- **Recomendação:** **Separar claramente "Portais de Anúncio (Marketplaces Externos)" em `6. Marketing` de "Portais de Autoatendimento do Cliente (Proprietário, Comprador, Locatário)" em `8. Configurações` + Layout Externo Isolado.**
- **Fundamentação Técnica:**
  - **Portais de Anúncio (ZAP, VivaReal, OLX, Imovelweb, Órulo):**
    - A operação diária de selecionar imóveis, destacar anúncios e copiar/sincronizar feeds XML fica em `views/urban/ExportadorPortais.tsx` (`/urban/exportador`, `/rural/exportador`), que pertence à rotina de **`6. Marketing > Portais & Feeds XML`**.
    - Já a configuração das chaves de API e tokens mestres (como Client ID / Secret da Órulo) fica em `8. Configurações > Aba Portais & Órulo` (`SystemSettings.tsx#L427-L560`), e a conexão individual do corretor permanece em `/urban/settings` para o perfil `broker` (`SystemSettings.tsx#L274-L343`).
  - **Portais de Proprietário, Comprador e Locatário:**
    - Tratam-se de ambientes de **autoatendimento para clientes finais** da imobiliária (`PortalProprietarioUrbano`, `PortalCompradorUrbano`, `PortalProprietarioRural`, `PortalCompradorRural`, `PortalLocatario`).
    - **Mudança Crítica Recomendada:** Retirar as rotas `/urban/portal-proprietario`, `/urban/portal-comprador`, `/rural/portal-proprietario` e `/rural/portal-comprador` de dentro da moldura `UrbanLayout` / `RuralLayout` para quando o usuário tiver papel `user` (`CUSTOMER_USER`), evitando que proprietários e compradores vejam a barra lateral interna da imobiliária, e criar em `8. Configurações > Acessos dos Portais (Clientes)` um painel para o `admin` convidar proprietários/inquilinos e visualizar o portal no modo "Ver como Cliente".
  - **Rotas preservadas:** `/urban/exportador`, `/rural/exportador`, `/urban/portal-proprietario`, `/urban/portal-comprador`, `/rural/portal-proprietario`, `/rural/portal-comprador`, `/portal-locatario`, `/urban/portal-locatario`.

---

### 5.8. Resumo das Fusões que Dependem de Validação de Negócio e Segurança Antes de Implementação

1. **Permissão de Cadastro/Edição de Imóveis por `gerente` e `broker` (`server/api/properties/index.js#L140,L199`):**
   - Validar se corretores (`broker`) e gerentes (`gerente`) devem poder criar e editar imóveis diretamente (ou criar com `status = 'pendente_aprovacao'`), ajustando o middleware `verifyAdmin` para permitir `['admin', 'superadmin', 'gerente', 'broker']` conforme a política de cada imobiliária.
2. **Isolamento de Carteira de Leads por Corretor (`server/api/crm/leads.routes.js#L35`):**
   - Validar se o perfil `broker` deve enxergar **apenas** leads onde `broker_id = req.user.id` (ou `assigned_to = req.user.id`), enquanto `gerente` e `admin` enxergam toda a `organization_id`.
3. **Unificação entre `RuralTerritoryHub` e itens soltos do menu Rural (`components/RuralLayout.tsx#L114-L119`):**
   - Atualmente o menu lateral Rural lista `Território & CAR` (`/rural/territorio`) e logo abaixo repete `Valuation Rural` (`/rural/valuation`), `Dossiê Inteligente` (`/rural/dossie`) e `Due Diligence` (`/rural/due-diligence`), que já são abas internas de `RuralTerritoryHub.tsx`. Consolidá-los em um único item `Inteligência Territorial & CAR` limpa o menu lateral Rural sem perder nenhuma funcionalidade.

---

## 6. LACUNAS DE EVIDÊNCIA E ARQUIVOS CONSULTADOS

### 6.1. O Que Foi Conferido em Execução no Ambiente Local vs. Inspeção Estática do Código

#### Conferido em Execução Real (`localhost:3006` Frontend + `localhost:3002` Backend + Banco Supabase `ahimxutcthctbwpaedvy` + Storage MinIO `imob.erp`)
1. **Autenticação e Resolução de Contexto Inicial:** Validado o login real e o redirecionamento automático (`getAuthenticatedPanelPath`) para os perfis provisionados de demonstração:
   - **Master (`PLATFORM_OWNER`):** Redirecionamento para `/woo-control/overview` e navegação pela `WorkspaceTopBar` entre `Master`, `Mega Admin`, `Revenda`, `Urbano` e `Rural`.
   - **MegaAdmin (`superadmin` global):** Acesso a `/megaadmin`, Feature Flags, Storage MinIO e listagem global de organizações.
   - **Revenda Whitelabel (`superadmin` com `is_reseller = true`):** Acesso a `/superadmin`, isolamento de carteira (`parent_id`) e alternância para `/urban` e `/rural`.
   - **Admin e Corretor Urbano (`traditional`):** Navegação em `/urban`, criação de imóveis, leads, clientes, agenda, páginas (`LandingPageManager`), quizzes, contratos de locação e cobrança.
   - **Admin e Corretor Rural (`rural`):** Navegação em `/rural`, propriedades rurais, hub territorial (`/rural/territorio`), valuation CAR, dossiê 360 e due diligence.
2. **Comportamento Visual de `SystemSettings.tsx` por Perfil:** Confirmado que o perfil `broker` enxerga exclusivamente a tela de conexão individual Órulo em `/urban/settings` e `/rural/settings`, enquanto `admin` e `superadmin` enxergam as 8 abas completas.
3. **Modo Suporte (Impersonação):** Confirmado o funcionamento do banner superior vermelho (`ImpersonationBanner.tsx`) ao impersonar a `Revenda Prime SaaS` e a `Fazendas Brasil Agro`, bem como a trava de segurança em `/api/woo-control/*` quando `isImpersonating = true`.

#### Constatado pela Leitura Estática do Código-Fonte
1. **Comportamento dos papéis `gerente`, `assistente` e `user`:** Constatado pela análise de `server/middleware/auth.js#L686-L723`, `server/api/properties/index.js` e `views/SystemSettings.tsx#L274` que esses papéis são normalizados no backend, mas não possuem tratamento dedicado nos arrays de menu de `UrbanLayout.tsx` e `RuralLayout.tsx`.
2. **Existência das 13 rotas internas órfãs de menu lateral:** Constatado pelo cruzamento exaustivo de todas as tags `<Route>` de [App.tsx](file:///c:/Users/paulo/woomobzy/App.tsx) com os arrays `menuGroups` de [UrbanLayout.tsx](file:///c:/Users/paulo/woomobzy/components/UrbanLayout.tsx) e [RuralLayout.tsx](file:///c:/Users/paulo/woomobzy/components/RuralLayout.tsx).
3. **Papéis corporativos auxiliares (`SUPPORT_MANAGER`, `FINANCE_ADMIN`, `DEPLOYMENT_MANAGER`):** Constatado em `server/middleware/auth.js#L708-L712` que são mapeados diretamente para `req.userRole = 'admin'`, sem menu específico próprio.

---

### 6.2. Lacunas de Evidência Identificadas no Repositório

1. **Ausência de Tabela de Permissões Granulares (RBAC Dinâmico por Ação):**
   - Não existe no banco de dados nem nas migrations (`migrations/`) uma tabela `role_permissions` ou `user_permissions` que permita configurar permissões individuais por imobiliária (ex.: permitir que corretores de uma imobiliária específica editem imóveis enquanto outra imobiliária bloqueia). Toda a autorização atual é estática no código (`verifyAuth` vs. `verifyAdmin`).
2. **Feature Flags sem Enforcement Completo na Sidebar:**
   - Embora [FeatureFlags.tsx](file:///c:/Users/paulo/woomobzy/views/megaadmin/FeatureFlags.tsx) grave flags em `site_settings.integrations_config.feature_flags` (`ai_assistant`, `whatsapp_integration`, `portal_sync`, `rural_gis`, `bi_analytics`, `electronic_signature`), os componentes [UrbanLayout.tsx](file:///c:/Users/paulo/woomobzy/components/UrbanLayout.tsx) e [RuralLayout.tsx](file:///c:/Users/paulo/woomobzy/components/RuralLayout.tsx) não ocultam dinamicamente os itens do menu quando uma flag é desativada no MegaAdmin.
3. **Políticas RLS do Supabase vs. Uso de Service Role no Backend:**
   - Várias rotas de backend em `server/routes/admin.js` e `server/routes/woo-control.js` utilizam `getSupabaseServer()` (Service Role Key), dependendo exclusivamente dos filtros `.eq('organization_id', req.orgId)` aplicados no código Node.js em vez de Row Level Security (RLS) nativo do PostgreSQL.

---

### 6.3. Arquivos Consultados na Auditoria

#### Roteamento, Layouts, Contextos e Guardas (Frontend)
- [App.tsx](file:///c:/Users/paulo/woomobzy/App.tsx) — Definição completa de todas as rotas públicas, `/rural`, `/urban`, `/woo-control`, `/megaadmin` e `/superadmin`.
- [src/lib/panelNavigation.ts](file:///c:/Users/paulo/woomobzy/src/lib/panelNavigation.ts) — Regras de detecção de papel (`isPlatformAdminRole`, `isPlatformOwnerRole`, `isMegaAdminProfile`) e redirecionamento de painel (`getAuthenticatedPanelPath`).
- [context/AuthContext.tsx](file:///c:/Users/paulo/woomobzy/context/AuthContext.tsx) — Sessão, carregamento de `profile`, `organization` e estado `isImpersonating`.
- [components/WorkspaceTopBar.tsx](file:///c:/Users/paulo/woomobzy/components/WorkspaceTopBar.tsx) — Barra global de alternância entre Master, Mega Admin, Revenda, Urbano e Rural.
- [components/UrbanLayout.tsx](file:///c:/Users/paulo/woomobzy/components/UrbanLayout.tsx) — Menu lateral, cabeçalho e estrutura do CRM Urbano.
- [components/RuralLayout.tsx](file:///c:/Users/paulo/woomobzy/components/RuralLayout.tsx) — Menu lateral, cabeçalho e estrutura do CRM Rural.
- [views/superadmin/SuperAdminLayout.tsx](file:///c:/Users/paulo/woomobzy/views/superadmin/SuperAdminLayout.tsx) — Menu lateral e estrutura do Painel da Revenda.
- [views/megaadmin/MegaAdminLayout.tsx](file:///c:/Users/paulo/woomobzy/views/megaadmin/MegaAdminLayout.tsx) — Menu lateral e estrutura do Painel Mega Admin.
- [views/woocontrol/WooControlLayout.tsx](file:///c:/Users/paulo/woomobzy/views/woocontrol/WooControlLayout.tsx) — Menu lateral e estrutura do Painel Master WooControl.
- [components/ProtectedRoute.tsx](file:///c:/Users/paulo/woomobzy/components/ProtectedRoute.tsx) — Guarda de autenticação e verificação opcional `requireAdmin`.
- [components/PanelGuard.tsx](file:///c:/Users/paulo/woomobzy/components/PanelGuard.tsx) — Guarda de contexto Urbano vs. Rural e liberação para administradores de plataforma/revenda.
- [components/SuperAdminGuard.tsx](file:///c:/Users/paulo/woomobzy/components/SuperAdminGuard.tsx) — Guarda de acesso ao painel `/superadmin`.
- [components/MegaAdminGuard.tsx](file:///c:/Users/paulo/woomobzy/components/MegaAdminGuard.tsx) — Guarda de acesso ao painel `/megaadmin`.
- [components/WooControlGuard.tsx](file:///c:/Users/paulo/woomobzy/components/WooControlGuard.tsx) — Guarda de acesso exclusivo ao painel `/woo-control`.
- [components/SubscriptionGuard.tsx](file:///c:/Users/paulo/woomobzy/components/SubscriptionGuard.tsx) — Verificação de vigência de assinatura e período de trial.
- [components/SuspendedGuard.tsx](file:///c:/Users/paulo/woomobzy/components/SuspendedGuard.tsx) — Bloqueio de organizações com `status === 'suspended'`.
- [components/ImpersonationBanner.tsx](file:///c:/Users/paulo/woomobzy/components/ImpersonationBanner.tsx) — Banner de controle e saída do Modo Suporte.

#### Views Principais e Portais Auditados (Frontend)
- [views/SystemSettings.tsx](file:///c:/Users/paulo/woomobzy/views/SystemSettings.tsx) — Configurações do sistema (8 abas para admin vs. cartão Órulo para corretor).
- [views/megaadmin/FeatureFlags.tsx](file:///c:/Users/paulo/woomobzy/views/megaadmin/FeatureFlags.tsx) — Catálogo de feature flags da plataforma.
- [views/rural/RuralTerritoryHub.tsx](file:///c:/Users/paulo/woomobzy/views/rural/RuralTerritoryHub.tsx) — Hub de abas de Inteligência Territorial Rural.
- [views/RentalsManagement.tsx](file:///c:/Users/paulo/woomobzy/views/RentalsManagement.tsx) — Gestão de contratos de locação e indicadores.
- [views/AICentral.tsx](file:///c:/Users/paulo/woomobzy/views/AICentral.tsx) — Central de operações e agentes de IA Workforce.
- [views/urban/FinancialHub.tsx](file:///c:/Users/paulo/woomobzy/views/urban/FinancialHub.tsx) — Simulador de crédito imobiliário, parcelamento direto e fiança locatícia.
- [views/urban/PortalProprietarioUrbano.tsx](file:///c:/Users/paulo/woomobzy/views/urban/PortalProprietarioUrbano.tsx) — Portal do Proprietário Urbano.
- [views/urban/PortalCompradorUrbano.tsx](file:///c:/Users/paulo/woomobzy/views/urban/PortalCompradorUrbano.tsx) — Portal do Comprador Urbano.
- [views/urban/PortalLocatario.tsx](file:///c:/Users/paulo/woomobzy/views/urban/PortalLocatario.tsx) — Portal do Locatário.
- [views/public/SignaturePortal.tsx](file:///c:/Users/paulo/woomobzy/views/public/SignaturePortal.tsx) — Portal público de assinatura eletrônica com biometria.

#### Middlewares, Rotas e Controladores de Autorização (Backend)
- [server/middleware/auth.js](file:///c:/Users/paulo/woomobzy/server/middleware/auth.js) — `verifyAuth`, `normalizeRole`, `requireRole`, `verifyAdmin`, `verifySuperAdmin`, `verifyMegaAdmin`, `verifyPlatformAdmin` e validação de `impersonation_sessions`.
- [server/middleware/tenant.js](file:///c:/Users/paulo/woomobzy/server/middleware/tenant.js) — `requireTenant` e isolamento multi-tenant por `req.orgId`.
- [server/routes/woo-control.js](file:///c:/Users/paulo/woomobzy/server/routes/woo-control.js) — Endpoints globais do Master (`verifyPlatformAdmin`).
- [server/routes/admin.js](file:///c:/Users/paulo/woomobzy/server/routes/admin.js) — Escopo de Revenda vs. MegaAdmin (`getSuperAdminOrganizationScope`), gestão de organizações, planos, usuários e impersonação.
- [server/api/properties/index.js](file:///c:/Users/paulo/woomobzy/server/api/properties/index.js) — API de imóveis (`verifyAuth` na listagem vs. `verifyAdmin` na criação/edição/exclusão).
- [server/api/crm/leads.routes.js](file:///c:/Users/paulo/woomobzy/server/api/crm/leads.routes.js) — API de leads e pipeline comercial.
- [server/api/crm/clients/index.js](file:///c:/Users/paulo/woomobzy/server/api/crm/clients/index.js) — API de clientes (`Proprietario`, `Comprador`, `Locatario`).
- [server/api/locacao/index.js](file:///c:/Users/paulo/woomobzy/server/api/locacao/index.js), [server/api/locacao/lease.routes.js](file:///c:/Users/paulo/woomobzy/server/api/locacao/lease.routes.js), [server/api/locacao/contract.routes.js](file:///c:/Users/paulo/woomobzy/server/api/locacao/contract.routes.js) — APIs de locação, contratos e assinatura eletrônica.
- [server/api/cobranca/index.js](file:///c:/Users/paulo/woomobzy/server/api/cobranca/index.js) — API de cobranças e boletos.
- [server/api/sites/index.js](file:///c:/Users/paulo/woomobzy/server/api/sites/index.js) e [server/api/quiz/index.js](file:///c:/Users/paulo/woomobzy/server/api/quiz/index.js) — APIs de sites, landing pages e quizzes.
- [server/api/urban/index.js](file:///c:/Users/paulo/woomobzy/server/api/urban/index.js) e [server/api/valuation/index.js](file:///c:/Users/paulo/woomobzy/server/api/valuation/index.js) — APIs específicas de operações urbanas (captação, chaves) e rurais (valuation CAR).
- [server/api/ai/agents.routes.js](file:///c:/Users/paulo/woomobzy/server/api/ai/agents.routes.js) e [server/api/ai/chat.routes.js](file:///c:/Users/paulo/woomobzy/server/api/ai/chat.routes.js) — APIs de agentes de IA e atendimento omnichannel.
