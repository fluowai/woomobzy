import React, { useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Activity,
  DollarSign,
  ToggleRight,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  Database,
  UploadCloud,
  HardDrive,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MegaAdminLayout: React.FC = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/megaadmin' },
    { icon: Building2, label: 'Resellers', path: '/megaadmin/resellers' },
    { icon: Globe, label: 'Domínios', path: '/megaadmin/domains' },
    {
      icon: Building2,
      label: 'Clientes Diretos',
      path: '/megaadmin/direct-clients',
    },
    { icon: BarChart3, label: 'Analytics', path: '/megaadmin/analytics' },
    { icon: Activity, label: 'Monitoring', path: '/megaadmin/monitoring' },
    { icon: DollarSign, label: 'Billing', path: '/megaadmin/billing' },
    {
      icon: ToggleRight,
      label: 'Feature Flags',
      path: '/megaadmin/feature-flags',
    },
    { icon: ScrollText, label: 'Audit Log', path: '/megaadmin/audit-log' },
    { icon: UploadCloud, label: 'Importador', path: '/megaadmin/importer' },
    {
      icon: Database,
      label: 'Migração FluowAI',
      path: '/megaadmin/fluowai-migration',
    },
    {
      icon: HardDrive,
      label: 'Storage',
      path: '/megaadmin/storage-intelligence',
    },
    { icon: Settings, label: 'Configurações', path: '/megaadmin/settings' },
  ];

  if (profile?.role !== 'superadmin' || profile?.organization?.is_reseller) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-red-800 p-4">
        <ShieldAlert size={64} className="mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
        <p className="mb-6">Apenas o Mega Admin do sistema pode acessar.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Menu Overlay & Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-500 font-bold text-xl">
              <ShieldAlert />
              <span>Mega Admin</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/megaadmin'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <Icon size={20} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
                {profile?.full_name?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {profile?.email}
                </p>
              </div>
            </div>

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

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="font-bold text-slate-800">Mega Admin</div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MegaAdminLayout;
