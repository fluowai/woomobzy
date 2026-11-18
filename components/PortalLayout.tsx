import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Home,
  FileText,
  DollarSign,
  Heart,
  Clock,
  User,
  Menu,
  X,
  Bell,
  ChevronDown,
  LogOut,
  Search,
  Building2,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import WooTechLogo from '@/components/WooTechLogo';

interface PortalNavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const PortalLayout: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const pathname = location.pathname;

  // Determinar o tipo de portal pela rota atual
  const isProprietario = pathname.includes('proprietario');
  const isComprador = pathname.includes('comprador');
  const isLocatario = pathname.includes('locatario');
  const isPending = pathname.includes('acesso-pendente');

  const portalTitle = isProprietario
    ? 'Portal do proprietário'
    : isComprador
    ? 'Portal do comprador'
    : isLocatario
    ? 'Portal do locatário'
    : isPending
    ? 'Seu acesso'
    : 'Portal do cliente';

  const navItems: PortalNavItem[] = isProprietario
    ? [
        { id: 'properties', label: 'Meus imóveis', path: '/portal-proprietario', icon: Home, exact: true },
        { id: 'docs', label: 'Documentos e contratos', path: '/portal-proprietario?tab=docs', icon: FileText },
        { id: 'repasses', label: 'Repasses', path: '/portal-proprietario?tab=financeiro', icon: DollarSign },
      ]
    : isComprador
    ? [
        { id: 'explore', label: 'Explorar imóveis', path: '/portal-comprador', icon: Home, exact: true },
        { id: 'favorites', label: 'Favoritos', path: '/portal-comprador?tab=favoritos', icon: Heart },
        { id: 'proposals', label: 'Propostas', path: '/portal-comprador?tab=propostas', icon: FileText },
      ]
    : isLocatario
    ? [
        { id: 'contracts', label: 'Meus contratos', path: '/portal-locatario', icon: FileText, exact: true },
        { id: 'boletos', label: 'Boletos e PIX', path: '/portal-locatario?tab=boletos', icon: DollarSign },
        { id: 'history', label: 'Histórico de pagamentos', path: '/portal-locatario?tab=historico', icon: Clock },
      ]
    : [
        { id: 'account', label: 'Acesso à conta', path: '/acesso-pendente', icon: User, exact: true },
      ];

  const displayName =
    profile?.full_name ||
    (profile as any)?.name ||
    user?.email?.split('@')[0] ||
    'Cliente';

  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0].toUpperCase())
    .join('') || 'US';

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      window.location.href = '/login';
    }
  };

  const isItemActive = (item: PortalNavItem) => {
    if (item.exact) {
      return pathname === item.path.split('?')[0];
    }
    return pathname.startsWith(item.path.split('?')[0]);
  };

  return (
    <div className="flex h-screen flex-col bg-[#FFFFFF] font-sans antialiased text-[#182230]">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#E5E7EB] bg-white px-4 lg:px-6">
        {/* Left: Brand + Portal Name */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#526071] hover:bg-gray-50 md:hidden"
            aria-label="Abrir menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="flex items-center gap-2">
            <WooTechLogo variant="light" subtitle="crm" size="sm" />
          </Link>

          <div className="hidden sm:flex items-center h-5 w-px bg-[#E5E7EB] mx-1" />

          <span className="hidden sm:inline-block text-sm font-semibold text-[#182230]">
            {portalTitle}
          </span>
        </div>

        {/* Center: Search input */}
        <div className="hidden md:flex items-center max-w-sm w-full mx-4">
          <div className="relative w-full">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526071]"
            />
            <input
              type="text"
              placeholder="Buscar no portal..."
              className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] pl-9 pr-3 text-xs font-medium text-[#182230] placeholder:text-[#526071] focus:border-[#FF6A00] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF6A00]/20 transition"
            />
          </div>
        </div>

        {/* Right: Notifications & User dropdown */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] text-xs font-medium text-[#526071]">
            <Building2 size={13} className="text-[#FF6A00]" />
            <span>Urbano</span>
          </div>

          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#526071] hover:bg-gray-50 hover:text-[#182230] transition cursor-pointer"
            aria-label="Notificações"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FF6A00]" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 rounded-full border border-[#E5E7EB] p-1 pr-2.5 hover:border-gray-300 transition cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6A00] text-xs font-bold text-white">
                {userInitials}
              </div>
              <span className="text-xs font-semibold text-[#182230] hidden md:inline max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown size={14} className="text-[#526071]" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-lg z-50 text-xs">
                <div className="px-3 py-2 border-b border-[#E5E7EB] mb-1">
                  <p className="font-bold text-[#182230] truncate">{displayName}</p>
                  <p className="text-[11px] text-[#526071] truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <LogOut size={14} /> Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body: Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-60 flex-col border-r border-[#E5E7EB] bg-white p-3 space-y-1 shrink-0 select-none">
          {navItems.map((item) => {
            const active = isItemActive(item);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-orange-50/70 text-[#FF6A00]'
                    : 'text-[#526071] hover:bg-gray-50 hover:text-[#182230]'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#FF6A00]" />
                )}
                <Icon size={18} className={active ? 'text-[#FF6A00]' : 'text-[#526071]'} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </aside>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/40" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4 space-y-2 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <span className="text-sm font-bold text-[#182230]">{portalTitle}</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
              <div className="pt-2 space-y-1">
                {navItems.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                        active ? 'bg-orange-50 text-[#FF6A00]' : 'text-[#526071]'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;

