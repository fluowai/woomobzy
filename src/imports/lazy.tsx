import { lazy, Suspense } from 'react';

export const RuralDashboard = lazy(() => import('../../views/RuralDashboard'));
export const UrbanDashboard = lazy(() => import('../../views/UrbanDashboard'));
export const PropertyManagement = lazy(() => import('../../views/PropertyManagement'));
export const PropertyEditor = lazy(() => import('../../views/PropertyEditor'));
export const LandingPageManager = lazy(() => import('../../views/LandingPageManager'));
export const LandingPageEditor = lazy(() => import('../../views/LandingPageEditor'));
export const AIAssistant = lazy(() => import('../../views/AIAssistant'));
export const SystemSettings = lazy(() => import('../../views/SystemSettings'));
export const DataRoom = lazy(() => import('../../views/DataRoom'));
export const LegalContracts = lazy(() => import('../../views/LegalContracts'));
export const BIRural = lazy(() => import('../../views/BIRural'));
export const KanbanBoard = lazy(() => import('../../views/CRM/KanbanBoard'));
export const WhatsAppInstances = lazy(() => import('../../views/admin/WhatsAppInstances'));
export const Chat = lazy(() => import('../../views/admin/Chat'));
export const TestMessages = lazy(() => import('../../views/admin/TestMessages'));
export const CadastroTecnico = lazy(() => import('../../views/rural/CadastroTecnico'));
export const Geointeligencia = lazy(() => import('../../views/rural/Geointeligencia'));
export const DueDiligence = lazy(() => import('../../views/rural/DueDiligence'));
export const PortalProprietarioRural = lazy(() => import('../../views/rural/PortalProprietarioRural'));
export const PortalCompradorRural = lazy(() => import('../../views/rural/PortalCompradorRural'));
export const Empreendimentos = lazy(() => import('../../views/urban/Empreendimentos'));
export const Locacao = lazy(() => import('../../views/urban/Locacao'));
export const ComplianceUrbano = lazy(() => import('../../views/urban/ComplianceUrbano'));
export const ExportadorPortais = lazy(() => import('../../views/urban/ExportadorPortais'));
export const PortalProprietarioUrbano = lazy(() => import('../../views/urban/PortalProprietarioUrbano'));
export const PortalCompradorUrbano = lazy(() => import('../../views/urban/PortalCompradorUrbano'));
export const SuperAdminDashboard = lazy(() => import('../../views/superadmin/Dashboard'));
export const TenantManager = lazy(() => import('../../views/superadmin/TenantManager'));
export const GlobalSettings = lazy(() => import('../../views/superadmin/GlobalSettings'));
export const DomainManager = lazy(() => import('../../views/superadmin/DomainManager'));
export const PlanManager = lazy(() => import('../../views/superadmin/PlanManager'));
export const BillingManager = lazy(() => import('../../views/superadmin/BillingManager'));
export const FeatureFlags = lazy(() => import('../../views/superadmin/FeatureFlags'));
export const AuditLog = lazy(() => import('../../views/superadmin/AuditLog'));
export const TemplateManager = lazy(() => import('../../views/superadmin/TemplateManager'));
export const PlatformMonitoring = lazy(() => import('../../views/superadmin/PlatformMonitoring'));
export const AnalyticsDashboard = lazy(() => import('../../views/superadmin/AnalyticsDashboard'));
export const SupportManager = lazy(() => import('../../views/superadmin/SupportManager'));
export const TeamManager = lazy(() => import('../../views/superadmin/TeamManager'));
export const SmartImporter = lazy(() => import('../../views/superadmin/SmartImporter'));

export const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      <p className="mt-4 text-slate-500 font-medium">Carregando...</p>
    </div>
  </div>
);
