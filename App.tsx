import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

// Impersonation Components
import ImpersonateCallback from './views/ImpersonateCallback';
import ImpersonationBanner from './components/ImpersonationBanner';

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
import AdminDashboard from './views/AdminDashboard';
import RuralDashboard from './views/RuralDashboard';
import UrbanDashboard from './views/UrbanDashboard';

// Shared Views (used by both Rural and Urban)
import PropertyManagement from './views/PropertyManagement';
import PropertyEditor from './views/PropertyEditor';
import LandingPageManager from './views/LandingPageManager';
import LandingPageEditor from './views/LandingPageEditor';
import TextsManager from './views/TextsManager';
import AIAssistant from './views/AIAssistant';
import Migration from './views/Migration';
import SystemSettings from './views/SystemSettings';
import DataRoom from './views/DataRoom';
import LegalContracts from './views/LegalContracts';
import BIRural from './views/BIRural';
import KanbanBoard from './views/CRM/KanbanBoard';
import Messages from './views/admin/Messages';
import WhatsAppSetup from './views/admin/WhatsAppSetup';

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

console.log('App.tsx: Multi-Panel Architecture Active');

// ==========================================
// PLACEHOLDER for WIP views
// ==========================================
const Placeholder: React.FC<{ name: string }> = ({ name }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 bg-slate-50 p-4 text-center">
    <div className="animate-pulse bg-slate-200 rounded-full h-16 w-16 mb-4 mx-auto"></div>
    <h2 className="text-xl font-bold mb-2">Em Breve: {name}</h2>
    <p>Funcionalidade em desenvolvimento.</p>
  </div>
);

// ==========================================
// NICHE REDIRECT — sends /admin/* users to the correct panel
// ==========================================
const NicheRedirect: React.FC = () => {
  const { profile, isImpersonating, loading } = useAuth();
  
  if (loading) return null;

  console.log('🔄 [NicheRedirect] State:', { 
    role: profile?.role, 
    isImpersonating, 
    orgId: profile?.organization_id,
    niche: profile?.organization?.niche 
  });

  // If Super Admin and NOT impersonating, go to Super Admin panel
  if (profile?.role === 'superadmin' && !isImpersonating) {
    console.log('👑 [NicheRedirect] Super Admin detected, redirecting to /superadmin');
    return <Navigate to="/superadmin" replace />;
  }

  const niche = profile?.organization?.niche || 'traditional';
  console.log('🏢 [NicheRedirect] Redirecting to niche:', niche);

  if (niche === 'rural') return <Navigate to="/rural" replace />;
  if (niche === 'hybrid') return <Navigate to="/rural" replace />;
  return <Navigate to="/urban" replace />;
};

// ==========================================
// GLOBAL SUPER ADMIN GUARD
// = [FORCE] sends super admins to /superadmin unless impersonating
// ==========================================
const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isImpersonating, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && profile?.role === 'superadmin' && !isImpersonating) {
      const path = location.pathname;
      // If not on superadmin path, force redirect
      if (!path.startsWith('/superadmin') && path !== '/login' && path !== '/impersonate') {
        console.log('🛡️ [GlobalGuard] Super Admin escaping! Redirecting to /superadmin');
        navigate('/superadmin', { replace: true });
      }
    }
  }, [profile, isImpersonating, loading, location.pathname, navigate]);

  return <>{children}</>;
};

