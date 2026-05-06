import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { NavLink, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Home,
  Map as MapIcon,
  FileCheck,
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
  FileSearch,
  Zap,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import SupportModal from './SupportModal';

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

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/rural' },
    { icon: Users, label: 'Kanban', path: '/rural/crm' },
    { icon: Home, label: 'Imóveis Rurais', path: '/rural/properties' },
    { icon: MapIcon, label: 'Mapas & Georreferenciamento', path: '/rural/maps' },
    { icon: FileSearch, label: 'Dossiê 360', path: '/rural/dossie' },
    { icon: FileCheck, label: 'Documentação Rural', path: '/rural/due-diligence' },
    { icon: Target, label: 'Metas & Vendas', path: '/rural/financial' },
    { icon: Globe, label: 'Site & Landing Pages', path: '/rural/landing-pages' },
    { icon: Zap, label: 'Matchmaking 360', path: '/rural/matchmaking' },
    { icon: PieChart, label: 'Relatórios', path: '/rural/reports' },
    { icon: MessageSquare, label: 'Atendimento', path: '/rural/whatsapp' },
    { icon: Link, label: 'Conexões', path: '/rural/connections' },
    { icon: Settings, label: 'Configurações', path: '/rural/settings' },
  ];

  if (profile?.role === 'superadmin') {
    menuItems.push({
      icon: ShieldAlert,
      label: 'Super Admin',
      path: '/superadmin',
    });
  }

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!loading && profile?.role === 'superadmin' && !isImpersonating) {
    return <Navigate to="/superadmin" replace />;
  }

  const renderSidebarContent = () => (
    <>
      <div className="p-8 pb-6">
        <Link
          to="/rural"
          className="flex items-center gap-3 group"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-105">
            <Home className="text-white" size={22} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tighter leading-none">
              Imobi<span className="text-emerald-600">CRM</span>
            </h1>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-8 overflow-y-auto space-y-1 custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/rural'}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-5 py-3.5 rounded-xl transition-all duration-300 group ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30'
                  : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-4">
                  <item.icon
                    size={22}
                    className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}
                  />
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </div>
                {item.path !== '/rural' && (
                  <ChevronRight
                    size={14}
                    className={isActive ? 'text-white/80' : 'text-slate-300 group-hover:text-emerald-600'}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => setIsSupportOpen(true)}
          className="flex items-center justify-between w-full px-5 py-3.5 rounded-xl transition-all duration-300 group text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
        >
          <div className="flex items-center gap-4">
            <Headset size={22} className="text-slate-400 group-hover:text-emerald-600" />
            <span className="text-sm font-bold tracking-tight">Suporte</span>
          </div>
        </button>
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl border border-slate-200 bg-white">
          <div className="w-10 h-10 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600 font-bold border border-emerald-500/20 shadow-inner">
            {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || 'R'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {profile?.full_name || profile?.name || 'Carregando...'}
            </p>
            {profile?.role === 'superadmin' ? (
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-600/10 text-emerald-600 text-[9px] font-bold uppercase tracking-widest rounded">
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
    <div className="flex h-screen bg-[#07130a] overflow-hidden selection:bg-emerald-500/20 selection:text-emerald-400">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
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
      <aside className="w-66 bg-white border-r border-slate-200 text-slate-900 hidden md:flex flex-col shrink-0 overflow-hidden shadow-sm">
        {renderSidebarContent()}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-bg-primary">
        <header className="h-20 bg-bg-card/80 backdrop-blur-xl border-b border-border-subtle flex items-center justify-between px-8 z-10 gap-6 sticky top-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2.5 text-text-secondary hover:text-emerald-500 bg-bg-hover rounded-xl transition-colors"
          >
            <Menu size={22} />
          </button>

          <div className="relative flex-1 max-w-lg hidden sm:block group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-emerald-500 transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder={
                niche === 'hybrid' ? 'Buscar imóveis...' : 'Buscar fazendas...'
              }
              className="input-field pl-12 h-11"
            />
          </div>

          <div className="flex items-center gap-6">
            <Link
              to="/rural/properties/new"
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 shadow-lg shadow-emerald-900/20"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">
                {niche === 'hybrid' ? 'Novo Imóvel' : 'Nova Fazenda'}
              </span>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default RuralLayout;
