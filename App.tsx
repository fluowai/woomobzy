import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

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
// ERROR BOUNDARY
// ==========================================
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
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
            <h1 className="text-2xl font-black text-red-600 mb-4 uppercase">Ops! Algo deu errado.</h1>
            <p className="text-slate-600 mb-6 font-medium">Ocorreu um erro inesperado na renderização do sistema.</p>
            <div className="bg-slate-900 text-left p-4 rounded-xl mb-6 overflow-auto max-h-48">
              <code className="text-red-400 text-xs font-mono">{this.state.error?.toString()}</code>
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

    return this.props.children;
  }
}

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
  
  if (loading) {
    console.log('⏳ [NicheRedirect] Auth still loading, rendering null...');
    return null;
  }

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

  // A1: If user has no organization, redirect to onboarding
  if (!profile?.organization_id || !profile?.organization) {
    console.log('⚠️ [NicheRedirect] User has no organization, redirecting to /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  const niche = profile.organization.niche || 'traditional';
  const target = (niche === 'rural' || niche === 'hybrid') ? '/rural' : '/urban';
  console.log('🏢 [NicheRedirect] Redirecting to niche:', niche, 'Target:', target);

  return <Navigate to={target} replace />;
};



// ==========================================
// GLOBAL SUPER ADMIN GUARD
// = [FORCE] sends super admins to /superadmin unless impersonating
// Uses DECLARATIVE redirect (Navigate) instead of useEffect to prevent loops
// ==========================================
const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isImpersonating, loading } = useAuth();
  const location = useLocation();

  console.log('🛡️ [SuperAdminGuard] Rendering. Path:', location.pathname, 'Profile:', profile?.role, 'Loading:', loading);

  if (loading) {
    console.log('🛡️ [SuperAdminGuard] Auth loading, returning null');
    return null;
  }

  if (profile?.role === 'superadmin' && !isImpersonating) {
    const path = location.pathname;
    if (!path.startsWith('/superadmin') && path !== '/login' && path !== '/impersonate') {
      console.log('🛡️ [GlobalGuard] Super Admin on non-superadmin route:', path, '-> Redirecting to /superadmin');
      return <Navigate to="/superadmin" replace />;
    }
  }

  return <>{children}</>;
};


// ==========================================
// MAIN APP CONTENT WITH ISOLATED ROUTE GROUPS
// ==========================================
const AppContent: React.FC = () => {
  const { settings, loading } = useSettings();
  
  console.log('📦 [AppContent] Rendering. Settings loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
    <ErrorBoundary>
    <ImpersonationBanner />
    <SuperAdminGuard>
      <Routes>
      {/* ... routes ... */}
      </Routes>
    </SuperAdminGuard>
    </ErrorBoundary>
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
