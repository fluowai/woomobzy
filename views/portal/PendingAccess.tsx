import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function PendingAccess() {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-[#182230] tracking-tight">
          Seu acesso
        </h1>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6A00] shrink-0">
              <Link2 size={24} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[#182230]">
                  Vínculo da conta
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-[#FF6A00] border border-orange-200">
                  Aguardando acesso
                </span>
              </div>
              <p className="text-sm text-[#526071] max-w-xl">
                Seu vínculo com a conta está em análise. Você será avisado assim que o acesso for liberado.
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm font-semibold text-[#182230] hover:bg-gray-50 transition cursor-pointer self-start sm:self-center shrink-0"
          >
            <LogOut size={16} className="text-[#526071]" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

