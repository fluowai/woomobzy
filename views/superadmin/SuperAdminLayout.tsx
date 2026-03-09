
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard,
  Settings, 
  LogOut, 
  Menu, 
  X,
  ShieldAlert,
  Globe,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SuperAdminLayout: React.FC = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin' },
    // { icon: Building2, label: 'Imobiliárias', path: '/superadmin/tenants' }, // REMOVED FOR SINGLE TENANT
    // { icon: CreditCard, label: 'Planos', path: '/superadmin/plans' }, // REMOVED FOR SINGLE TENANT
    { icon: Globe, label: 'Domínios', path: '/superadmin/domains' },
    { icon: Settings, label: 'Configurações', path: '/superadmin/settings' },
  ];

  if (profile?.role !== 'superadmin') {
     return (
         <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-red-800 p-4">
             <ShieldAlert size={64} className="mb-4" />
             <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
             <p className="mb-6">Você não tem permissão de Super Admin.</p>
             <button 
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
             >
                 Voltar para Painel
             </button>
         </div>
     )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-500 font-bold text-xl">
                <ShieldAlert />
                <span>Super Admin</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/superadmin' && location.pathname.startsWith(item.path));
              
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
              </div>
            </div>
            
            <button
               onClick={() => navigate('/admin')}
               className="w-full flex items-center gap-2 px-2 py-2 mb-1 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border-b border-transparent hover:border-slate-700"
             >
               <LayoutDashboard size={18} />
               Acessar Painel da Agência
             </button>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2 py-2 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Sair do Sistema
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="font-bold text-slate-800">Super Admin</div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
