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

  const menuGroups = [
    {
      title: 'Painel & Análises',
      items: [
        { icon: Sparkles, label: 'Painel 360 ✨', path: '/urban/360' },
        {
          icon: LayoutDashboard,
          label: 'Dashboard Operacional',
          path: '/urban',
        },
        { icon: PieChart, label: 'Relatórios', path: '/urban/reports' },
      ],
    },
    {
      title: 'Gestão de Imóveis',
      items: [
        { icon: Home, label: 'Imóveis', path: '/urban/properties' },
        {
          icon: Building2,
          label: 'Empreendimentos',
          path: '/urban/empreendimentos',
        },
        { icon: Key, label: 'Locação & Administração', path: '/urban/locacao' },
      ],
    },
    {
      title: 'Negícios & Gestão',
      items: [
        {
          icon: ClipboardCheck,
          label: 'Compliance',
          path: '/urban/compliance',
        },
        {
          icon: DollarSign,
          label: 'Cobranças & Boletos',
          path: '/urban/cobranca',
        },
        {
          icon: Upload,
          label: 'Exportador Portais',
          path: '/urban/exportador',
        },
        { icon: FileText, label: 'Contratos', path: '/urban/contracts' },
      ],
    },
    {
      title: 'Portais & Captação',
      items: [
        {
          icon: Eye,
          label: 'Portal Proprietário',
          path: '/urban/portal-proprietario',
        },
        {
          icon: Heart,
          label: 'Portal Comprador',
          path: '/urban/portal-comprador',
        },
        {
          icon: LayoutTemplate,
          label: 'Landing Pages',
          path: '/urban/landing-pages',
        },
        { icon: Clock, label: 'Lista de Espera', path: '/urban/waitlist' },
        { icon: Sparkles, label: 'Site Express ✨', path: '/urban/site-setup' },
      ],
    },
    {
      title: 'Ferramentas & Setup',
      items: [
        { icon: Sparkles, label: 'IA Studio', path: '/urban/ai-assistant' },
        {
          icon: Eye,
          label: 'Editor Visual de Site',
          path: '/urban/visual-editor',
        },
        { icon: Settings, label: 'Configurações', path: '/urban/settings' },
      ],
    },
  ];

  if (profile?.role === 'superadmin') {
    menuGroups.push({
      title: 'Administração',
      items: [
        {
          icon: ShieldAlert,
          label: 'Super Admin',
          path: '/superadmin',
        },
      ],
    });
  }

  // Estado para os grupos abertos
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Expandir automaticamente o grupo que contém a rota atual
  useEffect(() => {
    const currentGroup = menuGroups.find((group) =>
      group.items.some(
        (item) =>
          (item.path === '/urban' && pathname === '/urban') ||
          (item.path !== '/urban' && pathname.startsWith(item.path))
      )
    );
    if (currentGroup && !openGroups.includes(currentGroup.title)) {
      setOpenGroups((prev) => [...prev, currentGroup.title]);
    }
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
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary-alpha-20 transition-transform group-hover:scale-105">
                <Building2 className="text-white" size={22} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-bold text-text-primary tracking-tight leading-none">
                  IMOBZY <span className="text-primary">Urbano</span>
                </h1>
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-1 block">
                  Painel Urbano
                </span>
              </div>
            </>
          )}
        </Link>
        <a
          href={`/site/${(profile?.organization as any)?.slug || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 w-full border border-border text-text-secondary hover:text-primary hover:border-primary py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all bg-bg-input"
        >
          <Globe size={14} /> Visualizar Site
        </a>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-8 custom-scrollbar">
        {menuGroups.map((group) => {
          const isOpen = openGroups.includes(group.title);

          return (
            <div key={group.title}>
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between w-full px-3 mb-3 text-text-tertiary hover:text-text-secondary transition-colors group"
              >
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-70">
                  {group.title}
                </h3>
                <div className="p-1 rounded-md bg-bg-hover/50 opacity-60 group-hover:opacity-100 transition-opacity">
                  {isOpen ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </div>
              </button>

              <div className={`space-y-1 ${isOpen ? 'block' : 'hidden'}`}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/urban'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                        isActive
                          ? 'bg-primary-alpha-10 text-primary font-bold shadow-sm'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={18}
                          strokeWidth={2}
                          className={isActive ? 'text-brand' : ''}
                        />
                        <span className="text-sm font-medium">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-subtle bg-bg-hover/50 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl border border-transparent hover:border-border transition-colors">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner">
            {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">
              {profile?.full_name || profile?.name || 'Carregando...'}
            </p>
            {profile?.role === 'superadmin' ? (
              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-widest rounded">
                SUPER ADMIN
              </span>
            ) : (
              <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wide truncate">
                {profile?.role === 'admin' ? 'Admin Imobiliária' : loading ? '...' : profile?.role || 'Corretor'}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsSupportOpen(true)}
          className="w-full flex items-center gap-2 text-text-tertiary hover:text-primary text-xs font-bold transition-all p-2 rounded-lg hover:bg-primary/5 mb-1"
        >
          <LifeBuoy size={14} />
          <span>Suporte Imobzy</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-text-tertiary hover:text-text-primary text-xs font-bold transition-all w-full p-2 rounded-lg hover:bg-bg-card"
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
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-bg-card text-text-primary flex flex-col animate-in slide-in-from-left duration-300 border-r border-subtle">
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
      <aside className="w-64 bg-bg-card border-r border-subtle text-text-primary hidden md:flex flex-col shrink-0">
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
