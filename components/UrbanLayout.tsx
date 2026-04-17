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
  ChevronRight
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
        { icon: LayoutDashboard, label: 'Dashboard', path: '/urban' },
        { icon: PieChart, label: 'Relatórios', path: '/urban/reports' },
      ],
    },
    {
      title: 'Gestão de Imóveis',
      items: [
        { icon: Home, label: 'Imóveis', path: '/urban/properties' },
        { icon: Building2, label: 'Empreendimentos', path: '/urban/empreendimentos' },
        { icon: Key, label: 'Locação & Administração', path: '/urban/locacao' },
      ],
    },
    {
      title: 'Negócios & Gestão',
      items: [
        { icon: ClipboardCheck, label: 'Compliance', path: '/urban/compliance' },
        { icon: Upload, label: 'Exportador Portais', path: '/urban/exportador' },
        { icon: FileText, label: 'Contratos', path: '/urban/contracts' },
      ],
    },
    {
      title: 'Comercial & CRM',
      items: [
        { icon: Users, label: 'Leads & CRM', path: '/urban/crm' },
        { icon: Phone, label: 'Mensagens', path: '/urban/chat' },
        { icon: Settings, label: 'Conexões WhatsApp', path: '/urban/whatsapp-instances' },
      ],
    },
    {
      title: 'Portais & Captação',
      items: [
        { icon: Eye, label: 'Portal Proprietário', path: '/urban/portal-proprietario' },
        { icon: Heart, label: 'Portal Comprador', path: '/urban/portal-comprador' },
        { icon: LayoutTemplate, label: 'Landing Pages', path: '/urban/landing-pages' },
        { icon: Sparkles, label: 'Site Express ✨', path: '/urban/site-setup' },
      ],
    },
    {
      title: 'Ferramentas & Setup',
      items: [
        { icon: Sparkles, label: 'IA Studio', path: '/urban/ai-assistant' },
        { icon: Eye, label: 'Editor Visual de Site', path: '/urban/visual-editor' },
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
        }
      ]
    });
  }

  // Estado para os grupos abertos
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Expandir automaticamente o grupo que contém a rota atual
  useEffect(() => {
    const currentGroup = menuGroups.find(group => 
      group.items.some(item => 
        (item.path === '/urban' && pathname === '/urban') ||
        (item.path !== '/urban' && pathname.startsWith(item.path))
      )
    );
    if (currentGroup && !openGroups.includes(currentGroup.title)) {
      setOpenGroups(prev => [...prev, currentGroup.title]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const { hasFeature } = usePlans();

  const renderSidebarContent = () => (
    <>
      <div className="p-6 md:p-8 border-b border-white/5">
        <Link
          to="/"
          className="flex items-center gap-3"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-10 md:h-12 w-auto object-contain max-w-[160px]"
            />
          ) : (
            <>
              <div className="p-2 rounded-xl bg-blue-700">
                <Building2 className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">
                  PAINEL
                </span>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.3em]">
                  Tradicional
                </span>
              </div>
            </>
          )}
        </Link>
        <a
          href={`/site/${(profile?.organization as any)?.slug || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 md:mt-6 flex items-center justify-center gap-2 w-full bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-blue-500/30"
        >
          <Globe size={14} /> Visualizar Site
        </a>
      </div>

      <nav className="flex-1 p-3 md:p-4 overflow-y-auto space-y-4">
        {menuGroups.map((group) => {
          const isOpen = openGroups.includes(group.title);
          
          return (
            <div key={group.title} className="flex flex-col">
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between px-3 py-2 text-white/50 hover:text-white transition-colors group mb-1"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {group.title}
                </span>
                {isOpen ? (
                  <ChevronDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              
              <div
                className={`flex-col space-y-1 transition-all overflow-hidden ${
                  isOpen ? 'flex' : 'hidden'
                }`}
              >
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/urban'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-blue-900/40 text-white shadow-sm'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive ? { borderLeft: '3px solid #2563eb' } : { borderLeft: '3px solid transparent' }
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={18}
                          className={isActive ? 'text-blue-400' : 'text-white/50'}
                        />
                        <span className="font-semibold text-sm">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 md:p-6 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 mb-3 md:mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-black text-sm">
            {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-white">
              {profile?.full_name || profile?.name || 'Carregando...'}
            </p>
            {profile?.role === 'superadmin' ? (
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-sm">
                SUPER ADMIN
              </span>
            ) : (
              <p className="text-[10px] text-white/40 uppercase tracking-widest">
                {profile?.role === 'admin'
                  ? 'Admin Imobiliária'
                  : loading
                    ? '...'
                    : profile?.role || 'Corretor'}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsSupportOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 mb-1 text-blue-400/80 hover:text-blue-400 hover:bg-blue-900/20 rounded-xl transition-all group border border-blue-900/30"
        >
          <LifeBuoy size={18} />
          <span className="text-xs font-black uppercase tracking-widest">
            Suporte Imobzy
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
        >
          <LogOut size={18} className="opacity-60 group-hover:opacity-100" />
          <span className="text-xs font-black uppercase tracking-widest">
            Sair
          </span>
        </button>
      </div>
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </>
  );

  return (
    <div
      className="flex h-screen bg-slate-50 overflow-hidden"
      style={{ fontFamily: '"Poppins", sans-serif', fontSize: '16px' }}
    >
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0a0a0a] text-white flex flex-col animate-in slide-in-from-left duration-300">
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

      {/* Desktop Sidebar — Blue Theme */}
      <aside className="w-68 bg-[#0a0a0a] text-white flex-col hidden md:flex transition-all">
        {renderSidebarContent()}
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-10 shadow-sm z-10 gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all"
          >
            <Menu size={22} />
          </button>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Pesquisar imóveis, clientes..."
              className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            <div className="hidden lg:flex flex-col text-right mr-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                VGV Ativo
              </span>
              <span className="text-sm font-black text-blue-600">
                R$ 24.800.000
              </span>
            </div>

            <Link
              to="/urban/properties/new"
              className="flex items-center gap-2 text-white px-3 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider transition-all shadow-lg hover:brightness-110 active:scale-95 bg-blue-700 hover:bg-blue-600"
            >
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Novo Imóvel</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-slate-50/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default UrbanLayout;
