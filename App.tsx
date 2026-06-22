import { logger } from '@/utils/logger';
import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

// Layouts & Guards (Keep static for faster initial shell)
import RuralLayout from './components/RuralLayout';
import UrbanLayout from './components/UrbanLayout';
import ProtectedRoute from './components/ProtectedRoute';
import TrackingPixels from './components/TrackingPixels';
import DomainRouter from './components/DomainRouter';
import ImpersonationBanner from './components/ImpersonationBanner';
import { Toaster } from 'sonner';
import { AlertCircle } from 'lucide-react';

// Context
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TextsProvider } from './context/TextsContext';
import { PlansProvider } from './context/PlansContext';
import { supabase } from './services/supabase';

const LandingPageManager = lazy(() => import('./views/LandingPageManager'));
const FAZENDAS_BRASIL_ORG_ID = 'ee2eafa9-929a-460e-a38a-2e13d259e7cb';

// Public Views (Static for SEO/Initial Load)
import LandingPage from './views/LandingPage';
import SystemSalesPage from './views/SystemSalesPage';
import Login from './views/Login';
import Onboarding from './views/Onboarding';

// Lazy Loaded Views
const Register = lazy(() => import('./views/Register'));
const DnsHelp = lazy(() => import('./views/DnsHelp'));
const ImpersonateCallback = lazy(() => import('./views/ImpersonateCallback'));
const PublicLandingPage = lazy(() => import('./views/PublicLandingPage'));
const BreuBrancoLandingPage = lazy(() => import('./views/BreuBrancoLandingPage'));
const RuralDashboard = lazy(() => import('./views/RuralDashboard'));
const UrbanDashboard = lazy(() => import('./views/UrbanDashboard'));
const PropertyManagement = lazy(() => import('./views/PropertyManagement'));
const PropertyEditor = lazy(() => import('./views/PropertyEditor'));
const LandingPageEditor = lazy(() => import('./views/LandingPageEditor'));
const VisualSiteEditor = lazy(() => import('./views/VisualSiteEditor'));
const SiteSetupWizard = lazy(() => import('./views/SiteSetupWizard'));
const AIAssistant = lazy(() => import('./views/AIAssistant'));
const AIAgents = lazy(() => import('./views/AIAgents'));
const ConsultingQualificacao = lazy(() => import('./views/ConsultingQualificacao'));
const SystemSettings = lazy(() => import('./views/SystemSettings'));
const DataRoom = lazy(() => import('./views/DataRoom'));
const LegalContracts = lazy(() => import('./views/LegalContracts'));
const BIRural = lazy(() => import('./views/BIRural'));
const BIUrbano = lazy(() => import('./views/BIUrbano'));
const CRMLeads = lazy(() => import('./views/CRM/CRMLeads'));
const ClientsManager = lazy(() => import('./views/CRM/ClientsManager'));
const KanbanBoard = lazy(() => import('./views/CRM/KanbanBoard'));
const WaitlistLeads = lazy(() => import('./views/admin/WaitlistLeads'));
const Dashboard360 = lazy(() => import('./views/admin/Dashboard360'));
const QuizCampaigns = lazy(() => import('./views/QuizCampaigns'));
const PublicQuiz = lazy(() => import('./views/PublicQuiz'));

// Rural-Specific
const CadastroTecnico = lazy(() => import('./views/rural/CadastroTecnico'));
const RuralTerritoryHub = lazy(() => import('./views/rural/RuralTerritoryHub'));
const Geointeligencia = lazy(() => import('./views/rural/Geointeligencia'));
const DossieInteligente = lazy(() => import('./views/rural/DossieInteligente'));
const DueDiligence = lazy(() => import('./views/rural/DueDiligence'));
const PortalProprietarioRural = lazy(() => import('./views/rural/PortalProprietarioRural'));
const PortalCompradorRural = lazy(() => import('./views/rural/PortalCompradorRural'));
const FinanceiroRural = lazy(() => import('./views/rural/FinanceiroRural'));
const ConexoesRural = lazy(() => import('./views/rural/ConexoesRural'));
const CARLocationSearch = lazy(() => import('./views/rural/CARLocationSearch'));
const Matchmaking360 = lazy(() => import('./views/admin/Matchmaking360'));

