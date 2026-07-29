# Matriz mestra de auditoria funcional — IMOBZY

**Gerada em:** 2026-07-28T18:51:59.947Z  
**Fonte:** `App.tsx` analisado por AST  
**Status inicial:** PENDENTE até execução com evidência

> Esta matriz é um inventário estrutural. Uma rota referenciada por teste não é automaticamente considerada validada.

## Resumo

| Painel | Rotas inventariadas |
| --- | ---: |
| Público/compartilhado | 20 |
| Urbano | 49 |
| Rural | 48 |
| Super Admin | 13 |
| Mega Admin | 13 |
| **Total** | **143** |

## Casos

| ID | Painel | Rota | Componente | Arquivo | Proteção | Risco | Tipo | Cobertura encontrada | Status | Fonte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AF-001 | Público/compartilhado | `/impersonate` | `ImpersonateCallback` | `views/ImpersonateCallback.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:214 |
| AF-002 | Público/compartilhado | `/login` | `Login` | `views/Login.tsx` | Herdado | CRÍTICO | função | REFERENCIADA: tests/e2e/public-surfaces.spec.ts, tests/e2e/tenant-isolation.spec.ts | PENDENTE | App.tsx:217 |
| AF-003 | Público/compartilhado | `/onboarding` | `Onboarding` | `views/Onboarding.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:224 |
| AF-004 | Público/compartilhado | `/register` | `Register` | `views/Register.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:222 |
| AF-005 | Público/compartilhado | `/` | `SystemSalesPage` | `views/SystemSalesPage.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:206 |
| AF-006 | Público/compartilhado | `/:slug/site/*` | `PublicSite` | `views/PublicSite.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:226 |
| AF-007 | Público/compartilhado | `/*` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | REVISAR | PENDENTE | App.tsx:473 |
| AF-008 | Público/compartilhado | `/admin` | `NicheRedirect` | `components/NicheRedirect.tsx` | ProtectedRoute | MÉDIO | função | REFERENCIADA: server/__tests__/adminOrganizationsFallback.test.ts | PENDENTE | App.tsx:231 |
| AF-009 | Público/compartilhado | `/admin/*` | `NicheRedirect` | `components/NicheRedirect.tsx` | ProtectedRoute | MÉDIO | função | REVISAR | PENDENTE | App.tsx:239 |
| AF-010 | Público/compartilhado | `/ajuda/dns` | `DnsHelp` | `views/DnsHelp.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:213 |
| AF-011 | Público/compartilhado | `/consultoria` | `SystemSalesPage` | `views/SystemSalesPage.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:208 |
| AF-012 | Público/compartilhado | `/consultoria/qualificacao` | `ConsultingQualificacao` | `views/ConsultingQualificacao.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:209 |
| AF-013 | Público/compartilhado | `/embreve` | `PublicLandingPage` | `views/PublicLandingPage.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:218 |
| AF-014 | Público/compartilhado | `/lp/:slug` | `PublicLandingPage` | `views/PublicLandingPage.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:215 |
| AF-015 | Público/compartilhado | `/portal-locatario` | `PortalLocatario` | `views/urban/PortalLocatario.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:223 |
| AF-016 | Público/compartilhado | `/quiz/:slug` | `PublicQuiz` | `views/PublicQuiz.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:216 |
| AF-017 | Público/compartilhado | `/setup-whitelabel` | `SetupWhitelabel` | `views/SetupWhitelabel.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:225 |
| AF-018 | Público/compartilhado | `/site/:slug/*` | `PublicSite` | `views/PublicSite.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:227 |
| AF-019 | Público/compartilhado | `/sites/:slug/*` | `PublicSite` | `views/PublicSite.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:228 |
| AF-020 | Público/compartilhado | `/vendas` | `SystemSalesPage` | `views/SystemSalesPage.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:207 |
| AF-021 | Urbano | `/urban/cobranca` | `Cobranca` | `views/urban/Cobranca.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:370 |
| AF-022 | Urbano | `/urban/contracts` | `LegalContracts` | `views/LegalContracts.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:409 |
| AF-023 | Urbano | `/urban/financeiro` | `FinanceiroUrbano` | `views/urban/FinanceiroUrbano.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:379 |
| AF-024 | Urbano | `/urban/integrations` | `SystemSettings` | `views/SystemSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:416 |
| AF-025 | Urbano | `/urban/locacao` | `RentalsManagement` | `views/RentalsManagement.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:362 |
| AF-026 | Urbano | `/urban/locacao/bordero` | `RentalsBordero` | `views/RentalsBordero.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:367 |
| AF-027 | Urbano | `/urban/locacao/contrato` | `RentalsContractEditor` | `views/RentalsContractEditor.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:363 |
| AF-028 | Urbano | `/urban/settings` | `SystemSettings` | `views/SystemSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:417 |
| AF-029 | Urbano | `/urban/clients` | `ClientsManager` | `views/CRM/ClientsManager.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:374 |
| AF-030 | Urbano | `/urban/compliance` | `ComplianceUrbano` | `views/urban/ComplianceUrbano.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:369 |
| AF-031 | Urbano | `/urban/crm` | `CRMLeads` | `views/CRM/CRMLeads.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:373 |
| AF-032 | Urbano | `/urban/documentos` | `GestaoDocumentos` | `views/urban/GestaoDocumentos.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:382 |
| AF-033 | Urbano | `/urban/email` | `EmailCenter` | `views/EmailCenter.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:414 |
| AF-034 | Urbano | `/urban/empreendimentos` | `Empreendimentos` | `views/urban/Empreendimentos.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:357 |
| AF-035 | Urbano | `/urban/loteamentos` | `Empreendimentos` | `views/urban/Empreendimentos.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:358 |
| AF-036 | Urbano | `/urban/loteamentos/:id` | `LoteamentoDetails` | `views/urban/LoteamentoDetails.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:359 |
| AF-037 | Urbano | `/urban/properties` | `PropertyManagement` | `views/PropertyManagement` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:354 |
| AF-038 | Urbano | `/urban/properties/:id` | `PropertyEditor` | `views/PropertyEditor.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:356 |
| AF-039 | Urbano | `/urban/properties/new` | `PropertyEditor` | `views/PropertyEditor.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:355 |
| AF-040 | Urbano | `/urban/whatsapp` | `WhatsAppDashboard` | `views/WhatsApp/WhatsAppDashboard` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:410 |
| AF-041 | Urbano | `/urban/whatsapp/campaigns` | `CampaignManager` | `views/WhatsApp/CampaignManager.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:411 |
| AF-042 | Urbano | `/urban/whatsapp/campaigns/:id` | `CampaignEditor` | `views/WhatsApp/CampaignEditor.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:412 |
| AF-043 | Urbano | `/urban` | `UrbanLayout` | `components/UrbanLayout.tsx` | ProtectedRoute, PanelGuard, SubscriptionGuard | MÉDIO | função | REFERENCIADA: src/test/superAdminGuard.test.ts, src/test/urbanMenuRoutes.test.ts | PENDENTE | App.tsx:340 |
| AF-044 | Urbano | `/urban` | `UrbanDashboard` | `views/UrbanDashboard.tsx` | Herdado | MÉDIO | índice | REFERENCIADA: src/test/superAdminGuard.test.ts, src/test/urbanMenuRoutes.test.ts | PENDENTE | App.tsx:352 |
| AF-045 | Urbano | `/urban/360` | `Dashboard360` | `views/admin/Dashboard360.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:353 |
| AF-046 | Urbano | `/urban/ai-agents` | `AIAgents` | `views/AIAgents.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:407 |
| AF-047 | Urbano | `/urban/ai-assistant` | `AIAssistant` | `views/AIAssistant.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:406 |
| AF-048 | Urbano | `/urban/chaves` | `ControleChaves` | `views/urban/ControleChaves.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:378 |
| AF-049 | Urbano | `/urban/clube` | `ClubeImobzy` | `views/urban/ClubeImobzy.tsx` | Herdado | MÉDIO | função | REFERENCIADA: src/test/urbanMenuRoutes.test.ts | PENDENTE | App.tsx:381 |
| AF-050 | Urbano | `/urban/condominios` | `AdmCondominios` | `views/urban/AdmCondominios.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:377 |
| AF-051 | Urbano | `/urban/connections` | `ConexoesUrbano` | `views/urban/ConexoesUrbano.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:415 |
| AF-052 | Urbano | `/urban/exportador` | `ExportadorPortais` | `views/urban/ExportadorPortais.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:372 |
| AF-053 | Urbano | `/urban/fintech` | `FinancialHub` | `views/urban/FinancialHub.tsx` | Herdado | MÉDIO | função | REFERENCIADA: src/test/urbanMenuRoutes.test.ts | PENDENTE | App.tsx:380 |
| AF-054 | Urbano | `/urban/instagram` | `InstagramDashboard` | `views/Instagram/InstagramDashboard.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:413 |
| AF-055 | Urbano | `/urban/kanban` | `KanbanBoard` | `views/CRM/KanbanBoard` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:375 |
| AF-056 | Urbano | `/urban/landing-pages` | `LandingPageManager` | `views/LandingPageManager.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:392 |
| AF-057 | Urbano | `/urban/landing-pages/:id` | `LandingPageEditor` | `views/LandingPageEditor.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:394 |
| AF-058 | Urbano | `/urban/portal-comprador` | `PortalCompradorUrbano` | `views/urban/PortalCompradorUrbano.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:387 |
| AF-059 | Urbano | `/urban/portal-locatario` | `PortalLocatario` | `views/urban/PortalLocatario.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:391 |
| AF-060 | Urbano | `/urban/portal-proprietario` | `PortalProprietarioUrbano` | `views/urban/PortalProprietarioUrbano.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:383 |
| AF-061 | Urbano | `/urban/quiz` | `QuizCampaigns` | `views/QuizCampaigns.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:393 |
| AF-062 | Urbano | `/urban/reports` | `BIUrbano` | `views/BIUrbano.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:376 |
| AF-063 | Urbano | `/urban/simulador` | `Simulator360` | `views/urban/Simulator360.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:371 |
| AF-064 | Urbano | `/urban/site` | `SiteManager` | `views/SiteManager.tsx` | Herdado | MÉDIO | função | REFERENCIADA: src/test/superAdminGuard.test.ts | PENDENTE | App.tsx:395 |
| AF-065 | Urbano | `/urban/site-setup` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:398 |
| AF-066 | Urbano | `/urban/site/pages/:id` | `SitePageEditor` | `views/SitePageEditor.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:396 |
| AF-067 | Urbano | `/urban/visual-editor` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:402 |
| AF-068 | Urbano | `/urban/waitlist` | `WaitlistLeads` | `views/admin/WaitlistLeads.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:397 |
| AF-069 | Urbano | `/urban/wootech-ai` | `WooTechAI` | `views/WooTechAI.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:408 |
| AF-070 | Rural | `/rural/contracts` | `LegalContracts` | `views/LegalContracts.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:326 |
| AF-071 | Rural | `/rural/financeiro-advanced` | `Locacao` | `views/urban/Locacao.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:328 |
| AF-072 | Rural | `/rural/financial` | `FinanceiroRural` | `views/rural/FinanceiroRural.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:327 |
| AF-073 | Rural | `/rural/integrations` | `SystemSettings` | `views/SystemSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:335 |
| AF-074 | Rural | `/rural/settings` | `SystemSettings` | `views/SystemSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:336 |
| AF-075 | Rural | `/rural/crm` | `CRMLeads` | `views/CRM/CRMLeads.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:300 |
| AF-076 | Rural | `/rural/due-diligence` | `Navigate` | `Externo/inline` | Herdado | ALTO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:289 |
| AF-077 | Rural | `/rural/email` | `EmailCenter` | `views/EmailCenter.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:333 |
| AF-078 | Rural | `/rural/localizar-car` | `Navigate` | `Externo/inline` | Herdado | ALTO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:279 |
| AF-079 | Rural | `/rural/properties` | `PropertyManagement` | `views/PropertyManagement` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:264 |
| AF-080 | Rural | `/rural/properties/:id` | `PropertyEditor` | `views/PropertyEditor.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:266 |
| AF-081 | Rural | `/rural/properties/new` | `PropertyEditor` | `views/PropertyEditor.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:265 |
| AF-082 | Rural | `/rural/territorio/due-diligence` | `DueDiligence` | `views/rural/DueDiligence.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:272 |
| AF-083 | Rural | `/rural/territorio/localizar-car` | `CARLocationSearch` | `views/rural/CARLocationSearch.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:270 |
| AF-084 | Rural | `/rural/territorio/valuation` | `ValuationRural` | `views/rural/ValuationRural.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:271 |
| AF-085 | Rural | `/rural/valuation` | `Navigate` | `Externo/inline` | Herdado | ALTO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:285 |
| AF-086 | Rural | `/rural/whatsapp` | `WhatsAppDashboard` | `views/WhatsApp/WhatsAppDashboard` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:329 |
| AF-087 | Rural | `/rural/whatsapp/campaigns` | `CampaignManager` | `views/WhatsApp/CampaignManager.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:330 |
| AF-088 | Rural | `/rural/whatsapp/campaigns/:id` | `CampaignEditor` | `views/WhatsApp/CampaignEditor.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:331 |
| AF-089 | Rural | `/rural` | `RuralLayout` | `components/RuralLayout.tsx` | ProtectedRoute, PanelGuard, SubscriptionGuard | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:249 |
| AF-090 | Rural | `/rural` | `RuralDashboard` | `views/RuralDashboard.tsx` | Herdado | MÉDIO | índice | SEM REFERÊNCIA | PENDENTE | App.tsx:261 |
| AF-091 | Rural | `/rural/360` | `Dashboard360` | `views/admin/Dashboard360.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:262 |
| AF-092 | Rural | `/rural/ai-agents` | `AIAgents` | `views/AIAgents.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:324 |
| AF-093 | Rural | `/rural/ai-assistant` | `AIAssistant` | `views/AIAssistant.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:323 |
| AF-094 | Rural | `/rural/cadastro-tecnico` | `CadastroTecnico` | `views/rural/CadastroTecnico.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:263 |
| AF-095 | Rural | `/rural/connections` | `ConexoesRural` | `views/rural/ConexoesRural.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:334 |
| AF-096 | Rural | `/rural/dataroom` | `DataRoom` | `views/DataRoom.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:299 |
| AF-097 | Rural | `/rural/dossie` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:295 |
| AF-098 | Rural | `/rural/instagram` | `InstagramDashboard` | `views/Instagram/InstagramDashboard.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:332 |
| AF-099 | Rural | `/rural/kanban` | `KanbanBoard` | `views/CRM/KanbanBoard` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:301 |
| AF-100 | Rural | `/rural/landing-pages` | `LandingPageManager` | `views/LandingPageManager.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:309 |
| AF-101 | Rural | `/rural/landing-pages/:id` | `LandingPageEditor` | `views/LandingPageEditor.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:311 |
| AF-102 | Rural | `/rural/maps` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:275 |
| AF-103 | Rural | `/rural/matchmaking` | `Matchmaking360` | `views/admin/Matchmaking360.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:302 |
| AF-104 | Rural | `/rural/portal-comprador` | `PortalCompradorRural` | `views/rural/PortalCompradorRural.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:308 |
| AF-105 | Rural | `/rural/portal-proprietario` | `PortalProprietarioRural` | `views/rural/PortalProprietarioRural.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:304 |
| AF-106 | Rural | `/rural/quiz` | `QuizCampaigns` | `views/QuizCampaigns.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:310 |
| AF-107 | Rural | `/rural/reports` | `BIRural` | `views/BIRural.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:303 |
| AF-108 | Rural | `/rural/site` | `SiteManager` | `views/SiteManager.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:312 |
| AF-109 | Rural | `/rural/site-setup` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:315 |
| AF-110 | Rural | `/rural/site/pages/:id` | `SitePageEditor` | `views/SitePageEditor.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:313 |
| AF-111 | Rural | `/rural/territorio` | `RuralTerritoryHub` | `views/rural/RuralTerritoryHub.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:267 |
| AF-112 | Rural | `/rural/territorio` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | índice | SEM REFERÊNCIA | PENDENTE | App.tsx:268 |
| AF-113 | Rural | `/rural/territorio/dossie` | `DossieInteligente` | `views/rural/DossieInteligente.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:273 |
| AF-114 | Rural | `/rural/territorio/maps` | `Geointeligencia` | `views/rural/Geointeligencia.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:269 |
| AF-115 | Rural | `/rural/visual-editor` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:319 |
| AF-116 | Rural | `/rural/waitlist` | `WaitlistLeads` | `views/admin/WaitlistLeads.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:314 |
| AF-117 | Rural | `/rural/wootech-ai` | `WooTechAI` | `views/WooTechAI.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:325 |
| AF-118 | Super Admin | `/superadmin` | `SuperAdminLayout` | `views/superadmin/SuperAdminLayout.tsx` | ProtectedRoute | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:449 |
| AF-119 | Super Admin | `/superadmin` | `SuperAdminDashboard` | `views/superadmin/Dashboard.tsx` | Herdado | CRÍTICO | índice | SEM REFERÊNCIA | PENDENTE | App.tsx:457 |
| AF-120 | Super Admin | `/superadmin/audit-log` | `AuditLog` | `views/superadmin/AuditLog.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:465 |
| AF-121 | Super Admin | `/superadmin/billing` | `BillingManager` | `views/superadmin/BillingManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:464 |
| AF-122 | Super Admin | `/superadmin/consulting` | `ConsultingLeads` | `views/superadmin/ConsultingLeads.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:462 |
| AF-123 | Super Admin | `/superadmin/domains` | `DomainManager` | `views/superadmin/DomainManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:461 |
| AF-124 | Super Admin | `/superadmin/marketing` | `MarketingManager` | `views/superadmin/MarketingManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:467 |
| AF-125 | Super Admin | `/superadmin/plans` | `PlanManager` | `views/superadmin/PlanManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:463 |
| AF-126 | Super Admin | `/superadmin/settings` | `GlobalSettings` | `views/superadmin/GlobalSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:469 |
| AF-127 | Super Admin | `/superadmin/support` | `SupportManager` | `views/superadmin/SupportManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:459 |
| AF-128 | Super Admin | `/superadmin/team` | `TeamManager` | `views/superadmin/TeamManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:460 |
| AF-129 | Super Admin | `/superadmin/templates` | `TemplateManager` | `views/superadmin/TemplateManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:466 |
| AF-130 | Super Admin | `/superadmin/tenants` | `TenantManager` | `views/superadmin/TenantManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:458 |
| AF-131 | Mega Admin | `/megaadmin` | `MegaAdminLayout` | `views/megaadmin/MegaAdminLayout.tsx` | ProtectedRoute, MegaAdminGuard | CRÍTICO | função | REFERENCIADA: src/test/superAdminGuard.test.ts | PENDENTE | App.tsx:421 |
| AF-132 | Mega Admin | `/megaadmin` | `MegaAdminDashboard` | `views/megaadmin/Dashboard.tsx` | Herdado | CRÍTICO | índice | REFERENCIADA: src/test/superAdminGuard.test.ts | PENDENTE | App.tsx:431 |
| AF-133 | Mega Admin | `/megaadmin/analytics` | `AnalyticsDashboard` | `views/megaadmin/AnalyticsDashboard.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:434 |
| AF-134 | Mega Admin | `/megaadmin/audit-log` | `MegaAuditLog` | `views/megaadmin/AuditLog.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:438 |
| AF-135 | Mega Admin | `/megaadmin/billing` | `BillingOverview` | `views/megaadmin/BillingOverview.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:436 |
| AF-136 | Mega Admin | `/megaadmin/direct-clients` | `DirectClientsManager` | `views/megaadmin/DirectClientsManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:433 |
| AF-137 | Mega Admin | `/megaadmin/feature-flags` | `FeatureFlags` | `views/megaadmin/FeatureFlags.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:437 |
| AF-138 | Mega Admin | `/megaadmin/fluowai-migration` | `FluowaiMigration` | `views/megaadmin/FluowaiMigration.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:440 |
| AF-139 | Mega Admin | `/megaadmin/importer` | `SmartImporter` | `views/megaadmin/SmartImporter.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:439 |
| AF-140 | Mega Admin | `/megaadmin/monitoring` | `PlatformMonitoring` | `views/megaadmin/PlatformMonitoring.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:435 |
| AF-141 | Mega Admin | `/megaadmin/resellers` | `ResellerManager` | `views/megaadmin/ResellerManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:432 |
| AF-142 | Mega Admin | `/megaadmin/settings` | `MegaGlobalSettings` | `views/megaadmin/GlobalSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:445 |
| AF-143 | Mega Admin | `/megaadmin/storage-intelligence` | `StorageIntelligence` | `views/megaadmin/StorageIntelligence.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:441 |

## Regra de atualização

- Regenerar com `npm run audit:matrix` após mudanças em `App.tsx`.
- A execução deve registrar evidência, ambiente, perfil, tenant, resultado e defeito relacionado.
- Casos críticos só podem mudar para APROVADO depois de validar interface, API, persistência e autorização.

