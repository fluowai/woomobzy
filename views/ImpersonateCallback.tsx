
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const ImpersonateCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('Código de autorização não encontrado.');
      return;
    }

    const exchangeToken = async () => {
      try {
        // 1. Call your backend to exchange code for token
        // Use full URL if simple relative path fails due to port diffs in dev
        const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3002';
        const response = await fetch(`${apiUrl}/api/support/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.token) {
          throw new Error(data.error || 'Falha na troca do token.');
        }

        // 2. Set Supabase Session with the custom token
        // We pass a dummy refresh token because we don't have one, 
        // and this session is meant to start expiring immediately (1h TTL)
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.token,
          refresh_token: 'impersonation_dummy_refresh_token', 
        });

        if (sessionError) {
          throw sessionError;
        }

        // 3. Set local flag for UI banner logic (optional fallback)
        // Ideally we check the token claims, but this is a good quick UI helper
        localStorage.setItem('isImpersonating', 'true');
        
        // Remove legacy
        localStorage.removeItem('impersonatedOrgId'); 

        // 4. Redirect to dashboard
        // Force reload to ensure all contexts refresh with new user
        window.location.href = '/admin/dashboard';

      } catch (err: any) {
        console.error('Impersonation Error:', err);
        setError(err.message || 'Erro desconhecido ao acessar conta.');
      }
    };

    // Need to sign out from current Admin session first to avoid conflicts?
    // Actually, setting session should overwrite. But let's be safe.
    // However, if we sign out first, we might lose some state if we wanted to keep "return to admin".
    // For now, we overwrite.
    exchangeToken();

  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-sm border border-red-100 text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 font-bold">!</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Erro de Acesso</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.href = '/admin'}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Voltar ao Painel Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center space-y-4">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-white rounded-full mx-auto"></div>
        <h2 className="text-2xl font-bold">Autenticando Acesso Seguro...</h2>
        <p className="text-gray-400">Trocando credenciais e validando auditoria.</p>
      </div>
    </div>
  );
};

export default ImpersonateCallback;
