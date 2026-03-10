import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
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
  Database,
  Settings,
  Menu,
  X,
  Phone,
  ShieldAlert,
  Map,
  ShieldCheck,
  FolderOpen,
  Wheat,
  TreePine,
  Eye
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { usePlans } from '../context/PlansContext';

interface LayoutProps {
  children: React.ReactNode;
}

const RuralLayout: React.FC<LayoutProps> = ({ children }) => {
  const { settings } = useSettings();
  const { profile, signOut, stopImpersonation, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/rural' },
    { icon: Wheat, label: 'Cadastro Técnico', path: '/rural/cadastro-tecnico' },
    { icon: Home, label: 'Fazendas & Imóveis', path: '/rural/properties' },
    { icon: Map, label: 'Geointeligência', path: '/rural/geointeligencia' },
    { icon: ShieldCheck, label: 'Due Diligence', path: '/rural/due-diligence' },
    { icon: FolderOpen, label: 'Data Room', path: '/rural/dataroom' },
    { icon: Users, label: 'Leads & CRM', path: '/rural/crm' },
    { icon: Phone, label: 'Mensagens', path: '/rural/messages' },
    { icon: Settings, label: 'Conexões WhatsApp', path: '/rural/whatsapp-setup' },
    { icon: PieChart, label: 'BI & Relatórios', path: '/rural/reports' },
    { icon: Eye, label: 'Portal Proprietário', path: '/rural/portal-proprietario' },
    { icon: TreePine, label: 'Portal Comprador', path: '/rural/portal-comprador' },
    { icon: Globe, label: 'Landing Pages', path: '/rural/landing-pages' },
    { icon: Sparkles, label: 'IA Studio', path: '/rural/ai-assistant' },
    { icon: FileText, label: 'Contratos', path: '/rural/contracts' },
    { icon: Settings, label: 'Configurações', path: '/rural/settings' },
  ];

  // Add Super Admin link for superadmin users
  if (profile?.role === 'superadmin') {
    menuItems.push({ icon: ShieldAlert, label: 'Super Admin', path: '/superadmin' });
  }

  const { hasFeature } = usePlans();

  const SidebarContent = () => (
    <>
      <div className="p-6 md:p-8 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-10 md:h-12 w-auto object-contain max-w-[160px]" />
          ) : (
            <>
              <div className="p-2 rounded-xl bg-emerald-700">
                <Wheat className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">PAINEL</span>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.3em]">Rural</span>
              </div>
            </>
          )}
        </Link>
        <a 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-4 md:mt-6 flex items-center justify-center gap-2 w-full bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-emerald-500/30"
        >
          <Globe size={14} /> Visualizar Site
        </a>
      </div>
      
      <nav className="flex-1 p-4 md:p-5 space-y-1 md:space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/rural'}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl transition-all ${
                isActive 
                  ? 'bg-emerald-900/40 text-white shadow-lg' 
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`
            }
            style={({ isActive }) => isActive ? { borderLeft: '4px solid #059669' } : {}}
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? "text-emerald-400" : "text-white/50"} />
                <span className="font-semibold text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: User Profile & Logout */}
      <div className="p-4 md:p-6 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3 md:mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 font-black text-sm">
            {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-white">{profile?.full_name || profile?.name || 'Carregando...'}</p>
            {profile?.role === 'superadmin' ? (
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-sm">
                    SUPER ADMIN
                </span>
            ) : (
                <p className="text-[10px] text-white/40 uppercase tracking-widest">
                    {profile?.role === 'admin' ? 'Admin Rural' : (loading ? '...' : profile?.role || 'Corretor')}
                </p>
            )}
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
        >
          <LogOut size={18} className="opacity-60 group-hover:opacity-100" />
          <span className="text-xs font-black uppercase tracking-widest">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{ fontFamily: '"Poppins", sans-serif', fontSize: '16px' }}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0a0a0a] text-white flex flex-col animate-in slide-in-from-left duration-300">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
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
                  ACESSANDO COMO: IMOBILIÁRIA RURAL (Modo Super Admin)
              </span>
              <button 
                  onClick={stopImpersonation} 
                  className="bg-white text-red-600 px-3 py-1 rounded text-xs font-bold uppercase hover:bg-red-50"
              >
                  Sair do Acesso
              </button>
          </div>
      )}

      {/* Desktop Sidebar — Dark Green Theme */}
      <aside className="w-68 bg-[#0a0a0a] text-white flex-col hidden md:flex transition-all">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-10 shadow-sm z-10 gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all"
          >
            <Menu size={22} />
          </button>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar fazendas, investidores..." 
              className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            <div className="hidden lg:flex flex-col text-right mr-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carteira Ativa</span>
              <span className="text-sm font-black text-emerald-600">R$ 142.500.000</span>
            </div>
            
            <Link 
              to="/rural/properties/new" 
              className="flex items-center gap-2 text-white px-3 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider transition-all shadow-lg hover:brightness-110 active:scale-95 bg-emerald-700 hover:bg-emerald-600"
            >
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Nova Propriedade</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-slate-50/50">
          {children}
        </div>
      </main>
    </div>
  );
};

export default RuralLayout;
