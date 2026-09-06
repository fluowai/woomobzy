# Matriz mestra de auditoria funcional — IMOBZY

**Gerada em:** 2026-09-06T21:24:28.390Z
**Fonte:** `App.tsx` analisado por AST  
**Status inicial:** PENDENTE até execução com evidência

> Esta matriz é um inventário estrutural. Uma rota referenciada por teste não é automaticamente considerada validada.

## Resumo

| Painel | Rotas inventariadas |
| --- | ---: |
| WooControl | 16 |
| Público/compartilhado | 23 |
| Urbano | 59 |
| Rural | 57 |
| Super Admin | 14 |
| Mega Admin | 15 |
| **Total** | **184** |

## Casos

| ID | Painel | Rota | Componente | Arquivo | Proteção | Risco | Tipo | Cobertura encontrada | Status | Fonte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AF-001 | WooControl | `/woo-control/settings` | `WooSettings` | `views/woocontrol/pages/Settings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:573 |
| AF-002 | WooControl | `/woo-control` | `WooControlLayout` | `views/woocontrol/WooControlLayout.tsx` | ProtectedRoute, WooControlGuard | MÉDIO | função | REFERENCIADA: src/test/wooControlNavigation.test.ts, server/__tests__/wooControlAccess.test.ts | PENDENTE | App.tsx:549 |
| AF-003 | WooControl | `/woo-control` | `WooOverview` | `views/woocontrol/pages/Overview.tsx` | Herdado | MÉDIO | índice | REFERENCIADA: src/test/wooControlNavigation.test.ts, server/__tests__/wooControlAccess.test.ts | PENDENTE | App.tsx:559 |
| AF-004 | WooControl | `/woo-control/academy` | `WooAcademy` | `views/woocontrol/pages/Academy.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:569 |
| AF-005 | WooControl | `/woo-control/audit` | `WooAudit` | `views/woocontrol/pages/Audit.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:572 |
| AF-006 | WooControl | `/woo-control/customers` | `WooNetwork` | `views/woocontrol/pages/Network.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:561 |
| AF-007 | WooControl | `/woo-control/deployments` | `WooDeployments` | `views/woocontrol/pages/Deployments.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:564 |
| AF-008 | WooControl | `/woo-control/licensing` | `WooLicensing` | `views/woocontrol/pages/Licensing.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:563 |
| AF-009 | WooControl | `/woo-control/products` | `WooProducts` | `views/woocontrol/pages/Products.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:562 |
| AF-010 | WooControl | `/woo-control/releases` | `WooReleases` | `views/woocontrol/pages/Releases.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:566 |
| AF-011 | WooControl | `/woo-control/resellers` | `WooNetwork` | `views/woocontrol/pages/Network.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:560 |
| AF-012 | WooControl | `/woo-control/revenue` | `WooRevenue` | `views/woocontrol/pages/Revenue.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:570 |
| AF-013 | WooControl | `/woo-control/security` | `WooSecurity` | `views/woocontrol/pages/Security.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:571 |
| AF-014 | WooControl | `/woo-control/snapshots` | `WooSnapshots` | `views/woocontrol/pages/Snapshots.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:565 |
| AF-015 | WooControl | `/woo-control/stack-generator` | `WooStackGenerator` | `views/woocontrol/pages/StackGenerator.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:567 |
| AF-016 | WooControl | `/woo-control/support` | `WooSupport` | `views/woocontrol/pages/Support.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:568 |
| AF-017 | Público/compartilhado | `/impersonate` | `ImpersonateCallback` | `views/ImpersonateCallback.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:280 |
| AF-018 | Público/compartilhado | `/login` | `Login` | `views/Login.tsx` | Herdado | CRÍTICO | função | REFERENCIADA: tests/e2e/audit/onda0-auth-routing.spec.ts, tests/e2e/audit/onda0-tenant-isolation.spec.ts, tests/e2e/public-surfaces.spec.ts, tests/e2e/tenant-isolation.spec.ts | PENDENTE | App.tsx:283 |
| AF-019 | Público/compartilhado | `/onboarding` | `Onboarding` | `views/Onboarding.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:290 |
| AF-020 | Público/compartilhado | `/register` | `Register` | `views/Register.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:288 |
| AF-021 | Público/compartilhado | `/` | `HomeRoute` | `Externo/inline` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:272 |
| AF-022 | Público/compartilhado | `/:slug/site/*` | `PublicSite` | `views/PublicSite.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:295 |
| AF-023 | Público/compartilhado | `/*` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | REVISAR | PENDENTE | App.tsx:632 |
| AF-024 | Público/compartilhado | `/admin` | `NicheRedirect` | `components/NicheRedirect.tsx` | ProtectedRoute | MÉDIO | função | REFERENCIADA: server/__tests__/adminOrganizationsFallback.test.ts | PENDENTE | App.tsx:300 |
| AF-025 | Público/compartilhado | `/admin/*` | `NicheRedirect` | `components/NicheRedirect.tsx` | ProtectedRoute | MÉDIO | função | REVISAR | PENDENTE | App.tsx:308 |
| AF-026 | Público/compartilhado | `/ajuda/dns` | `DnsHelp` | `views/DnsHelp.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:279 |
| AF-027 | Público/compartilhado | `/assinatura/:token` | `SignaturePortal` | `views/public/SignaturePortal.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:294 |
| AF-028 | Público/compartilhado | `/consultoria` | `SystemSalesPage` | `views/SystemSalesPage.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:274 |
| AF-029 | Público/compartilhado | `/consultoria/qualificacao` | `ConsultingQualificacao` | `views/ConsultingQualificacao.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:275 |
| AF-030 | Público/compartilhado | `/embreve` | `PublicLandingPage` | `views/PublicLandingPage.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:284 |
| AF-031 | Público/compartilhado | `/lp/:slug` | `PublicLandingPage` | `views/PublicLandingPage.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:281 |
| AF-032 | Público/compartilhado | `/portal-locatario` | `PortalLocatario` | `views/urban/PortalLocatario.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:289 |
| AF-033 | Público/compartilhado | `/privacy` | `PrivacyPolicy` | `views/PrivacyPolicy.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:292 |
| AF-034 | Público/compartilhado | `/quiz/:slug` | `PublicQuiz` | `views/PublicQuiz.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:282 |
| AF-035 | Público/compartilhado | `/setup-whitelabel` | `SetupWhitelabel` | `views/SetupWhitelabel.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:291 |
| AF-036 | Público/compartilhado | `/site/:slug/*` | `PublicSite` | `views/PublicSite.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:296 |
| AF-037 | Público/compartilhado | `/sites/:slug/*` | `PublicSite` | `views/PublicSite.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:297 |
| AF-038 | Público/compartilhado | `/terms` | `TermsOfService` | `views/TermsOfService.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:293 |
| AF-039 | Público/compartilhado | `/vendas` | `SystemSalesPage` | `views/SystemSalesPage.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:273 |
| AF-040 | Urbano | `/urban/cobranca` | `Cobranca` | `views/urban/Cobranca.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:470 |
| AF-041 | Urbano | `/urban/contracts` | `LegalContracts` | `views/LegalContracts.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:536 |
| AF-042 | Urbano | `/urban/financeiro` | `FinanceiroUrbano` | `views/urban/FinanceiroUrbano.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:480 |
| AF-043 | Urbano | `/urban/integrations` | `SystemSettings` | `views/SystemSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:543 |
| AF-044 | Urbano | `/urban/locacao` | `RentalsManagement` | `views/RentalsManagement.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:462 |
| AF-045 | Urbano | `/urban/locacao/bordero` | `RentalsBordero` | `views/RentalsBordero.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:467 |
| AF-046 | Urbano | `/urban/locacao/contrato` | `RentalsContractEditor` | `views/RentalsContractEditor.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:463 |
| AF-047 | Urbano | `/urban/settings` | `SystemSettings` | `views/SystemSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:545 |
| AF-048 | Urbano | `/urban/clients` | `ClientsManager` | `views/CRM/ClientsManager.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:474 |
| AF-049 | Urbano | `/urban/compliance` | `ComplianceUrbano` | `views/urban/ComplianceUrbano.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:469 |
| AF-050 | Urbano | `/urban/crm` | `CRMLeads` | `views/CRM/CRMLeads.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:473 |
| AF-051 | Urbano | `/urban/documentos` | `GestaoDocumentos` | `views/urban/GestaoDocumentos.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:483 |
| AF-052 | Urbano | `/urban/email` | `EmailCenter` | `views/EmailCenter.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:541 |
| AF-053 | Urbano | `/urban/empreendimentos` | `Empreendimentos` | `views/urban/Empreendimentos.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:457 |
| AF-054 | Urbano | `/urban/loteamentos` | `Empreendimentos` | `views/urban/Empreendimentos.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:458 |
| AF-055 | Urbano | `/urban/loteamentos/:id` | `LoteamentoDetails` | `views/urban/LoteamentoDetails.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:459 |
| AF-056 | Urbano | `/urban/properties` | `PropertyManagement` | `views/PropertyManagement` | Herdado | ALTO | função | REFERENCIADA: tests/e2e/audit/onda1-repasse-corretores.spec.ts | PENDENTE | App.tsx:454 |
| AF-057 | Urbano | `/urban/properties/:id` | `PropertyEditor` | `views/PropertyEditor.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:456 |
| AF-058 | Urbano | `/urban/properties/new` | `PropertyEditor` | `views/PropertyEditor.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:455 |
| AF-059 | Urbano | `/urban/whatsapp` | `WhatsAppDashboard` | `views/WhatsApp/WhatsAppDashboard` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:537 |
| AF-060 | Urbano | `/urban/whatsapp/campaigns` | `CampaignManager` | `views/WhatsApp/CampaignManager.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:538 |
| AF-061 | Urbano | `/urban/whatsapp/campaigns/:id` | `CampaignEditor` | `views/WhatsApp/CampaignEditor.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:539 |
| AF-062 | Urbano | `/urban` | `UrbanLayout` | `components/UrbanLayout.tsx` | ProtectedRoute, PanelGuard, SubscriptionGuard | MÉDIO | função | REFERENCIADA: tests/e2e/audit/onda0-auth-routing.spec.ts, tests/e2e/audit/onda0-tenant-isolation.spec.ts, tests/e2e/audit/onda1-condominios.spec.ts, tests/e2e/audit/onda1-loteamentos.spec.ts, tests/e2e/audit/onda1-repasse-corretores.spec.ts, src/test/superAdminGuard.test.ts, src/test/urbanMenuRoutes.test.ts | PENDENTE | App.tsx:438 |
| AF-063 | Urbano | `/urban` | `UrbanDashboard` | `views/UrbanDashboard.tsx` | Herdado | MÉDIO | índice | REFERENCIADA: tests/e2e/audit/onda0-auth-routing.spec.ts, tests/e2e/audit/onda0-tenant-isolation.spec.ts, tests/e2e/audit/onda1-condominios.spec.ts, tests/e2e/audit/onda1-loteamentos.spec.ts, tests/e2e/audit/onda1-repasse-corretores.spec.ts, src/test/superAdminGuard.test.ts, src/test/urbanMenuRoutes.test.ts | PENDENTE | App.tsx:452 |
| AF-064 | Urbano | `/urban/360` | `Dashboard360` | `views/admin/Dashboard360.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:453 |
| AF-065 | Urbano | `/urban/agenda` | `Agenda` | `views/CRM/Agenda` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:476 |
| AF-066 | Urbano | `/urban/ai` | `AICentral` | `views/AICentral.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:508 |
| AF-067 | Urbano | `/urban/ai-assistant` | `AIAssistant` | `views/AIAssistant.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:507 |
| AF-068 | Urbano | `/urban/ai/history` | `AIHistory` | `views/AIHistory.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:534 |
| AF-069 | Urbano | `/urban/ai/knowledge` | `AIKnowledge` | `views/AIKnowledge.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:533 |
| AF-070 | Urbano | `/urban/ai/logs` | `AILogs` | `views/AILogs.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:535 |
| AF-071 | Urbano | `/urban/ai/operations/:id` | `AIOperationDashboard` | `views/AIOperationDashboard.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:513 |
| AF-072 | Urbano | `/urban/ai/operations/:id/agents/:agentId` | `AIAgentDetail` | `views/AIAgentDetail.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:525 |
| AF-073 | Urbano | `/urban/ai/operations/:id/agents/:agentId/test` | `SandboxChat` | `views/SandboxChat.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:529 |
| AF-074 | Urbano | `/urban/ai/operations/:id/agents/test` | `SandboxChat` | `views/SandboxChat.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:521 |
| AF-075 | Urbano | `/urban/ai/operations/:id/architecture` | `ArchitectureCanvas` | `views/ArchitectureCanvas.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:517 |
| AF-076 | Urbano | `/urban/ai/operations/new` | `CreateOperationWizard` | `views/CreateOperationWizard.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:509 |
| AF-077 | Urbano | `/urban/captacao` | `CaptacaoFunil` | `views/urban/CaptacaoFunil.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:472 |
| AF-078 | Urbano | `/urban/chaves` | `ControleChaves` | `views/urban/ControleChaves.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:479 |
| AF-079 | Urbano | `/urban/clube` | `ClubeImobzy` | `views/urban/ClubeImobzy.tsx` | Herdado | MÉDIO | função | REFERENCIADA: src/test/urbanMenuRoutes.test.ts | PENDENTE | App.tsx:482 |
| AF-080 | Urbano | `/urban/condominios` | `AdmCondominios` | `views/urban/AdmCondominios.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:478 |
| AF-081 | Urbano | `/urban/connections` | `ConexoesUrbano` | `views/urban/ConexoesUrbano.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:542 |
| AF-082 | Urbano | `/urban/exportador` | `ExportadorPortais` | `views/urban/ExportadorPortais.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:471 |
| AF-083 | Urbano | `/urban/fintech` | `FinancialHub` | `views/urban/FinancialHub.tsx` | Herdado | MÉDIO | função | REFERENCIADA: src/test/urbanMenuRoutes.test.ts | PENDENTE | App.tsx:481 |
| AF-084 | Urbano | `/urban/instagram` | `InstagramDashboard` | `views/Instagram/InstagramDashboard.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:540 |
| AF-085 | Urbano | `/urban/kanban` | `KanbanBoard` | `views/CRM/KanbanBoard` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:475 |
| AF-086 | Urbano | `/urban/landing-pages` | `LandingPageManager` | `views/LandingPageManager.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:493 |
| AF-087 | Urbano | `/urban/landing-pages/:id` | `LandingPageEditor` | `views/LandingPageEditor.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:495 |
| AF-088 | Urbano | `/urban/portal-comprador` | `PortalCompradorUrbano` | `views/urban/PortalCompradorUrbano.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:488 |
| AF-089 | Urbano | `/urban/portal-locatario` | `PortalLocatario` | `views/urban/PortalLocatario.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:492 |
| AF-090 | Urbano | `/urban/portal-proprietario` | `PortalProprietarioUrbano` | `views/urban/PortalProprietarioUrbano.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:484 |
| AF-091 | Urbano | `/urban/quiz` | `QuizCampaigns` | `views/QuizCampaigns.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:494 |
| AF-092 | Urbano | `/urban/reports` | `BIUrbano` | `views/BIUrbano.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:477 |
| AF-093 | Urbano | `/urban/site` | `SiteManager` | `views/SiteManager.tsx` | Herdado | MÉDIO | função | REFERENCIADA: src/test/superAdminGuard.test.ts | PENDENTE | App.tsx:496 |
| AF-094 | Urbano | `/urban/site-setup` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:499 |
| AF-095 | Urbano | `/urban/site/pages/:id` | `SitePageEditor` | `views/SitePageEditor.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:497 |
| AF-096 | Urbano | `/urban/users` | `UserManagement` | `views/admin/UserManagement.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:544 |
| AF-097 | Urbano | `/urban/visual-editor` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:503 |
| AF-098 | Urbano | `/urban/waitlist` | `WaitlistLeads` | `views/admin/WaitlistLeads.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:498 |
| AF-099 | Rural | `/rural/contracts` | `LegalContracts` | `views/LegalContracts.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:424 |
| AF-100 | Rural | `/rural/financeiro-advanced` | `Locacao` | `views/urban/Locacao.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:426 |
| AF-101 | Rural | `/rural/financial` | `FinanceiroRural` | `views/rural/FinanceiroRural.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:425 |
| AF-102 | Rural | `/rural/integrations` | `SystemSettings` | `views/SystemSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:433 |
| AF-103 | Rural | `/rural/settings` | `SystemSettings` | `views/SystemSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:434 |
| AF-104 | Rural | `/rural/crm` | `CRMLeads` | `views/CRM/CRMLeads.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:371 |
| AF-105 | Rural | `/rural/due-diligence` | `Navigate` | `Externo/inline` | Herdado | ALTO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:360 |
| AF-106 | Rural | `/rural/email` | `EmailCenter` | `views/EmailCenter.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:431 |
| AF-107 | Rural | `/rural/localizar-car` | `Navigate` | `Externo/inline` | Herdado | ALTO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:350 |
| AF-108 | Rural | `/rural/properties` | `PropertyManagement` | `views/PropertyManagement` | Herdado | ALTO | função | REFERENCIADA: tests/e2e/audit/onda2-fazendas.spec.ts | PENDENTE | App.tsx:335 |
| AF-109 | Rural | `/rural/properties/:id` | `PropertyEditor` | `views/PropertyEditor.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:337 |
| AF-110 | Rural | `/rural/properties/new` | `PropertyEditor` | `views/PropertyEditor.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:336 |
| AF-111 | Rural | `/rural/territorio/due-diligence` | `DueDiligence` | `views/rural/DueDiligence.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:343 |
| AF-112 | Rural | `/rural/territorio/localizar-car` | `CARLocationSearch` | `views/rural/CARLocationSearch.tsx` | Herdado | ALTO | função | REFERENCIADA: tests/e2e/audit/onda2-car.spec.ts | PENDENTE | App.tsx:341 |
| AF-113 | Rural | `/rural/territorio/valuation` | `ValuationRural` | `views/rural/ValuationRural.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:342 |
| AF-114 | Rural | `/rural/valuation` | `Navigate` | `Externo/inline` | Herdado | ALTO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:356 |
| AF-115 | Rural | `/rural/whatsapp` | `WhatsAppDashboard` | `views/WhatsApp/WhatsAppDashboard` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:427 |
| AF-116 | Rural | `/rural/whatsapp/campaigns` | `CampaignManager` | `views/WhatsApp/CampaignManager.tsx` | Herdado | ALTO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:428 |
| AF-117 | Rural | `/rural/whatsapp/campaigns/:id` | `CampaignEditor` | `views/WhatsApp/CampaignEditor.tsx` | Herdado | ALTO | função | REVISAR | PENDENTE | App.tsx:429 |
| AF-118 | Rural | `/rural` | `RuralLayout` | `components/RuralLayout.tsx` | ProtectedRoute, PanelGuard, SubscriptionGuard | MÉDIO | função | REFERENCIADA: tests/e2e/audit/onda0-auth-routing.spec.ts, tests/e2e/audit/onda2-car.spec.ts, tests/e2e/audit/onda2-fazendas.spec.ts, src/test/wooControlNavigation.test.ts | PENDENTE | App.tsx:318 |
| AF-119 | Rural | `/rural` | `RuralDashboard` | `views/RuralDashboard.tsx` | Herdado | MÉDIO | índice | REFERENCIADA: tests/e2e/audit/onda0-auth-routing.spec.ts, tests/e2e/audit/onda2-car.spec.ts, tests/e2e/audit/onda2-fazendas.spec.ts, src/test/wooControlNavigation.test.ts | PENDENTE | App.tsx:332 |
| AF-120 | Rural | `/rural/360` | `Dashboard360` | `views/admin/Dashboard360.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:333 |
| AF-121 | Rural | `/rural/agenda` | `Agenda` | `views/CRM/Agenda` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:373 |
| AF-122 | Rural | `/rural/ai` | `AICentral` | `views/AICentral.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:396 |
| AF-123 | Rural | `/rural/ai-assistant` | `AIAssistant` | `views/AIAssistant.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:395 |
| AF-124 | Rural | `/rural/ai/history` | `AIHistory` | `views/AIHistory.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:422 |
| AF-125 | Rural | `/rural/ai/knowledge` | `AIKnowledge` | `views/AIKnowledge.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:421 |
| AF-126 | Rural | `/rural/ai/logs` | `AILogs` | `views/AILogs.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:423 |
| AF-127 | Rural | `/rural/ai/operations/:id` | `AIOperationDashboard` | `views/AIOperationDashboard.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:401 |
| AF-128 | Rural | `/rural/ai/operations/:id/agents/:agentId` | `AIAgentDetail` | `views/AIAgentDetail.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:413 |
| AF-129 | Rural | `/rural/ai/operations/:id/agents/:agentId/test` | `SandboxChat` | `views/SandboxChat.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:417 |
| AF-130 | Rural | `/rural/ai/operations/:id/agents/test` | `SandboxChat` | `views/SandboxChat.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:409 |
| AF-131 | Rural | `/rural/ai/operations/:id/architecture` | `ArchitectureCanvas` | `views/ArchitectureCanvas.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:405 |
| AF-132 | Rural | `/rural/ai/operations/new` | `CreateOperationWizard` | `views/CreateOperationWizard.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:397 |
| AF-133 | Rural | `/rural/cadastro-tecnico` | `CadastroTecnico` | `views/rural/CadastroTecnico.tsx` | Herdado | MÉDIO | função | REFERENCIADA: tests/e2e/audit/onda2-car.spec.ts | PENDENTE | App.tsx:334 |
| AF-134 | Rural | `/rural/connections` | `ConexoesRural` | `views/rural/ConexoesRural.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:432 |
| AF-135 | Rural | `/rural/dataroom` | `DataRoom` | `views/DataRoom.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:370 |
| AF-136 | Rural | `/rural/dossie` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:366 |
| AF-137 | Rural | `/rural/instagram` | `InstagramDashboard` | `views/Instagram/InstagramDashboard.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:430 |
| AF-138 | Rural | `/rural/kanban` | `KanbanBoard` | `views/CRM/KanbanBoard` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:372 |
| AF-139 | Rural | `/rural/landing-pages` | `LandingPageManager` | `views/LandingPageManager.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:381 |
| AF-140 | Rural | `/rural/landing-pages/:id` | `LandingPageEditor` | `views/LandingPageEditor.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:383 |
| AF-141 | Rural | `/rural/maps` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:346 |
| AF-142 | Rural | `/rural/matchmaking` | `Matchmaking360` | `views/admin/Matchmaking360.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:374 |
| AF-143 | Rural | `/rural/portal-comprador` | `PortalCompradorRural` | `views/rural/PortalCompradorRural.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:380 |
| AF-144 | Rural | `/rural/portal-proprietario` | `PortalProprietarioRural` | `views/rural/PortalProprietarioRural.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:376 |
| AF-145 | Rural | `/rural/quiz` | `QuizCampaigns` | `views/QuizCampaigns.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:382 |
| AF-146 | Rural | `/rural/reports` | `BIRural` | `views/BIRural.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:375 |
| AF-147 | Rural | `/rural/site` | `SiteManager` | `views/SiteManager.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:384 |
| AF-148 | Rural | `/rural/site-setup` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:387 |
| AF-149 | Rural | `/rural/site/pages/:id` | `SitePageEditor` | `views/SitePageEditor.tsx` | Herdado | MÉDIO | função | REVISAR | PENDENTE | App.tsx:385 |
| AF-150 | Rural | `/rural/territorio` | `RuralTerritoryHub` | `views/rural/RuralTerritoryHub.tsx` | Herdado | MÉDIO | função | REFERENCIADA: tests/e2e/audit/onda2-car.spec.ts | PENDENTE | App.tsx:338 |
| AF-151 | Rural | `/rural/territorio` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | índice | REFERENCIADA: tests/e2e/audit/onda2-car.spec.ts | PENDENTE | App.tsx:339 |
| AF-152 | Rural | `/rural/territorio/dossie` | `DossieInteligente` | `views/rural/DossieInteligente.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:344 |
| AF-153 | Rural | `/rural/territorio/maps` | `Geointeligencia` | `views/rural/Geointeligencia.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:340 |
| AF-154 | Rural | `/rural/visual-editor` | `Navigate` | `Externo/inline` | Herdado | MÉDIO | redirecionamento | SEM REFERÊNCIA | PENDENTE | App.tsx:391 |
| AF-155 | Rural | `/rural/waitlist` | `WaitlistLeads` | `views/admin/WaitlistLeads.tsx` | Herdado | MÉDIO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:386 |
| AF-156 | Super Admin | `/superadmin` | `SuperAdminLayout` | `views/superadmin/SuperAdminLayout.tsx` | ProtectedRoute | CRÍTICO | função | REFERENCIADA: tests/e2e/audit/onda3-super-admin.spec.ts, src/test/wooControlNavigation.test.ts | PENDENTE | App.tsx:607 |
| AF-157 | Super Admin | `/superadmin` | `SuperAdminDashboard` | `views/superadmin/Dashboard.tsx` | Herdado | CRÍTICO | índice | REFERENCIADA: tests/e2e/audit/onda3-super-admin.spec.ts, src/test/wooControlNavigation.test.ts | PENDENTE | App.tsx:615 |
| AF-158 | Super Admin | `/superadmin/audit-log` | `AuditLog` | `views/superadmin/AuditLog.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:623 |
| AF-159 | Super Admin | `/superadmin/billing` | `BillingManager` | `views/superadmin/BillingManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:622 |
| AF-160 | Super Admin | `/superadmin/connection-credits` | `ConnectionCredits` | `views/superadmin/ConnectionCredits.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:626 |
| AF-161 | Super Admin | `/superadmin/consulting` | `ConsultingLeads` | `views/superadmin/ConsultingLeads.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:620 |
| AF-162 | Super Admin | `/superadmin/domains` | `DomainManager` | `views/superadmin/DomainManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:619 |
| AF-163 | Super Admin | `/superadmin/marketing` | `MarketingManager` | `views/superadmin/MarketingManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:625 |
| AF-164 | Super Admin | `/superadmin/plans` | `PlanManager` | `views/superadmin/PlanManager.tsx` | Herdado | CRÍTICO | função | REFERENCIADA: tests/e2e/audit/onda3-super-admin.spec.ts | PENDENTE | App.tsx:621 |
| AF-165 | Super Admin | `/superadmin/settings` | `GlobalSettings` | `views/superadmin/GlobalSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:628 |
| AF-166 | Super Admin | `/superadmin/support` | `SupportManager` | `views/superadmin/SupportManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:617 |
| AF-167 | Super Admin | `/superadmin/team` | `TeamManager` | `views/superadmin/TeamManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:618 |
| AF-168 | Super Admin | `/superadmin/templates` | `TemplateManager` | `views/superadmin/TemplateManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:624 |
| AF-169 | Super Admin | `/superadmin/tenants` | `TenantManager` | `views/superadmin/TenantManager.tsx` | Herdado | CRÍTICO | função | REFERENCIADA: tests/e2e/audit/onda3-super-admin.spec.ts | PENDENTE | App.tsx:616 |
| AF-170 | Mega Admin | `/megaadmin` | `MegaAdminLayout` | `views/megaadmin/MegaAdminLayout.tsx` | ProtectedRoute, MegaAdminGuard | CRÍTICO | função | REFERENCIADA: tests/e2e/audit/onda0-auth-routing.spec.ts, tests/e2e/audit/onda3-mega-admin.spec.ts, src/test/superAdminGuard.test.ts | PENDENTE | App.tsx:577 |
| AF-171 | Mega Admin | `/megaadmin` | `MegaAdminDashboard` | `views/megaadmin/Dashboard.tsx` | Herdado | CRÍTICO | índice | REFERENCIADA: tests/e2e/audit/onda0-auth-routing.spec.ts, tests/e2e/audit/onda3-mega-admin.spec.ts, src/test/superAdminGuard.test.ts | PENDENTE | App.tsx:587 |
| AF-172 | Mega Admin | `/megaadmin/ai-credits` | `AiCreditsHub` | `views/megaadmin/AiCreditsHub.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:592 |
| AF-173 | Mega Admin | `/megaadmin/analytics` | `AnalyticsDashboard` | `views/megaadmin/AnalyticsDashboard.tsx` | Herdado | CRÍTICO | função | REFERENCIADA: tests/e2e/audit/onda3-mega-admin.spec.ts | PENDENTE | App.tsx:590 |
| AF-174 | Mega Admin | `/megaadmin/audit-log` | `MegaAuditLog` | `views/megaadmin/AuditLog.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:596 |
| AF-175 | Mega Admin | `/megaadmin/billing` | `BillingOverview` | `views/megaadmin/BillingOverview.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:593 |
| AF-176 | Mega Admin | `/megaadmin/connections` | `ConnectionManager` | `views/megaadmin/ConnectionManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:594 |
| AF-177 | Mega Admin | `/megaadmin/direct-clients` | `DirectClientsManager` | `views/megaadmin/DirectClientsManager.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:589 |
| AF-178 | Mega Admin | `/megaadmin/feature-flags` | `FeatureFlags` | `views/megaadmin/FeatureFlags.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:595 |
| AF-179 | Mega Admin | `/megaadmin/fluowai-migration` | `FluowaiMigration` | `views/megaadmin/FluowaiMigration.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:598 |
| AF-180 | Mega Admin | `/megaadmin/importer` | `SmartImporter` | `views/megaadmin/SmartImporter.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:597 |
| AF-181 | Mega Admin | `/megaadmin/monitoring` | `PlatformMonitoring` | `views/megaadmin/PlatformMonitoring.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:591 |
| AF-182 | Mega Admin | `/megaadmin/resellers` | `ResellerManager` | `views/megaadmin/ResellerManager.tsx` | Herdado | CRÍTICO | função | REFERENCIADA: tests/e2e/audit/onda3-mega-admin.spec.ts | PENDENTE | App.tsx:588 |
| AF-183 | Mega Admin | `/megaadmin/settings` | `MegaGlobalSettings` | `views/megaadmin/GlobalSettings.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:603 |
| AF-184 | Mega Admin | `/megaadmin/storage-intelligence` | `StorageIntelligence` | `views/megaadmin/StorageIntelligence.tsx` | Herdado | CRÍTICO | função | SEM REFERÊNCIA | PENDENTE | App.tsx:599 |

## Regra de atualização

- Regenerar com `npm run audit:matrix` após mudanças em `App.tsx`.
- A execução deve registrar evidência, ambiente, perfil, tenant, resultado e defeito relacionado.
- Casos críticos só podem mudar para APROVADO depois de validar interface, API, persistência e autorização.

