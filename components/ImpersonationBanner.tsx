import React from 'react';
import { ShieldAlert, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, profile, stopImpersonation } = useAuth();

  if (!isImpersonating || !profile?.organization) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-[100] shadow-lg animate-pulse-slow">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-1.5 rounded-lg">
          <ShieldAlert size={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold">MODO SUPORTE ATIVO</p>
          <p className="text-[11px] opacity-90 leading-tight">
            Você está visualizando o painel de:{' '}
            <span className="font-bold underline">
              {profile.organization.name}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-black/20 rounded-full border border-white/20">
          <UserCircle size={14} />
          <span className="text-[10px] font-medium uppercase tracking-wider">
            Acesso Administrativo
          </span>
        </div>

        <button
          onClick={stopImpersonation}
          className="flex items-center gap-2 px-4 py-1.5 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-all shadow-sm"
        >
          <LogOut size={14} />
          Sair do Modo Suporte
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
