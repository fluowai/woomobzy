import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { NavLink, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LayoutGrid,
  Calculator,
  Users,
  FileText,
  LogOut,
  PieChart,
  Settings,
  Menu,
  X,
  DollarSign,
  MessageSquare,
  Mail,
  Map as MapIcon,
  ShieldAlert,
  Building2,
  Key,
  LayoutTemplate,
  FileQuestion,
  ChevronRight,
  Headset,
  Bot,
  Link as LinkIcon,
  Globe,
  Sparkles,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SupportModal from './SupportModal';

type MenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const UrbanLayout: React.FC = () => {
  const { profile, signOut, isImpersonating, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { pathname } = useLocation();
  const isWorkspaceRoute = pathname.startsWith('/urban/whatsapp') || pathname.startsWith('/urban/email');

  if (!loading && profile?.role === 'superadmin' && !isImpersonating) {
    logger.info('[UrbanLayout] Guard triggered. Redirecting Super Admin to /superadmin');
    return <Navigate to="/superadmin" replace />;
  }

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  const operationItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/urban' },
    { icon: MessageSquare, label: 'Mensagens', path: '/urban/whatsapp' },
    { icon: Mail, label: 'Email', path: '/urban/email' },
    { icon: LayoutGrid, label: 'Kanban', path: '/urban/kanban' },
    { icon: Users, label: 'CRM Leads', path: '/urban/crm' },
    { icon: Users, label: 'Clientes Unificado', path: '/urban/clients' },
  ];

  const assetItems: MenuItem[] = [
    { icon: Building2, label: 'Imóveis Urbanos', path: '/urban/properties' },
    { icon: Key, label: 'Gestão de Locação', path: '/urban/locacao' },
    { icon: MapIcon, label: 'Loteamentos', path: '/urban/loteamentos' },
    { icon: Building2, label: 'Adm. Condomínios', path: '/urban/condominios' },
    { icon: Key, label: 'Controle de Chaves', path: '/urban/chaves' },
  ];

  const managementItems: MenuItem[] = [
    { icon: DollarSign, label: 'Financeiro & ERP', path: '/urban/financeiro' },
    { icon: Calculator, label: 'Simulador Financeiro', path: '/urban/simulador' },
    { icon: FileText, label: 'Contratos & Jurídico', path: '/urban/contracts' },
    { icon: FileText, label: 'Documentos (GED)', path: '/urban/documentos' },
  ];

  const growthItems: MenuItem[] = [
    { icon: Globe, label: 'Meu Site', path: '/urban/site' },
    { icon: Sparkles, label: 'Editor Visual', path: '/urban/visual-editor' },
    { icon: Settings, label: 'Configurar Site', path: '/urban/site-setup' },
    { icon: Bot, label: 'Agentes IA', path: '/urban/ai-agents' },
    { icon: LayoutTemplate, label: 'Landing Pages', path: '/urban/landing-pages' },
    { icon: FileQuestion, label: 'Quiz', path: '/urban/quiz' },
    { icon: PieChart, label: 'Relatórios Gerenciais', path: '/urban/reports' },
  ];

  const systemItems: MenuItem[] = [
    { icon: LinkIcon, label: 'Conexões', path: '/urban/connections' },
    { icon: LinkIcon, label: 'Integrações', path: '/urban/integrations' },
    { icon: Settings, label: 'Configurações', path: '/urban/settings' },
  ];

  if (profile?.role === 'superadmin') {
    systemItems.push({
      icon: ShieldAlert,
      label: 'Super Admin',
      path: '/superadmin',
    });
  }

  const menuSections: MenuSection[] = [
    { title: 'Operação', items: operationItems },
    { title: 'Carteira Urbana', items: assetItems },
    { title: 'Gestão', items: managementItems },
    { title: 'Crescimento', items: growthItems },
    { title: 'Sistema', items: systemItems },
  ];

  const isMenuItemActive = (path: string, isActive: boolean) =>
    isActive || (path !== '/urban' && pathname.startsWith(path));

  const renderMenuItem = (item: MenuItem) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/urban'}
      onClick={() => setIsMobileMenuOpen(false)}
      className={({ isActive }) => {
        const active = isMenuItemActive(item.path, isActive);
        return `flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
          active
            ? 'bg-primary text-white font-bold shadow-lg shadow-primary/25'
            : 'text-slate-500 hover:bg-primary/10 hover:text-primary'
        }`;
      }}
    >
      {({ isActive }) => {
        const active = isMenuItemActive(item.path, isActive);

        return (
          <>
            <div className="flex items-center gap-3.5 min-w-0">
              <item.icon
                size={20}
                className={active ? 'text-white shrink-0' : 'text-slate-400 group-hover:text-primary shrink-0'}
              />
              <span className="text-sm font-bold tracking-tight truncate">{item.label}</span>
            </div>
            {item.path !== '/urban' && (
              <ChevronRight
                size={14}
                className={active ? 'text-white/80 shrink-0' : 'text-slate-300 group-hover:text-primary shrink-0'}
              />
            )}
          </>
        );
      }}
    </NavLink>
  );

  const renderSidebarContent = () => (
    <>
      <div className="p-8 pb-6">
        <Link
          to="/urban"
          className="flex items-center gap-3 group"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img
            src="/logo-imobfluow.svg"
            alt="ImobFluow"
            className="h-12 w-auto object-contain max-w-[150px] transition-transform group-hover:scale-105"
          />
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6 custom-scrollbar">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {section.title}
            </p>
            <div className="space-y-1">{section.items.map(renderMenuItem)}</div>
          </div>
        ))}

        <button
          onClick={() => setIsSupportOpen(true)}
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-300 group text-slate-500 hover:bg-primary/10 hover:text-primary"
        >
          <div className="flex items-center gap-3.5">
            <Headset size={20} className="text-slate-400 group-hover:text-primary" />
            <span className="text-sm font-bold tracking-tight">Suporte</span>
          </div>
        </button>
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl border border-slate-200 bg-white">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner">
            {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {profile?.full_name || profile?.name || 'Carregando...'}
            </p>
            {profile?.role === 'superadmin' ? (
              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-widest rounded">
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
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </>
  );

  return (
    <div className="flex h-screen h-dvh bg-bg-primary overflow-hidden selection:bg-primary/20 selection:text-primary">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
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

      <aside className="w-64 bg-white border-r border-slate-200 text-slate-900 hidden md:flex flex-col shrink-0 overflow-hidden shadow-sm">
        {renderSidebarContent()}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-bg-primary">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={21} />
        </button>
        <div
          className={`flex-1 overflow-y-auto bg-bg-primary ${
            isWorkspaceRoute ? 'p-2 sm:p-3 md:p-4' : 'p-3 sm:p-4 md:p-6'
          }`}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default UrbanLayout;
