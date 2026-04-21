import React, { useState, useEffect } from 'react';
import { NavLink, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PieChart,
  Users,
  MessageSquare,
  Share2,
  Home,
  Database,
  Map as MapIcon,
  ShieldCheck,
  FolderOpen,
  FileText,
  Globe,
  UserCheck,
  Sparkles,
  Eye,
  Settings,
  Search,
  Plus,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  Clock3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const RuralLayout: React.FC = () => {
  const { profile, signOut, isImpersonating, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Navigation Structure as requested
  const menuGroups = [
    {
      title: 'VISÃO GERAL',
      items: [
        { icon: Sparkles, label: 'Painel 360 ✨', path: '/rural/360' },
        {
          icon: LayoutDashboard,
          label: 'Dashboard Operacional',
          path: '/rural',
        },
        { icon: PieChart, label: 'BI & Relatórios', path: '/rural/reports' },
      ],
    },
    {
      title: 'COMERCIAL',
      items: [
        { icon: Users, label: 'Leads & CRM', path: '/rural/crm' },
        { icon: MessageSquare, label: 'Mensagens', path: '/rural/chat' },
        {
          icon: Share2,
          label: 'Conexões WhatsApp',
          path: '/rural/whatsapp-instances',
        },
      ],
    },
    {
      title: 'IMÓVEIS',
      items: [
        { icon: Home, label: 'Fazendas & Imóveis', path: '/rural/properties' },
        {
          icon: Database,
          label: 'Cadastro Técnico',
          path: '/rural/cadastro-tecnico',
        },
        {
          icon: MapIcon,
          label: 'Geointeligência',
          path: '/rural/geointeligencia',
        },
      ],
    },
    {
      title: 'NEGÓCIOS',
      items: [
        {
          icon: ShieldCheck,
          label: 'Due Diligence',
          path: '/rural/due-diligence',
        },
        { icon: FolderOpen, label: 'Data Room', path: '/rural/dataroom' },
        { icon: FileText, label: 'Contratos', path: '/rural/contracts' },
      ],
    },
    {
      title: 'CAPTAÇÃO',
      items: [
        { icon: Globe, label: 'Landing Pages', path: '/rural/landing-pages' },
        { icon: Clock3, label: 'Lista de Espera', path: '/rural/waitlist' },
        {
          icon: UserCheck,
          label: 'Portal Comprador',
          path: '/rural/portal-comprador',
        },
        {
          icon: Users,
          label: 'Portal Proprietário',
          path: '/rural/portal-proprietario',
        },
      ],
    },
    {
      title: 'SISTEMA',
      items: [
        { icon: Sparkles, label: 'IA Studio', path: '/rural/ai-assistant' },
        {
          icon: Eye,
          label: 'Editor Visual de Site',
          path: '/rural/visual-editor',
        },
        { icon: Settings, label: 'Configurações', path: '/rural/settings' },
      ],
    },
  ];

  if (!authLoading && profile?.role === 'superadmin' && !isImpersonating) {
    return <Navigate to="/superadmin" replace />;
  }

  const renderSidebarItem = (item: any) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/rural'}
      onClick={() => setIsMobileMenuOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-brand/15 text-brand border-l-2 border-brand'
            : 'text-secondary hover:bg-bg-hover hover:text-text-primary'
        }`
      }
    >
      <item.icon size={18} strokeWidth={2} />
      <span className="text-sm font-medium">{item.label}</span>
    </NavLink>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Logo */}
      <div className="p-6 pb-4">
        <Link to="/rural" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
            <Database className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary tracking-tight leading-none">
              IMOBZY <span className="text-brand">Rural</span>
            </h1>
            <span className="text-[10px] text-tertiary font-bold uppercase tracking-widest mt-0.5 block">
              Painel Rural
            </span>
          </div>
        </Link>

        <Link
          to={`/site/${(profile?.organization as any)?.slug || ''}`}
          target="_blank"
          className="mt-6 flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-subtle text-secondary hover:text-text-primary hover:border-brand transition-all text-xs font-medium uppercase tracking-wide"
        >
          <Globe size={14} /> Ver Site
        </Link>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-8 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-[.15em] mb-3">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map(renderSidebarItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile & Logout */}
      <div className="p-6 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-100 font-bold border border-slate-700">
            {profile?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {profile?.name || 'Usuário'}
            </p>
            <p className="text-[10px] text-tertiary font-medium uppercase tracking-wide truncate">
              Plano Pro
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            signOut().then(() => (window.location.href = '/login'))
          }
          className="flex items-center gap-2 text-tertiary hover:text-text-primary text-xs font-medium transition-colors w-full p-2"
        >
          <LogOut size={14} /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden selection:bg-brand/20 selection:text-brand">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-bg-card border-r border-subtle text-text-primary hidden lg:flex flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-bg-card border-b border-subtle px-6 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              className="lg:hidden p-2 text-secondary hover:text-text-primary"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="relative max-w-lg w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar imóveis, leads..."
                className="w-full bg-bg-input border border-subtle rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-brand/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-[10px] font-medium text-tertiary uppercase tracking-wide">
                Carteira
              </span>
              <span className="text-base font-bold text-brand">R$ 0</span>
            </div>

            <Link to="/rural/properties/new" className="btn-primary">
              <Plus size={16} className="transition-transform duration-300" />
              Novo Imóvel
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-bg-primary custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-bg-card shadow-2xl animate-in slide-in-from-left duration-300">
            {sidebarContent}
            <button
              className="absolute top-4 right-[-48px] text-text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={28} />
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

export default RuralLayout;
