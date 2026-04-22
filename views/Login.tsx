import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const { settings } = useSettings();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);

  // A2: If already authenticated, redirect away from login
  // This also handles redirection AFTER signIn completes (AuthContext sets profile)
  useEffect(() => {
    if (authLoading || !justSignedIn) return; // Only redirect after a deliberate login
    if (!user || !profile) return;

    console.log('✅ [Login] Profile loaded via AuthContext, redirecting...', {
      role: profile.role,
      org: profile.organization?.niche,
    });

    if (profile.role === 'superadmin') {
      navigate('/superadmin', { replace: true });
    } else if (profile.role === 'admin') {
      // Admins should be allowed to the basic dashboard to manage settings
      navigate('/admin', { replace: true });
    } else if (!profile.organization_id) {
      navigate('/onboarding', { replace: true });
    } else {
      navigate('/admin', { replace: true });
    }
  }, [user, profile, authLoading, justSignedIn, navigate]);

  // A2: If user navigates to /login while already authenticated (not after a fresh login)
  if (!authLoading && user && profile && !justSignedIn) {
    console.log(
      '🔄 [Login] Already authenticated, redirecting away from login page.'
    );
    if (profile.role === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    }
    if (!profile.organization_id) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🚀 [Login] Starting signIn for:', email);
      await signIn(email, password);
      setJustSignedIn(true);
      console.log(
        '✅ [Login] signIn successful. Waiting for AuthContext to load profile...'
      );
      
      // Failsafe: if profile doesn't load in 8 seconds, allow retry
      setTimeout(() => {
        if (loading) {
          console.warn('⚠️ [Login] Profile loading timed out.');
          setLoading(false);
          setJustSignedIn(false);
          setError('O carregamento do perfil está demorando mais que o esperado. Tente novamente.');
        }
      }, 8000);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.message || 'Erro ao fazer login. Verifique suas credenciais.'
      );
      setLoading(false);
    }
    // Note: we don't setLoading(false) on success — the redirect will unmount this component
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse-subtle" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />

      <div className="w-full max-w-md px-6 relative z-10 animate-slide-up">
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-block hover-lift">
            <img
              src="/logo-imobzy.png"
              alt="IMOBZY"
              className="h-20 w-auto mx-auto mb-6"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.dataset.hasError) return;
                target.dataset.hasError = 'true';
                target.style.display = 'none'; // Hide if missing to avoid loops
              }}
            />
          </Link>
          <h1 className="h1 text-text-primary tracking-tight mb-2">
            Bem-vindo ao <span className="text-primary">{settings.agencyName || 'IMOBZY'}</span>
          </h1>
          <p className="body text-text-secondary font-medium">
            Gerencie sua imobiliária com inteligência
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 md:p-10">
          <div className="flex items-center justify-center mb-8">
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <Lock size={32} className="text-primary" />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="text-red-500 mt-0.5" />
              <p className="text-sm text-red-200 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase text-text-tertiary tracking-widest ml-1">
                E-mail de Acesso
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors"
                  size={20}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-12"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="block text-xs font-semibold uppercase text-text-tertiary tracking-widest">
                  Senha
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors"
                  size={20}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-12"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || justSignedIn}
              className="btn btn-primary w-full text-sm uppercase tracking-widest py-4 h-14"
            >
              {loading || justSignedIn ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                'Entrar no Painel'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-border-subtle text-center">
            <p className="text-sm text-text-secondary">
              Ainda não tem uma conta?{' '}
              <Link
                to="/register"
                className="font-bold text-primary hover:text-primary-light transition-colors"
              >
                Cadastre-se agora
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Site */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-sm text-text-tertiary hover:text-white font-medium transition-colors inline-flex items-center gap-2"
          >
            ← Voltar para o site institucional
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
