import React from 'react';
import { AlertTriangle, LifeBuoy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FullScreenSpinner from './FullScreenSpinner';

const SuspendedGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, loading, isSuspended, signOut } = useAuth();

  if (loading) return <FullScreenSpinner />;

  // Se não estiver suspenso ou se for superadmin, libera o acesso normalmente
  if (!isSuspended || profile?.role === 'superadmin') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl md:p-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={40} />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-950 mb-3">
          Serviços Indisponíveis
        </h1>
        
        <p className="text-base font-medium text-slate-600 mb-8 max-w-md mx-auto">
          O acesso desta conta foi suspenso temporariamente. Algumas funcionalidades, incluindo o painel de administração, não estão disponíveis no momento.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => window.location.href = 'mailto:suporte@imobzy.com'}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            <LifeBuoy size={20} />
            Contatar Suporte
          </button>
          
          <button
            onClick={signOut}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspendedGuard;
