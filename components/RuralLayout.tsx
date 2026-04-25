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
  ShieldAlert,
  DollarSign,
  Headset,
  Briefcase,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import SupportModal from './SupportModal';

const RuralLayout: React.FC = () => {
  const { settings } = useSettings();
  const { profile, signOut, isImpersonating, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { pathname } = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/rural' },
    { icon: MessageSquare, label: 'Central de Atendimento', path: '/rural/chat' },
    { icon: Users, label: 'Leads & CRM', path: '/rural/crm' },
    { icon: Home, label: 'Imóveis Rurais', path: '/rural/properties' },
    { icon: MapIcon, label: 'Mapas & Georreferenciamento', path: '/rural/maps' },
    { icon: FileCheck, label: 'Documentação Rural', path: '/rural/due-diligence' },
    { icon: DollarSign, label: 'Financeiro', path: '/rural/financial' },
    { icon: Globe, label: 'Site & Landing Pages', path: '/rural/landing-pages' },
    { icon: Briefcase, label: 'Financeiro', path: '/rural/financeiro-advanced' },
    { icon: PieChart, label: 'Relatórios', path: '/rural/reports' },
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
            <h1 className="text-xl font-extrabold text-white tracking-tighter leading-none">
              Imobi<span className="text-emerald-400">CRM</span>
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
              `flex items-center justify-between px-5 py-4 rounded-xl transition-all duration-300 group ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold shadow-lg shadow-emerald-900/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-4">
                  <item.icon
                    size={22}
                    className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}
                  />
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </div>
                {item.path !== '/rural' && (
                  <ChevronRight
                    size={14}
                    className={isActive ? 'text-white/80' : 'text-gray-600 group-hover:text-white'}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => setIsSupportOpen(true)}
          className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl transition-all duration-300 group text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <div className="flex items-center gap-4">
            <Headset size={22} className="text-gray-400 group-hover:text-white" />
            <span className="text-sm font-bold tracking-tight">Suporte</span>
          </div>
        </button>
      </nav>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl border border-white/5 bg-white/5">
          <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20 shadow-inner">
            {profile?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {profile?.name || 'Usuário'}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate">
              Rural Master
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-xs font-bold transition-all w-full p-2 rounded-lg hover:bg-white/5"
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
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0a1f12] text-white flex flex-col animate-in slide-in-from-left duration-300 border-r border-white/5">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all z-50"
            >
              <X size={20} />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-66 bg-gradient-to-b from-[#0a1f12] to-[#040d07] border-r border-white/5 text-white hidden lg:flex flex-col shrink-0 overflow-hidden shadow-2xl">
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
              placeholder="Buscar fazendas..."
              className="input-field pl-12 h-11"
            />
          </div>

          <div className="flex items-center gap-6">
            <Link
              to="/rural/properties/new"
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 shadow-lg shadow-emerald-900/20"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nova Fazenda</span>
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