// Urban-Specific
const Empreendimentos = lazy(() => import('./views/urban/Empreendimentos'));
const LoteamentoDetails = lazy(() => import('./views/urban/LoteamentoDetails'));
const Locacao = lazy(() => import('./views/urban/Locacao'));
const ComplianceUrbano = lazy(() => import('./views/urban/ComplianceUrbano'));
const Cobranca = lazy(() => import('./views/urban/Cobranca'));
const Simulator360 = lazy(() => import('./views/urban/Simulator360'));
const PortalLocatario = lazy(() => import('./views/urban/PortalLocatario'));
const ExportadorPortais = lazy(() => import('./views/urban/ExportadorPortais'));
const PortalProprietarioUrbano = lazy(() => import('./views/urban/PortalProprietarioUrbano'));
const PortalCompradorUrbano = lazy(() => import('./views/urban/PortalCompradorUrbano'));
const AdmCondominios = lazy(() => import('./views/urban/AdmCondominios'));
const ControleChaves = lazy(() => import('./views/urban/ControleChaves'));
const FinanceiroUrbano = lazy(() => import('./views/urban/FinanceiroUrbano'));
const GestaoDocumentos = lazy(() => import('./views/urban/GestaoDocumentos'));
const ConexoesUrbano = lazy(() => import('./views/urban/ConexoesUrbano'));

// Super Admin
const SuperAdminLayout = lazy(() => import('./views/superadmin/SuperAdminLayout'));
const SuperAdminDashboard = lazy(() => import('./views/superadmin/Dashboard'));
const ConsultingLeads = lazy(() => import('./views/superadmin/ConsultingLeads'));
const TenantManager = lazy(() => import('./views/superadmin/TenantManager'));
const GlobalSettings = lazy(() => import('./views/superadmin/GlobalSettings'));
const DomainManager = lazy(() => import('./views/superadmin/DomainManager'));
const PlanManager = lazy(() => import('./views/superadmin/PlanManager'));
const BillingManager = lazy(() => import('./views/superadmin/BillingManager'));
const FeatureFlags = lazy(() => import('./views/superadmin/FeatureFlags'));
const AuditLog = lazy(() => import('./views/superadmin/AuditLog'));
const TemplateManager = lazy(() => import('./views/superadmin/TemplateManager'));
const PlatformMonitoring = lazy(() => import('./views/superadmin/PlatformMonitoring'));
const AnalyticsDashboard = lazy(() => import('./views/superadmin/AnalyticsDashboard'));
const SupportManager = lazy(() => import('./views/superadmin/SupportManager'));
const TeamManager = lazy(() => import('./views/superadmin/TeamManager'));
const SmartImporter = lazy(() => import('./views/superadmin/SmartImporter'));
const FluowaiMigration = lazy(() => import('./views/superadmin/FluowaiMigration'));
const StorageIntelligence = lazy(() => import('./views/superadmin/StorageIntelligence'));
const MarketingManager = lazy(() => import('./views/superadmin/MarketingManager'));

// Site Builder
const SiteManager = lazy(() => import('./views/SiteManager'));
const SitePageEditor = lazy(() => import('./views/SitePageEditor'));
const PublicSite = lazy(() => import('./views/PublicSite'));

// WhatsApp
const WhatsAppDashboard = lazy(() => import('./views/WhatsApp/WhatsAppDashboard'));
const EmailCenter = lazy(() => import('./views/EmailCenter'));

