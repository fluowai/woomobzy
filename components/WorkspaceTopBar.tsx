import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WorkspaceTopBarProps {
  currentSection?: string;
  badgeCount?: number;
}

export const WorkspaceTopBar: React.FC<WorkspaceTopBarProps> = ({
  currentSection = 'Dashboard',
  badgeCount = 3,
}) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const displayName =
    profile?.full_name ||
    (profile as any)?.name ||
    'Paulo Argolo';

  const userInitials =
    displayName
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PA';

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#0b0e14]/90 px-6 backdrop-blur-xl">
      {/* Left: Breadcrumb / Title */}
      <div className="flex items-center gap-2.5 text-zinc-300">
        <Home size={17} className="text-zinc-500" />
        <span className="text-sm font-bold text-white tracking-wide">
          {currentSection}
        </span>
      </div>

      {/* Center: Search bar */}
      <div className="hidden md:flex items-center w-full max-w-md mx-6">
        <div className="relative w-full">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar leads, imóveis, clientes..."
            className="h-10 w-full rounded-full border border-white/10 bg-[#12151e] pl-10 pr-4 text-xs font-medium text-white placeholder:text-zinc-500 focus:border-[#ff6a00] focus:outline-none focus:ring-1 focus:ring-[#ff6a00]/30 transition"
          />
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
          aria-label="Notificações"
        >
          <Bell size={18} />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff5500] text-[9px] font-black text-white shadow-sm shadow-orange-500/50">
              {badgeCount}
            </span>
          )}
        </button>

        {/* Profile Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 rounded-full border border-white/10 bg-[#12151e] p-1.5 pr-3 transition hover:border-white/20 cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#ff5500] to-[#ff7a00] text-xs font-black text-white shadow-sm">
              {userInitials}
            </div>
            <span className="text-xs font-bold text-white hidden sm:inline-block">
              {displayName}
            </span>
            <ChevronDown size={14} className="text-zinc-500" />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#141822] p-1.5 shadow-2xl z-50 text-xs">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <p className="font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">
                  {profile?.role || 'Gestor Master'}
                </p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/rural/settings');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition"
              >
                <Settings size={14} /> Configurações
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-rose-400 hover:bg-rose-500/10 transition mt-1"
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
