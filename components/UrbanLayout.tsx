import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { NavLink, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Briefcase,
  Calendar,
  Home,
  Building2,
  PieChart,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  TrendingUp,
  Headset,
  ArrowRight,
  ShieldAlert,
  Landmark,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SupportModal from './SupportModal';
import WooTechLogo from './WooTechLogo';
import WorkspaceTopBar from './WorkspaceTopBar';

const UrbanLayout: React.FC = () => {
  const { profile, signOut, isImpersonating, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { pathname } = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      logger.error('UrbanLayout logout error:', error);
    }
  };

  const navMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/urban', exact: true },
    { icon: MessageSquare, label: 'Atendimento', path: '/urban/whatsapp' },
    { icon: Users, label: 'Leads', path: '/urban/crm' },
    { icon: Briefcase, label: 'Funil / CRM', path: '/urban/kanban' },
    { icon: Calendar, label: 'Minha Agenda', path: '/urban/agenda' },
    { icon: Home, label: 'Imóveis', path: '/urban/properties' },
    { icon: Building2, label: 'Locação', path: '/urban/locacao' },
    { icon: Landmark, label: 'Fintech', path: '/urban/fintech' },
    { icon: Trophy, label: 'Clube', path: '/urban/clube' },
    { icon: PieChart, label: 'Relatórios', path: '/urban/reports' },
    { icon: Settings, label: 'Configurações', path: '/urban/settings' },
  ];

  if (profile?.role === 'superadmin') {
    const isMegaAdmin = !profile?.organization?.is_reseller;
    navMenuItems.push({
      icon: ShieldAlert,
      label: isMegaAdmin ? 'Mega Admin' : 'Super Admin',
      path: isMegaAdmin ? '/megaadmin' : '/superadmin',
    });
  }

  const isMenuItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

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

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0b0e14] border-r border-white/5 select-none">
      {/* Top Logo */}
      <div className="px-5 py-6">
        <Link to="/urban" className="block transition hover:opacity-90">
          <WooTechLogo variant="dark" subtitle="crm" size="sm" />
        </Link>
      </div>

      {/* User Profile snippet (Exact match to Image 3 & 4) */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#12151e] p-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#ff5500] to-[#ff7a00] text-xs font-black text-white shadow-md shadow-orange-500/20">
              {userInitials}
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-white truncate">
                {displayName}
              </p>
              <p className="text-[10px] font-medium text-zinc-500 truncate">
                Gestor • Urbano
              </p>
            </div>
          </div>
          <ChevronDown size={14} className="text-zinc-500 shrink-0" />
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isMenuItemActive(item.path, item.exact);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                active
                  ? 'bg-gradient-to-r from-[#ff5500] to-[#ff7a00] text-white shadow-lg shadow-orange-500/25'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} className={active ? 'text-white' : 'text-zinc-400'} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Promo Support Card */}
      <div className="p-4 space-y-3">
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-[#1c130b] via-[#151720] to-[#0e1118] p-4 text-left shadow-lg">
          <div className="flex items-center gap-2 text-[#ff6a00]">
            <TrendingUp size={16} />
            <h4 className="text-xs font-bold text-white">Seu negócio mais forte!</h4>
          </div>
          <p className="mt-1 text-[11px] font-medium text-zinc-400 leading-snug">
            Conte com a Wootech para crescer ainda mais.
          </p>
          <button
            onClick={() => setIsSupportOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#ff6a00] py-2 text-[11px] font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#ff7a1a] transition cursor-pointer"
          >
            Falar com suporte <ArrowRight size={13} />
          </button>
        </div>

        {/* Sair do Sistema */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
        >
          <LogOut size={16} /> Sair do Sistema
        </button>
      </div>

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#090b0e] text-white">
      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 text-white z-50">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-full">
        {renderSidebarContent()}
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <WorkspaceTopBar currentSection="Dashboard Urbano" />

        {/* Mobile menu trigger */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#12151e] text-zinc-300 md:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="mx-auto max-w-[1520px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default UrbanLayout;
