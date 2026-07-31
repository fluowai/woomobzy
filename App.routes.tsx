import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import RuralLayout from './components/RuralLayout';
import UrbanLayout from './components/UrbanLayout';
import ProtectedRoute from './components/ProtectedRoute';
import NicheRedirect from './components/NicheRedirect';
import MegaAdminGuard from './components/MegaAdminGuard';
import SubscriptionGuard from './components/SubscriptionGuard';
import PanelGuard from './components/PanelGuard';
import FullScreenSpinner from './components/FullScreenSpinner';

const LandingPageManager = lazy(() => import('./views/LandingPageManager'));

const SystemSalesPage = lazy(() => import('./views/SystemSalesPage'));
const Login = lazy(() => import('./views/Login'));
const Onboarding = lazy(() => import('./views/Onboarding'));
const SetupWhitelabel = lazy(() => import('./views/SetupWhitelabel'));
const Register = lazy(() => import('./views/Register'));
const DnsHelp = lazy(() => import('./views/DnsHelp'));
const ImpersonateCallback = lazy(() => import('./views/ImpersonateCallback'));
const PublicLandingPage = lazy(() => import('./views/PublicLandingPage'));
const RuralDashboard = lazy(() => import('./views/RuralDashboard'));
const UrbanDashboard = lazy(() => import('./views/UrbanDashboard'));
const PropertyManagement = lazy(() => import('./views/PropertyManagement'));
const PropertyEditor = lazy(() => import('./views/PropertyEditor'));
const LandingPageEditor = lazy(() => import('./views/LandingPageEditor'));
const AIAssistant = lazy(() => import('./views/AIAssistant'));
const AIAgents = lazy(() => import('./views/AIAgents'));
const WooTechAI = lazy(() => import('./views/WooTechAI'));
const ConsultingQualificacao = lazy(
  () => import('./views/ConsultingQualificacao')
);
const SystemSettings = lazy(() => import('./views/SystemSettings'));
const DataRoom = lazy(() => import('./views/DataRoom'));
const LegalContracts = lazy(() => import('./views/LegalContracts'));
const BIRural = lazy(() => import('./views/BIRural'));
const BIUrbano = lazy(() => import('./views/BIUrbano'));
const CRMLeads = lazy(() => import('./views/CRM/CRMLeads'));
const ClientsManager = lazy(() => import('./views/CRM/ClientsManager'));
const KanbanBoard = lazy(() => import('./views/CRM/KanbanBoard'));
const Agenda = lazy(() => import('./views/CRM/Agenda'));
const WaitlistLeads = lazy(() => import('./views/admin/WaitlistLeads'));
const Dashboard360 = lazy(() => import('./views/admin/Dashboard360'));
const QuizCampaigns = lazy(() => import('./views/QuizCampaigns'));
const PublicQuiz = lazy(() => import('./views/PublicQuiz'));
const CadastroTecnico = lazy(() => import('./views/rural/CadastroTecnico'));
const RuralTerritoryHub = lazy(() => import('./views/rural/RuralTerritoryHub'));
const Geointeligencia = lazy(() => import('./views/rural/Geointeligencia'));
const DossieInteligente = lazy(() => import('./views/rural/DossieInteligente'));
const DueDiligence = lazy(() => import('./views/rural/DueDiligence'));
const ValuationRural = lazy(() => import('./views/rural/ValuationRural'));
const PortalProprietarioRural = lazy(
  () => import('./views/rural/PortalProprietarioRural')
);
const PortalCompradorRural = lazy(
  () => import('./views/rural/PortalCompradorRural')
);
const FinanceiroRural = lazy(() => import('./views/rural/FinanceiroRural'));
const ConexoesRural = lazy(() => import('./views/rural/ConexoesRural'));
const CARLocationSearch = lazy(() => import('./views/rural/CARLocationSearch'));
const Matchmaking360 = lazy(() => import('./views/admin/Matchmaking360'));
const Empreendimentos = lazy(() => import('./views/urban/Empreendimentos'));
const LoteamentoDetails = lazy(() => import('./views/urban/LoteamentoDetails'));
const Locacao = lazy(() => import('./views/urban/Locacao'));
const RentalsManagement = lazy(() => import('./views/RentalsManagement'));
const RentalsContractEditor = lazy(
  () => import('./views/RentalsContractEditor')
);
const RentalsBordero = lazy(() => import('./views/RentalsBordero'));
const ComplianceUrbano = lazy(() => import('./views/urban/ComplianceUrbano'));
const Cobranca = lazy(() => import('./views/urban/Cobranca'));
const Simulator360 = lazy(() => import('./views/urban/Simulator360'));
const PortalLocatario = lazy(() => import('./views/urban/PortalLocatario'));
const ExportadorPortais = lazy(() => import('./views/urban/ExportadorPortais'));
const PortalProprietarioUrbano = lazy(
  () => import('./views/urban/PortalProprietarioUrbano')
);
const PortalCompradorUrbano = lazy(
  () => import('./views/urban/PortalCompradorUrbano')
);
const AdmCondominios = lazy(() => import('./views/urban/AdmCondominios'));
const CondominiumEditor = lazy(() => import('./views/urban/CondominiumEditor'));
const ControleChaves = lazy(() => import('./views/urban/ControleChaves'));
const FinanceiroUrbano = lazy(() => import('./views/urban/FinanceiroUrbano'));
const FinancialHub = lazy(() => import('./views/urban/FinancialHub'));
const ClubeImobzy = lazy(() => import('./views/urban/ClubeImobzy'));
const GestaoDocumentos = lazy(() => import('./views/urban/GestaoDocumentos'));
const ConexoesUrbano = lazy(() => import('./views/urban/ConexoesUrbano'));
const SuperAdminLayout = lazy(
  () => import('./views/superadmin/SuperAdminLayout')
);
const SuperAdminDashboard = lazy(() => import('./views/superadmin/Dashboard'));
const ConsultingLeads = lazy(
  () => import('./views/superadmin/ConsultingLeads')
);
const TenantManager = lazy(() => import('./views/superadmin/TenantManager'));
const GlobalSettings = lazy(() => import('./views/superadmin/GlobalSettings'));
const DomainManager = lazy(() => import('./views/superadmin/DomainManager'));
const PlanManager = lazy(() => import('./views/superadmin/PlanManager'));
const BillingManager = lazy(() => import('./views/superadmin/BillingManager'));
const FeatureFlags = lazy(() => import('./views/megaadmin/FeatureFlags'));
const AuditLog = lazy(() => import('./views/superadmin/AuditLog'));
const TemplateManager = lazy(
  () => import('./views/superadmin/TemplateManager')
);
const PlatformMonitoring = lazy(
  () => import('./views/megaadmin/PlatformMonitoring')
);
const AnalyticsDashboard = lazy(
  () => import('./views/megaadmin/AnalyticsDashboard')
);
const SupportManager = lazy(() => import('./views/superadmin/SupportManager'));
const TeamManager = lazy(() => import('./views/superadmin/TeamManager'));
const SmartImporter = lazy(() => import('./views/megaadmin/SmartImporter'));
const FluowaiMigration = lazy(
  () => import('./views/megaadmin/FluowaiMigration')
);
const StorageIntelligence = lazy(
  () => import('./views/megaadmin/StorageIntelligence')
);
const MarketingManager = lazy(
  () => import('./views/superadmin/MarketingManager')
);
const MegaGlobalSettings = lazy(
  () => import('./views/megaadmin/GlobalSettings')
);
const BillingOverview = lazy(() => import('./views/megaadmin/BillingOverview'));
const MegaAuditLog = lazy(() => import('./views/megaadmin/AuditLog'));
const MegaAdminLayout = lazy(() => import('./views/megaadmin/MegaAdminLayout'));
const MegaAdminDashboard = lazy(() => import('./views/megaadmin/Dashboard'));
const ResellerManager = lazy(() => import('./views/megaadmin/ResellerManager'));
const DirectClientsManager = lazy(
  () => import('./views/megaadmin/DirectClientsManager')
);
const SiteManager = lazy(() => import('./views/SiteManager'));
const SitePageEditor = lazy(() => import('./views/SitePageEditor'));
const PublicSite = lazy(() => import('./views/PublicSite'));
const WhatsAppDashboard = lazy(
  () => import('./views/WhatsApp/WhatsAppDashboard')
);
const CampaignManager = lazy(() => import('./views/WhatsApp/CampaignManager'));
const CampaignEditor = lazy(() => import('./views/WhatsApp/CampaignEditor'));
const EmailCenter = lazy(() => import('./views/EmailCenter'));
const InstagramDashboard = lazy(
  () => import('./views/Instagram/InstagramDashboard')
);

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Routes>
        <Route path="/" element={<SystemSalesPage />} />
        <Route path="/vendas" element={<SystemSalesPage />} />
        <Route path="/consultoria" element={<SystemSalesPage />} />
        <Route
          path="/consultoria/qualificacao"
          element={<ConsultingQualificacao />}
        />
        <Route path="/ajuda/dns" element={<DnsHelp />} />
        <Route path="/impersonate" element={<ImpersonateCallback />} />
        <Route path="/lp/:slug" element={<PublicLandingPage />} />
        <Route path="/quiz/:slug" element={<PublicQuiz />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/embreve"
          element={<PublicLandingPage forceComingSoon={true} />}
        />
        <Route path="/register" element={<Register />} />
        <Route path="/portal-locatario" element={<PortalLocatario />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/setup-whitelabel" element={<SetupWhitelabel />} />
        <Route path="/:slug/site/*" element={<PublicSite />} />
        <Route path="/site/:slug/*" element={<PublicSite />} />
        <Route path="/sites/:slug/*" element={<PublicSite />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <NicheRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <NicheRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rural"
          element={
            <ProtectedRoute>
              <PanelGuard panel="rural">
                <SubscriptionGuard>
                  <RuralLayout />
                </SubscriptionGuard>
              </PanelGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<RuralDashboard />} />
          <Route path="360" element={<Dashboard360 />} />
          <Route path="cadastro-tecnico" element={<CadastroTecnico />} />
          <Route path="properties" element={<PropertyManagement />} />
          <Route path="properties/new" element={<PropertyEditor />} />
          <Route path="properties/:id" element={<PropertyEditor />} />
          <Route path="territorio" element={<RuralTerritoryHub />}>
            <Route index element={<Navigate to="maps" replace />} />
            <Route path="maps" element={<Geointeligencia />} />
            <Route path="localizar-car" element={<CARLocationSearch />} />
            <Route path="valuation" element={<ValuationRural />} />
            <Route path="due-diligence" element={<DueDiligence />} />
            <Route path="dossie" element={<DossieInteligente />} />
          </Route>
          <Route
            path="maps"
            element={<Navigate to="/rural/territorio/maps" replace />}
          />
          <Route
            path="localizar-car"
            element={<Navigate to="/rural/territorio/localizar-car" replace />}
          />
          <Route
            path="valuation"
            element={<Navigate to="/rural/territorio/valuation" replace />}
          />
          <Route
            path="due-diligence"
            element={<Navigate to="/rural/territorio/due-diligence" replace />}
          />
          <Route
            path="dossie"
            element={<Navigate to="/rural/territorio/dossie" replace />}
          />
          <Route path="dataroom" element={<DataRoom />} />
          <Route path="crm" element={<CRMLeads />} />
          <Route path="kanban" element={<KanbanBoard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="matchmaking" element={<Matchmaking360 />} />
          <Route path="reports" element={<BIRural />} />
          <Route
            path="portal-proprietario"
            element={<PortalProprietarioRural />}
          />
          <Route path="portal-comprador" element={<PortalCompradorRural />} />
          <Route path="landing-pages" element={<LandingPageManager />} />
          <Route path="quiz" element={<QuizCampaigns />} />
          <Route path="landing-pages/:id" element={<LandingPageEditor />} />
          <Route path="site" element={<SiteManager />} />
          <Route path="site/pages/:id" element={<SitePageEditor />} />
          <Route path="waitlist" element={<WaitlistLeads />} />
          <Route
            path="site-setup"
            element={<Navigate to="/rural/site" replace />}
          />
          <Route
            path="visual-editor"
            element={<Navigate to="/rural/site" replace />}
          />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="ai-agents" element={<AIAgents />} />
          <Route path="wootech-ai" element={<WooTechAI />} />
          <Route path="contracts" element={<LegalContracts />} />
          <Route path="financial" element={<FinanceiroRural />} />
          <Route path="financeiro-advanced" element={<Locacao />} />
          <Route path="whatsapp" element={<WhatsAppDashboard />} />
          <Route path="whatsapp/campaigns" element={<CampaignManager />} />
          <Route path="whatsapp/campaigns/:id" element={<CampaignEditor />} />
          <Route path="instagram" element={<InstagramDashboard />} />
          <Route path="email" element={<EmailCenter />} />
          <Route path="connections" element={<ConexoesRural />} />
          <Route path="integrations" element={<SystemSettings />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>

        <Route
          path="/urban"
          element={
            <ProtectedRoute>
              <PanelGuard panel="urban">
                <SubscriptionGuard>
                  <UrbanLayout />
                </SubscriptionGuard>
              </PanelGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<UrbanDashboard />} />
          <Route path="360" element={<Dashboard360 />} />
          <Route path="properties" element={<PropertyManagement />} />
          <Route path="properties/new" element={<PropertyEditor />} />
          <Route path="properties/:id" element={<PropertyEditor />} />
          <Route path="empreendimentos" element={<Empreendimentos />} />
          <Route path="loteamentos" element={<Empreendimentos />} />
          <Route path="loteamentos/:id" element={<LoteamentoDetails />} />
          <Route path="locacao" element={<RentalsManagement />} />
          <Route path="locacao/contrato" element={<RentalsContractEditor />} />
          <Route path="locacao/bordero" element={<RentalsBordero />} />
          <Route path="compliance" element={<ComplianceUrbano />} />
          <Route path="cobranca" element={<Cobranca />} />
          <Route path="simulador" element={<Simulator360 />} />
          <Route path="exportador" element={<ExportadorPortais />} />
          <Route path="crm" element={<CRMLeads />} />
          <Route path="clients" element={<ClientsManager />} />
          <Route path="kanban" element={<KanbanBoard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="reports" element={<BIUrbano />} />
          <Route path="condominios" element={<AdmCondominios />} />
          <Route path="condominios/novo" element={<CondominiumEditor />} />
          <Route path="chaves" element={<ControleChaves />} />
          <Route path="financeiro" element={<FinanceiroUrbano />} />
          <Route path="fintech" element={<FinancialHub />} />
          <Route path="clube" element={<ClubeImobzy />} />
          <Route path="documentos" element={<GestaoDocumentos />} />
          <Route
            path="portal-proprietario"
            element={<PortalProprietarioUrbano />}
          />
          <Route path="portal-comprador" element={<PortalCompradorUrbano />} />
          <Route path="portal-locatario" element={<PortalLocatario />} />
          <Route path="landing-pages" element={<LandingPageManager />} />
          <Route path="quiz" element={<QuizCampaigns />} />
          <Route path="landing-pages/:id" element={<LandingPageEditor />} />
          <Route path="site" element={<SiteManager />} />
          <Route path="site/pages/:id" element={<SitePageEditor />} />
          <Route path="waitlist" element={<WaitlistLeads />} />
          <Route
            path="site-setup"
            element={<Navigate to="/urban/site" replace />}
          />
          <Route
            path="visual-editor"
            element={<Navigate to="/urban/site" replace />}
          />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="ai-agents" element={<AIAgents />} />
          <Route path="wootech-ai" element={<WooTechAI />} />
          <Route path="contracts" element={<LegalContracts />} />
          <Route path="whatsapp" element={<WhatsAppDashboard />} />
          <Route path="whatsapp/campaigns" element={<CampaignManager />} />
          <Route path="whatsapp/campaigns/:id" element={<CampaignEditor />} />
          <Route path="instagram" element={<InstagramDashboard />} />
          <Route path="email" element={<EmailCenter />} />
          <Route path="connections" element={<ConexoesUrbano />} />
          <Route path="integrations" element={<SystemSettings />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>

        <Route
          path="/megaadmin"
          element={
            <ProtectedRoute>
              <MegaAdminGuard>
                <MegaAdminLayout />
              </MegaAdminGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<MegaAdminDashboard />} />
          <Route path="resellers" element={<ResellerManager />} />
          <Route path="direct-clients" element={<DirectClientsManager />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="monitoring" element={<PlatformMonitoring />} />
          <Route path="billing" element={<BillingOverview />} />
          <Route path="feature-flags" element={<FeatureFlags />} />
          <Route path="audit-log" element={<MegaAuditLog />} />
          <Route path="importer" element={<SmartImporter />} />
          <Route path="fluowai-migration" element={<FluowaiMigration />} />
          <Route
            path="storage-intelligence"
            element={<StorageIntelligence />}
          />
          <Route path="settings" element={<MegaGlobalSettings />} />
        </Route>

        <Route
          path="/superadmin"
          element={
            <ProtectedRoute>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="tenants" element={<TenantManager />} />
          <Route path="support" element={<SupportManager />} />
          <Route path="team" element={<TeamManager />} />
          <Route path="domains" element={<DomainManager />} />
          <Route path="consulting" element={<ConsultingLeads />} />
          <Route path="plans" element={<PlanManager />} />
          <Route path="billing" element={<BillingManager />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="templates" element={<TemplateManager />} />
          <Route path="marketing" element={<MarketingManager />} />
          <Route path="settings" element={<GlobalSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
