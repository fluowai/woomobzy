import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Outlet,
} from 'react-router-dom';

// Impersonation Components
import ImpersonateCallback from './views/ImpersonateCallback';
import ImpersonationBanner from './components/ImpersonationBanner';
import { Toaster } from 'sonner';


// Layouts
import RuralLayout from './components/RuralLayout';
import UrbanLayout from './components/UrbanLayout';
import ProtectedRoute from './components/ProtectedRoute';
import TrackingPixels from './components/TrackingPixels';

// Public Views
import LandingPage from './views/LandingPage';
import Login from './views/Login';
import Register from './views/Register';
import PublicLandingPage from './views/PublicLandingPage';
import Onboarding from './views/Onboarding';

// Dashboards (Niche-aware)
import RuralDashboard from './views/RuralDashboard';
import UrbanDashboard from './views/UrbanDashboard';

// Shared Views (used by both Rural and Urban)
import PropertyManagement from './views/PropertyManagement';
import PropertyEditor from './views/PropertyEditor';
import LandingPageManager from './views/LandingPageManager';
import LandingPageEditor from './views/LandingPageEditor';
import VisualSiteEditor from './views/VisualSiteEditor';
import SiteSetupWizard from './views/SiteSetupWizard';
import AIAssistant from './views/AIAssistant';
import SystemSettings from './views/SystemSettings';
import DataRoom from './views/DataRoom';
import LegalContracts from './views/LegalContracts';
import BIRural from './views/BIRural';
import KanbanBoard from './views/CRM/KanbanBoard';
import WhatsAppInstances from './views/admin/WhatsAppInstances';
import Chat from './views/admin/Chat';
import TestMessages from './views/admin/TestMessages';
import WaitlistLeads from './views/admin/WaitlistLeads';
import Dashboard360 from './views/admin/Dashboard360';

// Rural-Specific Views
import CadastroTecnico from './views/rural/CadastroTecnico';
import Geointeligencia from './views/rural/Geointeligencia';
import DueDiligence from './views/rural/DueDiligence';

// Urban-Specific Views
import Empreendimentos from './views/urban/Empreendimentos';
import Locacao from './views/urban/Locacao';
import ComplianceUrbano from './views/urban/ComplianceUrbano';
import ExportadorPortais from './views/urban/ExportadorPortais';

// Super Admin
import SuperAdminLayout from './views/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './views/superadmin/Dashboard';
import TenantManager from './views/superadmin/TenantManager';
import GlobalSettings from './views/superadmin/GlobalSettings';
import DomainManager from './views/superadmin/DomainManager';
import PlanManager from './views/superadmin/PlanManager';
import BillingManager from './views/superadmin/BillingManager';
import FeatureFlags from './views/superadmin/FeatureFlags';
import AuditLog from './views/superadmin/AuditLog';
import TemplateManager from './views/superadmin/TemplateManager';
import PlatformMonitoring from './views/superadmin/PlatformMonitoring';
import AnalyticsDashboard from './views/superadmin/AnalyticsDashboard';
import SupportManager from './views/superadmin/SupportManager';
import TeamManager from './views/superadmin/TeamManager';
import SmartImporter from './views/superadmin/SmartImporter';

// Portals
import PortalProprietarioRural from './views/rural/PortalProprietarioRural';
import PortalCompradorRural from './views/rural/PortalCompradorRural';
import PortalProprietarioUrbano from './views/urban/PortalProprietarioUrbano';
import PortalCompradorUrbano from './views/urban/PortalCompradorUrbano';

// Context
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TextsProvider } from './context/TextsContext';
import { PlansProvider } from './context/PlansContext';
import DomainRouter from './components/DomainRouter';

// console.log('App.tsx: Multi-Panel Architecture Active');

// ==========================================
// ERROR BOUNDARY
// ==========================================
interface EBProps {
  children: React.ReactNode;
}
interface EBState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<EBProps, EBState> {
  // @ts-ignore
  state: EBState = { hasError: false, error: null };

  // @ts-ignore
  constructor(props: EBProps) {
    // @ts-ignore
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ [ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-8 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-red-100 max-w-2xl">
            <h1 className="text-2xl font-black text-red-600 mb-4 uppercase">
              Ops! Algo deu errado.
            </h1>
            <p className="text-slate-600 mb-6 font-medium">
              Ocorreu um erro inesperado na renderização do sistema.
            </p>
            <div className="bg-slate-900 text-left p-4 rounded-xl mb-6 overflow-auto max-h-48">
              <code className="text-red-400 text-xs font-mono">
                {this.state.error?.toString()}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}

// ==========================================
// LOADING SPINNER (reusable)
// ==========================================
const FullScreenSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      <p className="mt-4 text-slate-500 font-medium">Carregando...</p>
    </div>
  </div>
);

// ==========================================
// NICHE REDIRECT — sends /admin/* users to the correct panel
// ==========================================
const NicheRedirect: React.FC = () => {
  const { profile, isImpersonating, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;

  // If Super Admin and NOT impersonating, go to Super Admin panel
  if (profile?.role === 'superadmin' && !isImpersonating) {
    return <Navigate to="/superadmin" replace />;
  }

  // If user has no organization AND is not an admin, redirect to onboarding
  if (!profile?.organization_id && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return <Navigate to="/onboarding" replace />;
  }

  // Determine niche: check organization.niche, fallback to 'rural'
  const niche = (profile.organization as any)?.niche || 'rural';
  const target = niche === 'rural' || niche === 'hybrid' ? '/rural' : '/urban';
  return <Navigate to={target} replace />;
};

// ==========================================
// GLOBAL SUPER ADMIN GUARD
// Forces super admins to /superadmin unless impersonating
// ==========================================
const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, isImpersonating, loading } = useAuth();
  const location = useLocation();

