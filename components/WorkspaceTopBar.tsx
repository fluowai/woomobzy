import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Building2,
  Trees,
  User,
  Settings,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getProfileDisplayTitle,
  normalizeProfileRole,
} from '@/src/lib/navigationConfig';

interface WorkspaceTopBarProps {
  currentSection?: string;
  badgeCount?: number;
}

export const WorkspaceTopBar: React.FC<WorkspaceTopBarProps> = ({
  currentSection = 'Visão geral',
  badgeCount = 3,
}) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const isRural = pathname.startsWith('/rural');
  const isSuperAdmin = pathname.startsWith('/superadmin');
  const isMegaAdmin = pathname.startsWith('/megaadmin');
  const isWooControl = pathname.startsWith('/woo-control');

  const activeContext = isWooControl
    ? 'woocontrol'
    : isMegaAdmin
    ? 'megaadmin'
    : isSuperAdmin
    ? 'superadmin'
    : isRural
    ? 'rural'
    : 'urban';

  const role = normalizeProfileRole(profile?.role);
  const orgNiche = String(profile?.organization?.niche || '').toLowerCase();
  const isHybridOrg =
    orgNiche === 'hibrido' ||
    orgNiche === 'hybrid' ||
    role === 'superadmin' ||
    role === 'platform_admin' ||
    role === 'platform_owner';

  const displayTitle = getProfileDisplayTitle(
    profile?.role,
    activeContext,
    profile?.organization?.name
  );

  const displayName =
    profile?.full_name ||
    (profile as any)?.name ||
    'Paulo Argolo';

  const userInitials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n: string) => n[0].toUpperCase())
      .join('') || 'UR';

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      window.location.href = '/login';
    }
  };

  const getSearchPlaceholder = () => {
    if (role === 'broker') return 'Buscar por lead, cliente, imóvel ou código...';
    if (role === 'assistente') return 'Buscar cliente, imóvel ou atendimento...';
    if (isRural) return 'Buscar por propriedade, cliente, investidor ou protocolo...';
    if (isSuperAdmin) return 'Buscar por organização...';
    return 'Buscar por cliente, lead, imóvel ou código...';
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#E5E7EB] bg-white px-4 lg:px-6 gap-3 select-none">
      {/* Left: Role / Context Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {role === 'broker' || role === 'assistente' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] text-xs font-bold text-[#182230]">
              <User size={14} className="text-[#526071]" />
              <span>{displayTitle}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-[#182230] tracking-tight hidden sm:inline-block">
              {displayTitle}
            </span>
          )}
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-md mx-2 hidden sm:block">
        <div className="relative w-full">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#526071]"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={getSearchPlaceholder()}
            className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] pl-9 pr-3 text-xs font-medium text-[#182230] placeholder:text-[#526071] focus:border-[#FF6A00] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF6A00]/20 transition"
          />
        </div>
      </div>

      {/* Right: Switcher, Notifications & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Niche Switcher (Urbano / Rural) - apenas quando híbrido ou autorizado */}
        {isHybridOrg && (
          <div className="relative">
            <button
              onClick={() => setContextMenuOpen(!contextMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] hover:bg-gray-100 text-xs font-semibold text-[#182230] transition cursor-pointer"
            >
              {isRural ? (
                <>
                  <Trees size={14} className="text-emerald-600" />
                  <span>Rural</span>
                </>
              ) : (
                <>
                  <Building2 size={14} className="text-[#FF6A00]" />
                  <span>Urbano</span>
                </>
              )}
              <ChevronDown size={13} className="text-[#526071]" />
            </button>

            {contextMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-lg z-50 text-xs font-medium">
                <button
                  onClick={() => {
                    setContextMenuOpen(false);
                    navigate('/urban');
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 transition ${
                    !isRural ? 'bg-orange-50 text-[#FF6A00] font-bold' : 'text-[#182230] hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Building2 size={14} /> Urbano
                  </span>
                  {!isRural && <Check size={14} />}
                </button>
                <button
                  onClick={() => {
                    setContextMenuOpen(false);
                    navigate('/rural');
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 transition ${
                    isRural ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-[#182230] hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Trees size={14} /> Rural
                  </span>
                  {isRural && <Check size={14} />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notification Bell */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#526071] hover:bg-gray-50 hover:text-[#182230] transition cursor-pointer"
          aria-label="Notificações"
        >
          <Bell size={16} />
          {badgeCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FF6A00]" />
          )}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-full border border-[#E5E7EB] p-1 pr-2.5 hover:border-gray-300 transition cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6A00] text-xs font-bold text-white">
              {userInitials}
            </div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-xs font-semibold text-[#182230] max-w-[130px] truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-[#526071] max-w-[130px] truncate">
                {profile?.organization?.name || displayTitle}
              </span>
            </div>
            <ChevronDown size={14} className="text-[#526071]" />
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-xl z-50 text-xs">
              <div className="px-3 py-2 border-b border-[#E5E7EB] mb-1">
                <p className="font-bold text-[#182230] truncate">{displayName}</p>
                <p className="text-[11px] text-[#526071] truncate">{profile?.organization?.name || displayTitle}</p>
              </div>

              {/* Órulo individual link para corretor */}
              {role === 'broker' && (
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate(`${isRural ? '/rural' : '/urban'}/settings?tab=integracoes`);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[#526071] hover:bg-gray-50 hover:text-[#182230] transition"
                >
                  <ShieldCheck size={14} /> Integração Órulo
                </button>
              )}

              {(role === 'admin' || role === 'superadmin' || role === 'platform_admin' || role === 'platform_owner') && (
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate(`${isRural ? '/rural' : '/urban'}/settings`);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[#526071] hover:bg-gray-50 hover:text-[#182230] transition"
                >
                  <Settings size={14} /> Configurações
                </button>
              )}

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 transition cursor-pointer mt-1 border-t border-[#E5E7EB]"
              >
                <LogOut size={14} /> Sair do Sistema
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default WorkspaceTopBar;
