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
  LayoutTemplate
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { usePlans } from '../context/PlansContext';

interface LayoutProps {
  children: React.ReactNode;
}

const UrbanLayout: React.FC<LayoutProps> = ({ children }) => {
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
    { icon: LayoutDashboard, label: 'Dashboard', path: '/urban' },
    { icon: Home, label: 'Imóveis', path: '/urban/properties' },
    { icon: Building2, label: 'Empreendimentos', path: '/urban/empreendimentos' },
    { icon: Key, label: 'Locação & Administração', path: '/urban/locacao' },
    { icon: ClipboardCheck, label: 'Compliance', path: '/urban/compliance' },
    { icon: Upload, label: 'Exportador Portais', path: '/urban/exportador' },
    { icon: Users, label: 'Leads & CRM', path: '/urban/crm' },
    { icon: Phone, label: 'Mensagens', path: '/urban/messages' },
    { icon: Settings, label: 'Conexões WhatsApp', path: '/urban/whatsapp-setup' },
    { icon: PieChart, label: 'Relatórios', path: '/urban/reports' },
    { icon: Eye, label: 'Portal Proprietário', path: '/urban/portal-proprietario' },
    { icon: Heart, label: 'Portal Comprador', path: '/urban/portal-comprador' },
    { icon: LayoutTemplate, label: 'Landing Pages', path: '/urban/landing-pages' },
    { icon: Sparkles, label: 'IA Studio', path: '/urban/ai-assistant' },
    { icon: FileText, label: 'Contratos', path: '/urban/contracts' },
    { icon: Settings, label: 'Configurações', path: '/urban/settings' },
  ];

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
              <div className="p-2 rounded-xl bg-blue-700">
                <Building2 className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">PAINEL</span>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.3em]">Tradicional</span>
              </div>
            </>
          )}
        </Link>
        <a 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-4 md:mt-6 flex items-center justify-center gap-2 w-full bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-blue-500/30"
        >
          <Globe size={14} /> Visualizar Site
        </a>
      </div>
      
      <nav className="flex-1 p-4 md:p-5 space-y-1 md:space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/urban'}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl transition-all ${
                isActive 
                  ? 'bg-blue-900/40 text-white shadow-lg' 
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`
            }
            style={({ isActive }) => isActive ? { borderLeft: '4px solid #2563eb' } : {}}
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? "text-blue-400" : "text-white/50"} />
                <span className="font-semibold text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 md:p-6 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3 md:mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-black text-sm">
            {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-white">{profile?.full_name || profile?.name || 'Carregando...'}</p>
            {profile?.role === 'superadmin' ? (
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-sm">
                    SUPER ADMIN
                </span>
            ) : (
                <p className="text-[10px] text-white/40 uppercase tracking-widest">
                    {profile?.role === 'admin' ? 'Admin Imobiliária' : (loading ? '...' : profile?.role || 'Corretor')}
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

      {localStorage.getItem('impersonatedOrgId') && (
          <div className="bg-red-600 text-white text-center py-2 px-4 shadow-lg z-50 flex items-center justify-center gap-4">
              <span className="font-bold flex items-center gap-2">
                  <ShieldAlert size={18} />
                  ACESSANDO COMO: IMOBILIÁRIA (Modo Super Admin)
              </span>
              <button 
                  onClick={stopImpersonation} 
                  className="bg-white text-red-600 px-3 py-1 rounded text-xs font-bold uppercase hover:bg-red-50"
              >
                  Sair do Acesso
              </button>
          </div>
      )}

      {/* Desktop Sidebar — Blue Theme */}
      <aside className="w-68 bg-[#0a0a0a] text-white flex-col hidden md:flex transition-all">
        <SidebarContent />
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar imóveis, clientes..." 
              className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            <div className="hidden lg:flex flex-col text-right mr-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VGV Ativo</span>
              <span className="text-sm font-black text-blue-600">R$ 24.800.000</span>
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
          {children}
        </div>
      </main>
    </div>
  );
};

export default UrbanLayout;