  // BUG 4 FIX: Show spinner instead of blank screen while loading
  if (loading) return <FullScreenSpinner />;

  if (profile?.role === 'superadmin' && !isImpersonating) {
    const path = location.pathname;
    if (
      !path.startsWith('/superadmin') &&
      path !== '/login' &&
      path !== '/impersonate'
    ) {
      return <Navigate to="/superadmin" replace />;
    }
  }

  return <>{children}</>;
};

// ==========================================
// MAIN APP CONTENT
// ==========================================
const AppContent: React.FC = () => {
  const { loading } = useSettings();
  const location = useLocation();

  React.useEffect(() => {
    // 1. Redirecionamento do Domínio Principal (Painel)
    if (
      window.location.hostname === 'imobzy.consultio.com.br' &&
      window.location.pathname === '/'
    ) {
      window.location.href = '/login';
    }
  }, []);

  if (loading) return <FullScreenSpinner />;

  return (
    <>
      <Toaster richColors closeButton position="top-right" />
      <ImpersonationBanner />
      <SuperAdminGuard>

        <Routes>
          {/* ====== PUBLIC ROUTES ====== */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/impersonate" element={<ImpersonateCallback />} />
          <Route path="/lp/:slug" element={<PublicLandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/embreve" element={<PublicLandingPage forceComingSoon={true} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/site/:slug/*" element={<PublicLandingPage />} />

          {/* ====== LEGACY /admin → NICHE REDIRECT ====== */}
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

          {/* ====== 🌾 RURAL PANEL ====== */}
          <Route
            path="/rural"
            element={
              <ProtectedRoute>
                <RuralLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RuralDashboard />} />
            <Route path="360" element={<Dashboard360 />} />
            <Route path="cadastro-tecnico" element={<CadastroTecnico />} />
            <Route path="properties" element={<PropertyManagement />} />
            <Route path="properties/new" element={<PropertyEditor />} />
            <Route path="properties/:id" element={<PropertyEditor />} />
            <Route path="geointeligencia" element={<Geointeligencia />} />
            <Route path="due-diligence" element={<DueDiligence />} />
            <Route path="dataroom" element={<DataRoom />} />
            <Route path="crm" element={<KanbanBoard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="whatsapp-instances" element={<WhatsAppInstances />} />
            <Route path="test-messages" element={<TestMessages />} />
            <Route path="reports" element={<BIRural />} />
            <Route path="portal-proprietario" element={<PortalProprietarioRural />} />
            <Route path="portal-comprador" element={<PortalCompradorRural />} />
            <Route path="landing-pages/:id" element={<LandingPageEditor />} />
            <Route path="waitlist" element={<WaitlistLeads />} />
            <Route path="site-setup" element={<SiteSetupWizard />} />
            <Route path="visual-editor" element={<VisualSiteEditor />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="contracts" element={<LegalContracts />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>

          {/* ====== 🏙 URBAN PANEL ====== */}
          <Route
            path="/urban"
            element={
              <ProtectedRoute>
                <UrbanLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<UrbanDashboard />} />
            <Route path="360" element={<Dashboard360 />} />
            <Route path="properties" element={<PropertyManagement />} />
            <Route path="properties/new" element={<PropertyEditor />} />
            <Route path="properties/:id" element={<PropertyEditor />} />
            <Route path="empreendimentos" element={<Empreendimentos />} />
            <Route path="locacao" element={<Locacao />} />
            <Route path="compliance" element={<ComplianceUrbano />} />
            <Route path="exportador" element={<ExportadorPortais />} />
            <Route path="crm" element={<KanbanBoard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="whatsapp-instances" element={<WhatsAppInstances />} />
            <Route path="test-messages" element={<TestMessages />} />
            <Route path="reports" element={<BIRural />} />
            <Route path="portal-proprietario" element={<PortalProprietarioUrbano />} />
            <Route path="portal-comprador" element={<PortalCompradorUrbano />} />
            <Route path="landing-pages/:id" element={<LandingPageEditor />} />
            <Route path="waitlist" element={<WaitlistLeads />} />
            <Route path="site-setup" element={<SiteSetupWizard />} />
            <Route path="visual-editor" element={<VisualSiteEditor />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="contracts" element={<LegalContracts />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>

          {/* ====== 👑 SUPER ADMIN ====== */}
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute>
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="monitoring" element={<PlatformMonitoring />} />
            <Route path="tenants" element={<TenantManager />} />
            <Route path="support" element={<SupportManager />} />
            <Route path="team" element={<TeamManager />} />
            <Route path="domains" element={<DomainManager />} />
            <Route path="plans" element={<PlanManager />} />
            <Route path="billing" element={<BillingManager />} />
            <Route path="feature-flags" element={<FeatureFlags />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="templates" element={<TemplateManager />} />
            <Route path="importer" element={<SmartImporter />} />
            <Route path="settings" element={<GlobalSettings />} />
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SuperAdminGuard>
    </>
  );
};

// ==========================================
// ROOT APP
// ==========================================
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SettingsProvider>
            <TextsProvider>
              <PlansProvider>
                <DomainRouter>
                  <TrackingPixels />
                  <AppContent />
                </DomainRouter>
              </PlansProvider>
            </TextsProvider>
          </SettingsProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