// ==========================================
// MAIN APP CONTENT WITH ISOLATED ROUTE GROUPS
// ==========================================
const AppContent: React.FC = () => {
  const { settings, loading } = useSettings();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
    <ImpersonationBanner />
    <SuperAdminGuard>
      <Routes>
      {/* ============================== */}
      {/* PUBLIC ROUTES */}
      {/* ============================== */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/impersonate" element={<ImpersonateCallback />} />
      <Route path="/lp/:slug" element={<PublicLandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* ============================== */}
      {/* LEGACY /admin/* → Redirect to niche panel */}
      {/* ============================== */}
      <Route path="/admin" element={<ProtectedRoute><NicheRedirect /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute><NicheRedirect /></ProtectedRoute>} />

      {/* ============================== */}
      {/* 🌾 RURAL PANEL — /rural/* */}
      {/* ============================== */}
      <Route path="/rural" element={<ProtectedRoute><RuralLayout><RuralDashboard /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/cadastro-tecnico" element={<ProtectedRoute><RuralLayout><CadastroTecnico /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/properties" element={<ProtectedRoute><RuralLayout><PropertyManagement /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/properties/new" element={<ProtectedRoute><RuralLayout><PropertyEditor /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/properties/:id" element={<ProtectedRoute><RuralLayout><PropertyEditor /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/geointeligencia" element={<ProtectedRoute><RuralLayout><Geointeligencia /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/due-diligence" element={<ProtectedRoute><RuralLayout><DueDiligence /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/dataroom" element={<ProtectedRoute><RuralLayout><DataRoom /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/crm" element={<ProtectedRoute><RuralLayout><KanbanBoard /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/messages" element={<ProtectedRoute><RuralLayout><Messages /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/whatsapp-setup" element={<ProtectedRoute><RuralLayout><WhatsAppSetup /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/reports" element={<ProtectedRoute><RuralLayout><BIRural /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/portal-proprietario" element={<ProtectedRoute><RuralLayout><PortalProprietarioRural /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/portal-comprador" element={<ProtectedRoute><RuralLayout><PortalCompradorRural /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/landing-pages" element={<ProtectedRoute><RuralLayout><LandingPageManager /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/landing-pages/new" element={<ProtectedRoute><RuralLayout><LandingPageEditor /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/landing-pages/:id" element={<ProtectedRoute><RuralLayout><LandingPageEditor /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/ai-assistant" element={<ProtectedRoute><RuralLayout><AIAssistant /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/contracts" element={<ProtectedRoute><RuralLayout><LegalContracts /></RuralLayout></ProtectedRoute>} />
      <Route path="/rural/settings" element={<ProtectedRoute><RuralLayout><SystemSettings /></RuralLayout></ProtectedRoute>} />

      {/* ============================== */}
      {/* 🏙 URBAN PANEL — /urban/* */}
      {/* ============================== */}
      <Route path="/urban" element={<ProtectedRoute><UrbanLayout><UrbanDashboard /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/properties" element={<ProtectedRoute><UrbanLayout><PropertyManagement /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/properties/new" element={<ProtectedRoute><UrbanLayout><PropertyEditor /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/properties/:id" element={<ProtectedRoute><UrbanLayout><PropertyEditor /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/empreendimentos" element={<ProtectedRoute><UrbanLayout><Empreendimentos /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/locacao" element={<ProtectedRoute><UrbanLayout><Locacao /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/compliance" element={<ProtectedRoute><UrbanLayout><ComplianceUrbano /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/exportador" element={<ProtectedRoute><UrbanLayout><ExportadorPortais /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/crm" element={<ProtectedRoute><UrbanLayout><KanbanBoard /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/messages" element={<ProtectedRoute><UrbanLayout><Messages /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/whatsapp-setup" element={<ProtectedRoute><UrbanLayout><WhatsAppSetup /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/reports" element={<ProtectedRoute><UrbanLayout><BIRural /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/portal-proprietario" element={<ProtectedRoute><UrbanLayout><PortalProprietarioUrbano /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/portal-comprador" element={<ProtectedRoute><UrbanLayout><PortalCompradorUrbano /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/landing-pages" element={<ProtectedRoute><UrbanLayout><LandingPageManager /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/landing-pages/new" element={<ProtectedRoute><UrbanLayout><LandingPageEditor /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/landing-pages/:id" element={<ProtectedRoute><UrbanLayout><LandingPageEditor /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/ai-assistant" element={<ProtectedRoute><UrbanLayout><AIAssistant /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/contracts" element={<ProtectedRoute><UrbanLayout><LegalContracts /></UrbanLayout></ProtectedRoute>} />
      <Route path="/urban/settings" element={<ProtectedRoute><UrbanLayout><SystemSettings /></UrbanLayout></ProtectedRoute>} />

      {/* ============================== */}
      {/* 👑 SUPER ADMIN — /superadmin/* */}
      {/* ============================== */}
      <Route path="/superadmin" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </SuperAdminGuard>
    </>
  );
};

const App: React.FC = () => {
  return (
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
  );
};

export default App;
