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
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
          isActive
            ? 'bg-primary-alpha-10 text-primary font-semibold shadow-sm'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'animate-pulse-subtle' : ''} />
          <span className="text-sm">{item.label}</span>
        </>
      )}
    </NavLink>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Logo */}
      <div className="p-6 pb-6">
        <Link to="/rural" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary-alpha-20 transition-transform group-hover:scale-105">
            <Database className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary tracking-tight leading-none">
              IMOBZY <span className="text-primary">Rural</span>
            </h1>
            <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-1 block">
              Painel Rural
            </span>
          </div>
        </Link>

        <Link
          to={`/site/${(profile?.organization as any)?.slug || ''}`}
          target="_blank"
          className="mt-8 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-text-secondary hover:text-primary hover:border-primary transition-all text-xs font-bold uppercase tracking-wide bg-bg-input"
        >
          <Globe size={14} /> Ver Site
        </Link>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-8 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <h3 className="px-3 text-[10px] font-bold text-text-tertiary uppercase tracking-[0.15em] mb-4 opacity-70">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map(renderSidebarItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile & Logout */}
      <div className="p-4 border-t border-border-subtle bg-bg-hover/50 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl border border-transparent hover:border-border transition-colors">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner">
            {profile?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">
              {profile?.name || 'Usuário'}
            </p>
            <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wide truncate">
              Plano Pro
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            signOut().then(() => (window.location.href = '/login'))
          }
          className="flex items-center gap-2 text-text-tertiary hover:text-primary text-xs font-bold transition-all w-full p-2 hover:bg-primary/5 rounded-lg"
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
        <header className="h-20 bg-bg-card/80 backdrop-blur-xl border-b border-border-subtle px-8 flex items-center justify-between z-20 shrink-0 sticky top-0">
          <div className="flex items-center gap-6 flex-1">
            <button
              className="lg:hidden p-2.5 text-text-secondary hover:text-primary bg-bg-hover rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="relative max-w-lg w-full group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar imóveis, leads..."
                className="input-field pl-12 h-11"
              />
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-0.5">
                Vendas (Mês)
              </span>
              <span className="text-lg font-black text-primary tracking-tight">R$ 0,00</span>
            </div>

            <Link to="/rural/properties/new" className="btn btn-primary h-11 px-6 shadow-lg shadow-primary-alpha-20">
              <Plus size={18} />
              <span className="hidden sm:inline">Novo Imóvel</span>
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
