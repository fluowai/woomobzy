import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { NavLink, Link as RouterLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Mail,
  Home,
  Map as MapIcon,
  Globe,
  Settings,
  Menu,
  X,
  PieChart,
  LogOut,
  ChevronRight,
  ShieldAlert,
  DollarSign,
  Headset,
  Briefcase,
  Target,
  Sparkles,
  Zap,
  Bot,
  Link as LinkIcon,
  LayoutTemplate,
  FileQuestion,
  LucideIcon,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import SupportModal from './SupportModal';

type MenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const RuralLayout: React.FC = () => {
  const { settings } = useSettings();
  const { profile, signOut, isImpersonating, loading } = useAuth();
  const niche = (profile?.organization as any)?.niche || 'rural';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { pathname } = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  const operationItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/rural' },
    { icon: MessageSquare, label: 'Mensagens', path: '/rural/whatsapp' },
    { icon: Mail, label: 'Email', path: '/rural/email' },
    { icon: Briefcase, label: 'Kanban', path: '/rural/kanban' },
    { icon: Users, label: 'CRM', path: '/rural/crm' },
  ];

  const assetItems: MenuItem[] = [
    { icon: Home, label: 'Imóveis Rurais', path: '/rural/properties' },
    { icon: MapIcon, label: 'Território Rural', path: '/rural/territorio' },
    { icon: DollarSign, label: 'Valuation CAR', path: '/rural/territorio/valuation' },
  ];

  const growthItems: MenuItem[] = [
    { icon: Target, label: 'Metas & Vendas', path: '/rural/financial' },
    { icon: Globe, label: 'Meu Site', path: '/rural/site' },
    { icon: Sparkles, label: 'Editor Visual', path: '/rural/visual-editor' },
    { icon: Settings, label: 'Configurar Site', path: '/rural/site-setup' },
    { icon: LayoutTemplate, label: 'Landing Pages', path: '/rural/landing-pages' },
    { icon: FileQuestion, label: 'Quiz', path: '/rural/quiz' },
    { icon: Zap, label: 'Matchmaking 360', path: '/rural/matchmaking' },
    { icon: Bot, label: 'Agentes IA', path: '/rural/ai-agents' },
    { icon: PieChart, label: 'Relatórios', path: '/rural/reports' },
  ];

  const systemItems: MenuItem[] = [
    { icon: LinkIcon, label: 'Conexões', path: '/rural/connections' },
    { icon: Settings, label: 'Configurações', path: '/rural/settings' },
  ];

  if (profile?.role === 'superadmin') {
    systemItems.push({
      icon: ShieldAlert,
      label: 'Super Admin',
      path: '/superadmin',
    });
  }

  const menuSections: MenuSection[] = [
    { title: 'Operação', items: operationItems },
    { title: 'Carteira Rural', items: assetItems },
    { title: 'Crescimento', items: growthItems },
    { title: 'Sistema', items: systemItems },
  ];

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!loading && profile?.role === 'superadmin' && !isImpersonating) {
    return <Navigate to="/superadmin" replace />;
  }

  const isMenuItemActive = (path: string, isActive: boolean) => {
    if (path === '/rural/territorio/valuation') return pathname === path;
    if (path === '/rural/territorio') {
      return pathname.startsWith('/rural/territorio') && pathname !== '/rural/territorio/valuation';
    }
    return isActive;
  };
  const isWorkspaceRoute = pathname.startsWith('/rural/whatsapp') || pathname.startsWith('/rural/email');

  const renderMenuItem = (item: MenuItem) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/rural'}
      onClick={() => setIsMobileMenuOpen(false)}
      className={({ isActive }) => {
        const active = isMenuItemActive(item.path, isActive);
        return `workspace-nav-item flex items-center justify-between group ${
          active
            ? 'workspace-nav-item-active'
            : ''
        }`;
      }}
    >
      {({ isActive }) => {
        const active = isMenuItemActive(item.path, isActive);

        return (
          <>
            <div className="flex items-center gap-3.5 min-w-0">
              <item.icon
                size={20}
                className={active ? 'text-primary shrink-0' : 'text-slate-400 group-hover:text-primary shrink-0'}
              />
              <span className="truncate">{item.label}</span>
            </div>
            {item.path !== '/rural' && (
              <ChevronRight
                size={14}
                className={active ? 'text-primary/70 shrink-0' : 'text-slate-300 group-hover:text-primary shrink-0'}
              />
            )}
          </>
        );
      }}
    </NavLink>
  );

  const renderSidebarContent = () => (
    <>
      <div className="px-6 py-5">
        <RouterLink
          to="/rural"
          className="flex items-center gap-3 group"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img
            src="/logo-imobfluow.svg"
            alt="ImobFluow"
            className="workspace-logo transition-transform group-hover:scale-[1.02]"
          />
        </RouterLink>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5 custom-scrollbar">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="workspace-section-title">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map(renderMenuItem)}
            </div>
          </div>
        ))}

        <button
          onClick={() => setIsSupportOpen(true)}
          className="workspace-nav-item flex items-center justify-between w-full group"
        >
          <div className="flex items-center gap-3.5">
            <Headset size={20} className="text-slate-400 group-hover:text-primary" />
            <span>Suporte</span>
          </div>
        </button>
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-xl border border-slate-200 bg-white">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold border border-primary/20">
            {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || 'R'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {profile?.full_name || profile?.name || 'Carregando...'}
            </p>
            {profile?.role === 'superadmin' ? (
              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-semibold uppercase tracking-wide rounded">
                SUPER ADMIN
              </span>
            ) : (
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide truncate">
                {profile?.role === 'admin' ? 'Admin Imobiliária' : loading ? '...' : profile?.role || 'Corretor'}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-600 text-xs font-semibold transition-all w-full p-2 rounded-lg hover:bg-red-50"
        >
          <LogOut size={14} /> Sair
        </button>
      </div>
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </>
  );

  return (
    <div className="workspace-shell flex h-screen h-dvh overflow-hidden selection:bg-primary/20 selection:text-primary">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="workspace-sidebar absolute left-0 top-0 bottom-0 text-slate-900 flex flex-col animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all z-50"
            >
              <X size={20} />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="workspace-sidebar text-slate-900 hidden md:flex flex-col shrink-0 overflow-hidden">
        {renderSidebarContent()}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={21} />
        </button>
        <div
          className={`flex-1 overflow-y-auto ${
            isWorkspaceRoute ? 'p-2 sm:p-3 md:p-4' : 'p-3 sm:p-4 md:p-6'
          }`}
        >
          <div className={isWorkspaceRoute ? 'w-full h-full min-h-0' : 'max-w-[1600px] mx-auto'}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default RuralLayout;
