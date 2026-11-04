import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  LayoutTemplate,
  Home,
  Users,
  Calendar,
  FileText,
  LogOut,
  Search,
  PlusCircle,
  Sparkles,
  PieChart,
  Globe,
  Database,
  Settings,
  Menu,
  X,
  Type,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlans } from '../context/PlansContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, signOut, stopImpersonation, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/#/login';
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Home, label: 'Fazendas & Imóveis', path: '/admin/properties' },
    {
      icon: LayoutTemplate,
      label: 'Landing Pages',
      path: '/admin/landing-pages',
    },
    { icon: Users, label: 'Leads & CRM', path: '/admin/crm' },
    { icon: Settings, label: 'Configurações', path: '/admin/settings' },
    { icon: Calendar, label: 'Agenda', path: '/admin/agenda' },
    { icon: FileText, label: 'Contratos', path: '/admin/contracts' },
    { icon: Phone, label: 'Mensagens', path: '/admin/messages' },
    {
      icon: Settings,
      label: 'Conexões WhatsApp',
      path: '/admin/whatsapp-setup',
    },
    { icon: PieChart, label: 'BI & Rural', path: '/admin/reports' },
    { icon: Type, label: 'Editor de Textos', path: '/admin/texts' },
    { icon: Sparkles, label: 'IA Studio', path: '/admin/ai-assistant' },
    { icon: Database, label: 'Migração', path: '/admin/migration' },
  ];

  // Define feature requirements
  const featureRequirements: Record<string, string> = {
    '/admin/crm': 'crm',
    '/admin/landing-pages': 'site',
    '/admin/ai-assistant': 'ia_chat',
    // '/admin/whatsapp-setup': 'whatsapp', // Enabled for all
    // '/admin/messages': 'whatsapp' // Enabled for all
  };

  /* 
  if (profile?.role === 'superadmin') {
    menuItems.push({ icon: ShieldAlert, label: 'Super Admin', path: '/superadmin' });
  } 
  */

  const { hasFeature } = usePlans();

  // Filter items
  const filteredMenuItems = menuItems.filter((item) => {
    const required = featureRequirements[item.path];
    if (!required) return true; // No requirement
    return hasFeature(required as any);
  });

  // Conteúdo da Sidebar (compartilhado entre desktop e mobile)
  const SidebarContent = () => (
    <>
      <div className="px-6 py-5 border-b border-slate-100">
        <Link
          to="/"
          className="flex items-center gap-3"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img
            src="/logo-wootech-imob.svg"
            alt="WooTech Imob"
            className="workspace-logo"
          />
        </Link>
        <a
          href="/#/site"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-full border border-primary/20 bg-primary/10 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white"
        >
          <Globe size={14} /> Visualizar Site
        </a>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `workspace-nav-item flex items-center gap-3 ${
                isActive ? 'workspace-nav-item-active' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={20}
                  className={isActive ? 'text-primary' : 'text-slate-400'}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: User Profile & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3 mb-3 md:mb-4 p-2 rounded-xl border border-slate-200 bg-white">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-900">
              {profile?.full_name || 'Carregando...'}
            </p>

            {/* ROLE BADGE */}
            {profile?.role === 'superadmin' ? (
              <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-widest rounded-sm">
                SUPER ADMIN
              </span>
            ) : (
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                {profile?.role === 'admin'
                  ? 'Admin'
                  : loading
                    ? '...'
                    : 'Corretor'}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
        >
          <LogOut size={18} className="opacity-70 group-hover:opacity-100" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Sair
          </span>
        </button>
      </div>
    </>
  );

  return (
    <div
      className="workspace-shell flex h-screen overflow-hidden"
      style={{ fontFamily: '"Inter", sans-serif', fontSize: '16px' }}
    >
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Sidebar Drawer */}
          <aside className="workspace-sidebar absolute left-0 top-0 bottom-0 text-slate-900 flex flex-col animate-in slide-in-from-left duration-300">
            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Impersonation Banner */}
      {localStorage.getItem('impersonatedOrgId') && (
        <div className="bg-red-600 text-white text-center py-2 px-4 shadow-lg z-50 flex items-center justify-center gap-4">
          <span className="font-bold flex items-center gap-2">
            <ShieldAlert size={18} />
            ACESSANDO COMO: MODO SUPER ADMIN
          </span>
          <button
            onClick={stopImpersonation}
            className="bg-white text-red-600 px-3 py-1 rounded text-xs font-bold uppercase hover:bg-red-50"
          >
            Sair
          </button>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="workspace-sidebar text-slate-900 flex-col hidden md:flex transition-all">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="workspace-topbar flex items-center justify-between px-6 z-10 gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="workspace-icon-button md:hidden"
          >
            <Menu size={20} />
          </button>

          {/* Search - Hidden on small mobile, visible on md+ */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar..."
              className="workspace-search w-full pl-10 pr-4"
            />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Novo Imóvel Button */}
            <Link
              to="/admin/properties/new"
              className="workspace-primary-action"
            >
              <PlusCircle size={16} />
              Novo Imóvel
            </Link>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