// logger.info('App.tsx: Multi-Panel Architecture Active');

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
  state: EBState = { hasError: false, error: null };

  constructor(props: EBProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('❌ [ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary p-8 text-center animate-fade-in">
          <div className="card-premium p-10 max-w-2xl w-full">
            <div className="mb-6 inline-flex p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <h1 className="h1 text-text-primary mb-4 uppercase tracking-tight">
              Ops! Algo deu errado.
            </h1>
            <p className="body text-text-secondary mb-8">
              Ocorreu um erro inesperado na renderização do sistema.
            </p>
            <div className="bg-bg-hover text-left p-6 rounded-xl mb-8 overflow-auto max-h-48 border border-border">
              <code className="text-accent text-xs font-mono">
                {this.state.error?.toString()}
              </code>
            </div>
            {this.state.error?.name === 'TypeError' && this.state.error?.message?.includes('module') ? (
              <p className="text-amber-500 text-sm mb-4">
                ⚠️ Detectamos uma atualização no sistema. Por favor, clique abaixo para atualizar sua versão.
              </p>
            ) : null}
            <button
              onClick={() => {
                // If it's a module error, force reload from server
                if (this.state.error?.name === 'TypeError' && this.state.error?.message?.includes('module')) {
                   window.location.reload();
                } else {
                   window.location.reload();
                }
              }}
              className="btn btn-primary btn-lg px-8"
            >
              Atualizar e Recarregar
            </button>
          </div>
        </div>
      );
    }

    // @ts-expect-error - returning children
    return this.props.children;
  }
}

// ==========================================
// LOADING SPINNER (reusable)
// ==========================================
const FullScreenSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg-primary animate-fade-in">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="mt-4 text-text-secondary font-medium tracking-wide">Carregando...</p>
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

  // If user has no organization, redirect to onboarding instead of guessing a panel.
  if (
    !profile?.organization_id &&
    profile?.role !== 'superadmin'
  ) {
    logger.info('🔄 No organization found for user. Redirecting to onboarding.');
    return <Navigate to="/onboarding" replace />;
  }

  // Determine niche: check organization.niche
  // 'rural' → Rural Panel
  // anything else → Urban Panel (default seguro)
  const rawNiche = (profile?.organization as any)?.niche;
  const orgName = (profile?.organization as any)?.name;
  const orgSlug = (profile?.organization as any)?.slug;
  const isRural = isRuralOrganization(rawNiche, orgName, orgSlug);
  const target = isRural ? '/rural' : '/urban';
  
  logger.info(`🚀 NicheRedirect: Sending ${profile?.email} to ${target} (rawNiche: ${rawNiche}, isRural: ${isRural})`);
  return <Navigate to={target} replace />;
};

function isRuralOrganization(niche?: string, name?: string, slug?: string) {
  const normalizedNiche = String(niche || '').toLowerCase().trim();
  if (normalizedNiche === 'rural') return true;
  if (['traditional', 'urban', 'urbano'].includes(normalizedNiche)) return false;

  const text = `${name || ''} ${slug || ''}`.toLowerCase();
  return /\b(rural|fazenda|fazendas|sitio|sítio|chacara|chácara|agro|haras)\b/.test(text);
}

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
    const publicPaths = [
      '/',
      '/vendas',
      '/consultoria',
      '/consultoria/qualificacao',
      '/fazendas-brasil/',
      '/breu-branco',
      '/quiz/',
      '/ajuda/',
      '/lp/',
      '/site/',
      '/embreve',
      '/login',
      '/register',
      '/impersonate',
    ];
    const isPublicPath = publicPaths.some((publicPath) =>
      publicPath === '/' ? path === '/' : path.startsWith(publicPath)
    );

    if (
      !isPublicPath &&
      !path.startsWith('/superadmin') &&
      path !== '/login' &&
      path !== '/impersonate'
    ) {
      return <Navigate to="/superadmin" replace />;
    }
  }

  return <>{children}</>;
};

