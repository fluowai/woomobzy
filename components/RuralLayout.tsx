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
  Shield,
  ShieldAlert,
  DollarSign,
  Headset,
  Briefcase,
  Search,
  Plus,
  Target,
  Zap,
  Bot,
  Link as LinkIcon,
  LayoutTemplate,
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
  ];

  const growthItems: MenuItem[] = [
    { icon: Target, label: 'Metas & Vendas', path: '/rural/financial' },
    { icon: Globe, label: 'Meu Site', path: '/rural/site' },
    { icon: LayoutTemplate, label: 'Landing Pages', path: '/rural/landing-pages' },
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

  const isMenuItemActive = (path: string, isActive: boolean) =>
    isActive || (path === '/rural/territorio' && pathname.startsWith('/rural/territorio'));

  const renderMenuItem = (item: MenuItem) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/rural'}
      onClick={() => setIsMobileMenuOpen(false)}
      className={({ isActive }) => {
        const active = isMenuItemActive(item.path, isActive);
        return `flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
          active
            ? 'bg-primary text-white font-bold shadow-lg shadow-primary/25'
            : 'text-slate-500 hover:bg-primary/10 hover:text-primary'
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
                className={active ? 'text-white shrink-0' : 'text-slate-400 group-hover:text-primary shrink-0'}
              />
              <span className="text-sm font-bold tracking-tight truncate">{item.label}</span>
            </div>
            {item.path !== '/rural' && (
              <ChevronRight
                size={14}
                className={active ? 'text-white/80 shrink-0' : 'text-slate-300 group-hover:text-primary shrink-0'}
              />
            )}
          </>
        );
      }}
    </NavLink>
  );

  const renderSidebarContent = () => (
    <>
      <div className="p-8 pb-6">
        <RouterLink
          to="/rural"
          className="flex items-center gap-3 group"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img
            src="/logo-imobzy-360.svg"
            alt="ImobFluow"
            className="h-12 w-auto object-contain max-w-[150px] transition-transform group-hover:scale-105"
          />
        </RouterLink>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6 custom-scrollbar">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map(renderMenuItem)}
            </div>
          </div>
        ))}

        <button
          onClick={() => setIsSupportOpen(true)}
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-300 group text-slate-500 hover:bg-primary/10 hover:text-primary"
        >
          <div className="flex items-center gap-3.5">
            <Headset size={20} className="text-slate-400 group-hover:text-primary" />
            <span className="text-sm font-bold tracking-tight">Suporte</span>
          </div>
        </button>
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl border border-slate-200 bg-white">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner">
            {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || 'R'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {profile?.full_name || profile?.name || 'Carregando...'}
            </p>
            {profile?.role === 'superadmin' ? (
              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-widest rounded">
                SUPER ADMIN
              </span>
            ) : (
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide truncate">
                {profile?.role === 'admin' ? 'Admin Imobiliária' : loading ? '...' : profile?.role || 'Corretor'}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-600 text-xs font-bold transition-all w-full p-2 rounded-lg hover:bg-red-50"
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
    <div className="flex h-screen h-dvh bg-bg-primary overflow-hidden selection:bg-primary/20 selection:text-primary">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white text-slate-900 flex flex-col animate-in slide-in-from-left duration-300 border-r border-slate-200">
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
      <aside className="w-64 bg-white border-r border-slate-200 text-slate-900 hidden md:flex flex-col shrink-0 overflow-hidden shadow-sm">
        {renderSidebarContent()}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-bg-primary">
        <header className="h-16 md:h-20 bg-bg-card/80 backdrop-blur-xl border-b border-border-subtle flex items-center justify-between px-4 md:px-8 z-10 gap-3 md:gap-6 sticky top-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2.5 text-text-secondary hover:text-primary bg-bg-hover rounded-xl transition-colors"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Imobiliaria Rural</span>
              <h2 className="text-lg font-black text-slate-900 leading-none">ImobFluow</h2>
            </div>
          </div>

          <div className="relative flex-1 max-w-lg hidden lg:block group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar fazendas..."
              className="input-field pl-12 h-11"
            />
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <RouterLink
              to="/rural/properties/new"
              className="btn bg-primary hover:bg-primary-hover text-white h-10 md:h-11 px-3 md:px-6 shadow-lg shadow-primary/20"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nova Fazenda</span>
            </RouterLink>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-bg-primary">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default RuralLayout;
