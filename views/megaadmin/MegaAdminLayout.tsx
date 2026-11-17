import React, { useState } from 'react';
import { Outlet, useNavigate, NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Activity,
  DollarSign,
  ToggleRight,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  Database,
  UploadCloud,
  HardDrive,
  ShieldAlert,
  Plug,
  Bot,
  Crown,
  ChevronDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import WooTechLogo from '../../components/WooTechLogo';
import WorkspaceTopBar from '../../components/WorkspaceTopBar';

const MegaAdminLayout: React.FC = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/megaadmin' },
    { icon: Building2, label: 'Resellers', path: '/megaadmin/resellers' },
    {
      icon: Building2,
      label: 'Clientes Diretos',
      path: '/megaadmin/direct-clients',
    },
    { icon: BarChart3, label: 'Analytics', path: '/megaadmin/analytics' },
    { icon: Activity, label: 'Monitoring', path: '/megaadmin/monitoring' },
    { icon: Bot, label: 'AI Gateway (Tokens)', path: '/megaadmin/ai-credits' },
    { icon: DollarSign, label: 'Billing', path: '/megaadmin/billing' },
    { icon: Plug, label: 'Conexões WA', path: '/megaadmin/connections' },
    {
      icon: ToggleRight,
      label: 'Feature Flags',
      path: '/megaadmin/feature-flags',
    },
    { icon: ScrollText, label: 'Audit Log', path: '/megaadmin/audit-log' },
    { icon: UploadCloud, label: 'Importador', path: '/megaadmin/importer' },
    {
      icon: Database,
      label: 'Migração FluowAI',
      path: '/megaadmin/fluowai-migration',
    },
    {
      icon: HardDrive,
      label: 'Storage',
      path: '/megaadmin/storage-intelligence',
    },
    { icon: Settings, label: 'Configurações', path: '/megaadmin/settings' },
  ];

  if (profile?.role !== 'superadmin' || profile?.organization?.is_reseller) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#090b0e] text-white p-4">
        <ShieldAlert size={64} className="mb-4 text-rose-500" />
        <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
        <p className="mb-6 text-zinc-400">Apenas o Mega Admin do sistema pode acessar.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-[#ff6a00] text-white font-bold rounded-xl hover:bg-[#ff7a1a]"
        >
          Voltar
        </button>
      </div>
    );
  }

  const displayName =
    profile?.full_name ||
    (profile as any)?.name ||
    'Paulo Argolo';

  const userInitials =
    displayName
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PA';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#090b0e] text-white">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#0b0e14] border-r border-white/5 transition-transform duration-200 ease-in-out shrink-0 flex flex-col h-full
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        {/* Top Logo */}
        <div className="px-5 py-6">
          <Link to="/megaadmin" className="block transition hover:opacity-90">
            <WooTechLogo variant="dark" subtitle="crm" size="sm" />
          </Link>
        </div>

        {/* User Snippet */}
        <div className="px-4 mb-3">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#12151e] p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#ff5500] to-[#ff7a00] text-xs font-black text-white shadow-md shadow-orange-500/20">
                {userInitials}
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-white truncate">
                  {displayName}
                </p>
                <p className="text-[10px] font-medium text-amber-400 truncate">
                  Administrador • Mega
                </p>
              </div>
            </div>
            <ChevronDown size={14} className="text-zinc-500 shrink-0" />
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/megaadmin'}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `
                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-[#ff5500] to-[#ff7a00] text-white shadow-lg shadow-orange-500/25'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon size={18} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Promo and Logout at bottom */}
        <div className="p-4 space-y-3">
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#1e170c] via-[#151720] to-[#0e1118] p-3.5 text-left shadow-lg">
            <div className="flex items-center gap-2 text-amber-400">
              <Crown size={15} />
              <h4 className="text-xs font-bold text-white">Mega Admin Master</h4>
            </div>
            <p className="mt-1 text-[11px] font-medium text-zinc-400 leading-snug">
              Visão geral de todos os tenants, faturamento e ecossistema.
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
          >
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <WorkspaceTopBar currentSection="Mega Admin" />

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#12151e] text-zinc-300 md:hidden"
        >
          <Menu size={20} />
        </button>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="mx-auto max-w-[1520px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MegaAdminLayout;
