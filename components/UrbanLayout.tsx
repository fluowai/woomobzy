import React, { useState, useEffect } from 'react';
import { NavLink, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Users,
  FileText,
  LogOut,
  Search,
  PlusCircle,
  Sparkles,
  PieChart,
  Globe,
  Settings,
  Menu,
  X,
  Phone,
  ShieldAlert,
  Building2,
  Key,
  ClipboardCheck,
  Upload,
  Eye,
  Heart,
  LayoutTemplate,
  LifeBuoy,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Map as MapIcon,
  Headset,
  MessageSquare,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { usePlans } from '../context/PlansContext';
import SupportModal from './SupportModal';

interface LayoutProps {}

const UrbanLayout: React.FC<LayoutProps> = () => {
  const { settings } = useSettings();
  const { profile, signOut, stopImpersonation, isImpersonating, loading } =
    useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { pathname } = useLocation();

  // Guard: Super Admin can ONLY see this if impersonating
  if (!loading && profile?.role === 'superadmin' && !isImpersonating) {
    console.log(
      '🛡️ [UrbanLayout] Guard triggered. Redirecting Super Admin to /superadmin'
    );
    return <Navigate to="/superadmin" replace />;
  }

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/urban' },
    { icon: MessageSquare, label: 'Central de Atendimento', path: '/urban/chat' },
    { icon: Users, label: 'Leads & CRM', path: '/urban/crm' },
    { icon: Building2, label: 'Imóveis Urbanos', path: '/urban/properties' },
    { icon: Key, label: 'Locação', path: '/urban/locacao' },
    { icon: Building2, label: 'Lançamentos', path: '/urban/empreendimentos' },
    { icon: MapIcon, label: 'Loteamentos', path: '/urban/loteamentos' },
    { icon: LayoutTemplate, label: 'Site & Landing Pages', path: '/urban/landing-pages' },
    { icon: DollarSign, label: 'Financeiro', path: '/urban/cobranca' },
    { icon: PieChart, label: 'Relatórios', path: '/urban/reports' },
    { icon: Settings, label: 'Configurações', path: '/urban/settings' },
  ];

  if (profile?.role === 'superadmin') {
    menuItems.push({
      icon: ShieldAlert,
      label: 'Super Admin',
      path: '/superadmin',
    });
  }

  // Estado para os grupos abertos
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Expandir automaticamente o grupo que contém a rota atual
  useEffect(() => {
    const currentItem = menuItems.find(
      (item) =>
        (item.path === '/urban' && pathname === '/urban') ||
        (item.path !== '/urban' && pathname.startsWith(item.path))
    );
    // No need for openGroups anymore as it's a linear menu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const { hasFeature } = usePlans();

  const renderSidebarContent = () => (
    <>
      <div className="p-6 md:p-8 border-b border-border-subtle">
        <Link
          to="/"
          className="flex items-center gap-3 group"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-10 md:h-12 w-auto object-contain max-w-[160px] transition-transform group-hover:scale-105"
            />
          ) : (
            <>
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
                    <Home className="text-white" size={22} />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-xl font-extrabold text-white tracking-tighter leading-none">
                      Imobi<span className="text-blue-400">CRM</span>
                    </h1>
                  </div>
            </>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-4 py-8 overflow-y-auto space-y-1 custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/urban'}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-5 py-4 rounded-xl transition-all duration-300 group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-900/20'
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
                {item.path !== '/urban' && <ChevronRight size={14} className={isActive ? 'text-white/80' : 'text-gray-600 group-hover:text-white'} />}
              </>
            )}
          </NavLink>
        ))}

        {/* Support & Gear items as seen in image */}
        <button
          onClick={() => setIsSupportOpen(true)}
          className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl transition-all duration-300 group text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <div className="flex items-center gap-4">
            <Headset size={22} className="text-gray-400 group-hover:text-white" />
            <span className="text-sm font-semibold tracking-tight">Suporte</span>
          </div>
        </button>
      </nav>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl border border-white/5 bg-white/5">
          <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20 shadow-inner">
            {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {profile?.full_name || profile?.name || 'Carregando...'}
            </p>
            {profile?.role === 'superadmin' ? (
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[9px] font-bold uppercase tracking-widest rounded">
                SUPER ADMIN
              </span>
            ) : (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate">
                {profile?.role === 'admin' ? 'Admin Imobiliária' : loading ? '...' : profile?.role || 'Corretor'}
              </p>
            )}
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
    <div className="flex h-screen bg-bg-primary overflow-hidden selection:bg-brand/20 selection:text-brand">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0a192f] text-white flex flex-col animate-in slide-in-from-left duration-300 border-r border-white/5">
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
      <aside className="w-66 bg-gradient-to-b from-[#0a192f] to-[#040c18] border-r border-white/5 text-white hidden md:flex flex-col shrink-0 overflow-hidden shadow-2xl">
        {renderSidebarContent()}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-20 bg-bg-card/80 backdrop-blur-xl border-b border-border-subtle flex items-center justify-between px-8 z-10 gap-6 sticky top-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2.5 text-text-secondary hover:text-primary bg-bg-hover rounded-xl transition-colors"
          >
            <Menu size={22} />
          </button>

          <div className="relative flex-1 max-w-lg hidden sm:block group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar imóveis..."
              className="input-field pl-12 h-11"
            />
          </div>

          <div className="flex items-center gap-6">
            <Link to="/urban/properties/new" className="btn btn-primary h-11 px-6 shadow-lg shadow-primary-alpha-20">
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Novo Imóvel</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default UrbanLayout;
