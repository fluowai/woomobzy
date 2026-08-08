import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
  CheckCircle2,
  ArrowRight,
  Lock,
  Palette,
  Loader2,
  Key,
} from 'lucide-react';

const SetupWhitelabel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const tempPassword = searchParams.get('t');
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0 = Authenticating, 1 = Password, 2 = Branding, 3 = Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [primaryColor, setPrimaryColor] = useState('#064e3b');
  const [secondaryColor, setSecondaryColor] = useState('#d4af37');

  useEffect(() => {
    if (email && tempPassword) {
      authenticateWithTempPassword();
    } else {
      setError('Link de ativação inválido ou incompleto.');
      setStep(-1); // Error state
    }
  }, [email, tempPassword]);

  const authenticateWithTempPassword = async () => {
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: email as string,
          password: tempPassword as string,
        }
      );

      if (authError) {
        throw new Error(
          'Acesso negado ou link expirado. Se você já configurou, faça login normalmente.'
        );
      }

      // Fetch org id to update colors later
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', data.user.id)
        .single();

      if (profile?.organization_id) {
        setOrgId(profile.organization_id);
      }

      setStep(1); // Proceed to step 1
    } catch (err: any) {
      setError(err.message);
      setStep(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    setLoading(true);
    setError('');
    try {
      if (orgId) {
        const { error: orgError } = await supabase
          .from('organizations')
          .update({
            primary_color: primaryColor,
            secondary_color: secondaryColor,
          })
          .eq('id', orgId);

        if (orgError) throw orgError;
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cores.');
    } finally {
      setLoading(false);
    }
  };

  // UI Components
  if (step === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 size={48} className="animate-spin text-purple-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">
          Validando acesso...
        </h2>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ops!</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Progress */}
        {step < 3 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Passo {step} de 2
              </span>
              <span className="text-xs font-bold text-purple-600">
                {step === 1 ? 'Segurança' : 'Identidade Visual'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100 relative overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <form
              id="setup-password-form"
              className="animate-fade-in space-y-6"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleSetPassword();
              }}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Key size={32} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Sua Nova Senha
                </h2>
                <p className="text-slate-500 mt-2 text-sm">
                  Crie uma senha forte e segura para o seu usuário Super Admin.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 transition-colors"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Confirme a Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 transition-colors"
                    placeholder="Repita a senha"
                  />
                </div>
              </div>

              <button
                type="submit"
                form="setup-password-form"
                disabled={loading}
                className="w-full mt-6 bg-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-all disabled:opacity-70 shadow-lg shadow-purple-600/20"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  'Salvar Senha'
                )}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Palette size={32} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Identidade da Marca
                </h2>
                <p className="text-slate-500 mt-2 text-sm">
                  Quais são as cores principais da sua nova plataforma?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Cor Principal
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Cor Secundária
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveBranding}
                disabled={loading}
                className="w-full mt-6 bg-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-all disabled:opacity-70 shadow-lg shadow-purple-600/20"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  'Finalizar Setup'
                )}
                {!loading && <CheckCircle2 size={18} />}
              </button>
            </div>
          )}

          {/* STEP 3 - SUCCESS */}
          {step === 3 && (
            <div className="animate-fade-in text-center space-y-6 py-4">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-200">
                <CheckCircle2 size={48} className="text-white" />
              </div>

              <div>
                <h2 className="text-3xl font-bold text-slate-900">Pronto!</h2>
                <p className="text-slate-500 mt-2 text-lg">
                  Sua plataforma exclusiva está configurada.
                </p>
              </div>

              <button
                onClick={() => {
                  window.location.href = '/superadmin';
                }}
                className="w-full max-w-sm mx-auto bg-slate-900 text-white p-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
              >
                Acessar Meu Painel →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWhitelabel;