const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, loading } = useAuth();
  const [plans, setPlans] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
      .then(({ data }) => setPlans(data || []));
  }, []);

  if (loading) return <FullScreenSpinner />;
  if (!profile?.organization || profile.role === 'superadmin') return <>{children}</>;

  const org: any = profile.organization;
  const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const expiredTrial =
    org.subscription_status === 'trial' &&
    trialEndsAt &&
    trialEndsAt.getTime() < Date.now();
  const missingPlan = !org.plan_id && org.subscription_status !== 'active';
  const mustChoosePlan = expiredTrial || missingPlan || org.subscription_status === 'payment_required';

  if (!mustChoosePlan) return <>{children}</>;

  const selectPlan = async (planId: string) => {
    setSaving(true);
    await supabase
      .from('organizations')
      .update({
        plan_id: planId,
        subscription_status: 'active',
        selected_plan_at: new Date().toISOString(),
      })
      .eq('id', org.id);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl md:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
            <AlertCircle size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-950">
              Seu teste gratuito terminou
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
              Para acessar o painel novamente, escolha um plano. O acesso fica bloqueado ate a selecao do plano.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans
            .filter((plan) => (plan.slug || '').toLowerCase() !== 'free')
            .map((plan) => (
              <button
                key={plan.id}
                type="button"
                disabled={saving}
                onClick={() => selectPlan(plan.id)}
                className="rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-300 hover:shadow-lg disabled:opacity-60"
              >
                <p className="text-lg font-black text-slate-950">{plan.name}</p>
                <p className="mt-1 text-3xl font-black text-blue-600">
                  R$ {Number(plan.price_monthly || 0).toLocaleString('pt-BR')}
                  <span className="text-xs font-bold text-slate-400">/mes</span>
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Selecionar plano e continuar
                </p>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

const PanelGuard: React.FC<{
  panel: 'rural' | 'urban';
  children: React.ReactNode;
}> = ({ panel, children }) => {
  const { profile, isImpersonating, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (profile?.role === 'superadmin' && !isImpersonating) return <>{children}</>;
  if (!profile?.organization_id) return <Navigate to="/onboarding" replace />;

  const org: any = profile.organization;
  const correctPanel = isRuralOrganization(org?.niche, org?.name, org?.slug) ? 'rural' : 'urban';

  if (panel !== correctPanel) {
    return <Navigate to={`/${correctPanel}`} replace />;
  }

  return <>{children}</>;
};

// ==========================================
// MAIN APP CONTENT
// ==========================================
const AppContent: React.FC = () => {
  const { loading } = useSettings();

  React.useEffect(() => {
    // 1. Redirecionamento do Domínio Principal (Painel)
    if (
      window.location.hostname === 'app.imobfluow.com.br' &&
      window.location.pathname === '/'
    ) {
      window.location.href = '/login';
    }
  }, []);

  if (loading) return <FullScreenSpinner />;

  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Toaster richColors closeButton position="top-right" />
      <ImpersonationBanner />
      <SuperAdminGuard>
        <Routes>
          {/* ====== PUBLIC ROUTES ====== */}
          <Route path="/" element={<SystemSalesPage />} />
          <Route path="/vendas" element={<SystemSalesPage />} />
          <Route path="/consultoria" element={<SystemSalesPage />} />
          <Route path="/consultoria/qualificacao" element={<ConsultingQualificacao />} />
          <Route path="/fazendas-brasil/breu-branco" element={<BreuBrancoLandingPage organizationId={FAZENDAS_BRASIL_ORG_ID} />} />
          <Route path="/breu-branco" element={<BreuBrancoLandingPage organizationId={FAZENDAS_BRASIL_ORG_ID} />} />
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
          <Route path="/:slug/site/*" element={<PublicSite />} />
          <Route path="/site/:slug/*" element={<PublicSite />} />
          <Route path="/sites/:slug/*" element={<PublicSite />} />

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
              <Route path="due-diligence" element={<DueDiligence />} />
              <Route path="dossie" element={<DossieInteligente />} />
            </Route>
            <Route path="maps" element={<Navigate to="/rural/territorio/maps" replace />} />
            <Route path="localizar-car" element={<Navigate to="/rural/territorio/localizar-car" replace />} />
            <Route path="due-diligence" element={<Navigate to="/rural/territorio/due-diligence" replace />} />
            <Route path="dossie" element={<Navigate to="/rural/territorio/dossie" replace />} />
            <Route path="dataroom" element={<DataRoom />} />
            <Route path="crm" element={<CRMLeads />} />
            <Route path="kanban" element={<KanbanBoard />} />
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
            <Route path="site-setup" element={<SiteSetupWizard />} />
            <Route path="visual-editor" element={<VisualSiteEditor />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="ai-agents" element={<AIAgents />} />
            <Route path="contracts" element={<LegalContracts />} />
            <Route path="financial" element={<FinanceiroRural />} />
            <Route path="financeiro-advanced" element={<Locacao />} />
            <Route path="whatsapp" element={<WhatsAppDashboard />} />
            <Route path="email" element={<EmailCenter />} />
            <Route path="connections" element={<ConexoesRural />} />
            <Route path="integrations" element={<SystemSettings />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>

          {/* ====== 🏙 URBAN PANEL ====== */}
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
            <Route path="locacao" element={<Locacao />} />
            <Route path="compliance" element={<ComplianceUrbano />} />
            <Route path="cobranca" element={<Cobranca />} />
            <Route path="simulador" element={<Simulator360 />} />
            <Route path="exportador" element={<ExportadorPortais />} />
            <Route path="crm" element={<CRMLeads />} />
            <Route path="clients" element={<ClientsManager />} />
            <Route path="kanban" element={<KanbanBoard />} />
            <Route path="reports" element={<BIUrbano />} />
            <Route path="condominios" element={<AdmCondominios />} />
            <Route path="chaves" element={<ControleChaves />} />
            <Route path="financeiro" element={<FinanceiroUrbano />} />
            <Route path="documentos" element={<GestaoDocumentos />} />
            <Route
              path="portal-proprietario"
              element={<PortalProprietarioUrbano />}
            />
            <Route
              path="portal-comprador"
              element={<PortalCompradorUrbano />}
            />
            <Route path="portal-locatario" element={<PortalLocatario />} />
            <Route path="landing-pages" element={<LandingPageManager />} />
            <Route path="quiz" element={<QuizCampaigns />} />
            <Route path="landing-pages/:id" element={<LandingPageEditor />} />
            <Route path="site" element={<SiteManager />} />
            <Route path="site/pages/:id" element={<SitePageEditor />} />
            <Route path="waitlist" element={<WaitlistLeads />} />
            <Route path="site-setup" element={<SiteSetupWizard />} />
            <Route path="visual-editor" element={<VisualSiteEditor />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="ai-agents" element={<AIAgents />} />
            <Route path="contracts" element={<LegalContracts />} />
            <Route path="whatsapp" element={<WhatsAppDashboard />} />
            <Route path="email" element={<EmailCenter />} />
            <Route path="connections" element={<ConexoesUrbano />} />
            <Route path="integrations" element={<SystemSettings />} />
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
            <Route path="consulting" element={<ConsultingLeads />} />
            <Route path="plans" element={<PlanManager />} />
            <Route path="billing" element={<BillingManager />} />
            <Route path="feature-flags" element={<FeatureFlags />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="templates" element={<TemplateManager />} />
            <Route path="importer" element={<SmartImporter />} />
            <Route path="fluowai-migration" element={<FluowaiMigration />} />
            <Route path="storage-intelligence" element={<StorageIntelligence />} />
            <Route path="marketing" element={<MarketingManager />} />
            <Route path="settings" element={<GlobalSettings />} />
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SuperAdminGuard>
    </Suspense>
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
