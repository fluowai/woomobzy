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
  CreditCard
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
        { icon: LayoutDashboard, label: 'Dashboard', path: '/rural' },
        { icon: PieChart, label: 'BI & Relatórios', path: '/rural/reports' },
      ],
    },
    {
      title: 'COMERCIAL',
      items: [
        { icon: Users, label: 'Leads & CRM', path: '/rural/crm' },
        { icon: MessageSquare, label: 'Mensagens', path: '/rural/chat' },
        { icon: Share2, label: 'Conexões WhatsApp', path: '/rural/whatsapp-instances' },
      ],
    },
    {
      title: 'IMÓVEIS',
      items: [
        { icon: Home, label: 'Fazendas & Imóveis', path: '/rural/properties' },
        { icon: Database, label: 'Cadastro Técnico', path: '/rural/cadastro-tecnico' },
        { icon: MapIcon, label: 'Geointeligência', path: '/rural/geointeligencia' },
      ],
    },
    {
      title: 'NEGÓCIOS',
      items: [
        { icon: ShieldCheck, label: 'Due Diligence', path: '/rural/due-diligence' },
        { icon: FolderOpen, label: 'Data Room', path: '/rural/dataroom' },
        { icon: FileText, label: 'Contratos', path: '/rural/contracts' },
      ],
    },
    {
      title: 'CAPTAÇÃO',
      items: [
        { icon: Globe, label: 'Landing Pages', path: '/rural/landing-pages' },
        { icon: UserCheck, label: 'Portal Comprador', path: '/rural/portal-comprador' },
        { icon: Users, label: 'Portal Proprietário', path: '/rural/portal-proprietario' },
      ],
    },
    {
      title: 'SISTEMA',
      items: [
        { icon: Sparkles, label: 'IA Studio', path: '/rural/ai-assistant' },
        { icon: Eye, label: 'Editor Visual de Site', path: '/rural/visual-editor' },
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
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
        }`
      }
      style={({ isActive }) => 
        isActive ? { borderLeft: '3px solid #22C55E' } : {}
      }
    >
      <item.icon size={18} strokeWidth={2} />
      <span className="text-sm font-medium">{item.label}</span>
    </NavLink>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Logo */}
      <div className="p-8 pb-4">
        <Link to="/rural" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Database className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none italic">
              PAINEL <span className="text-emerald-500">RURAL</span>
            </h1>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">
              Enterprise Suite
            </span>
          </div>
        </Link>
        
        <Link 
          to={`/site/${(profile?.organization as any)?.slug || ''}`}
          target="_blank"
          className="mt-8 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all text-xs font-bold uppercase tracking-widest"
        >
          <Globe size={14} /> Visualizar Site
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
            <p className="text-sm font-semibold text-slate-100 truncate">{profile?.name || 'Usuário'}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">Plano Agro Pro</p>
          </div>
        </div>
        <button 
          onClick={() => signOut().then(() => window.location.href = '/login')}
          className="flex items-center gap-2 text-slate-500 hover:text-white text-xs font-bold transition-colors w-full p-2"
        >
          <LogOut size={16} /> SAIR DA CONTA
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Sidebar - Desktop */}
      <aside className="w-[280px] bg-[#0F172A] text-white hidden lg:flex flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-[80px] bg-white border-b border-slate-200 px-8 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden p-2 text-slate-600" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="relative max-w-lg w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar fazendas, investidores..." 
                className="w-full bg-[#F1F5F9] border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">VALOR DA CARTEIRA</span>
              <span className="text-base font-bold text-[#22C55E]">R$ 142.500.000</span>
            </div>
            
            <Link 
              to="/rural/properties/new" 
              className="bg-[#22C55E] text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-[#16A34A] transition-all font-bold text-sm shadow-lg shadow-emerald-500/20 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              NOVA PROPRIEDADE
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-[#F8FAFC] custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0F172A] shadow-2xl animate-in slide-in-from-left duration-300">
            {sidebarContent}
            <button className="absolute top-4 right-[-48px] text-white" onClick={() => setIsMobileMenuOpen(false)}>
              <X size={32} />
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

export default RuralLayout;
