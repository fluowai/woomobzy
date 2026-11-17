import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthenticatedPanelPath } from '../src/lib/panelNavigation';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Mail,
  Monitor,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import WooTechLogo from '../components/WooTechLogo';

const features = [
  {
    icon: BarChart3,
    title: 'Gestão completa',
    description: 'Controle total da sua imobiliária.',
  },
  {
    icon: Zap,
    title: 'Produtividade e automação',
    description: 'Processos mais rápidos e inteligentes.',
  },
  {
    icon: ShieldCheck,
    title: 'Segurança e estabilidade',
    description: 'Seus dados protegidos 24/7.',
  },
];

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    signIn,
    user,
    profile,
    isImpersonating,
    loading: authLoading,
  } = useAuth();

  useEffect(() => {
    const savedEmail = localStorage.getItem('wootech-login-email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (
      user &&
      !authLoading &&
      !profile?.organization_id &&
      profile?.role !== 'superadmin' &&
      isSuccess
    ) {
      setIsSuccess(false);
      setSubmitting(false);
      setError(
        'Sua conta ainda não está vinculada a uma empresa. Fale com o administrador para liberar o acesso ao painel.'
      );
    }
  }, [authLoading, isSuccess, profile?.organization_id, profile?.role, user]);

  if (user && authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1017]">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-[#161b26] px-6 py-5 text-sm font-semibold text-white shadow-2xl">
          <Loader2 className="animate-spin text-[#ff6a00]" size={22} />
          Preparando seu painel...
        </div>
      </div>
    );
  }

  if (user && profile) {
    return (
      <Navigate
        to={getAuthenticatedPanelPath(profile, isImpersonating)}
        replace
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      if (rememberMe) {
        localStorage.setItem('wootech-login-email', email.trim());
      } else {
        localStorage.removeItem('wootech-login-email');
      }
      setIsSuccess(true);
    } catch (err: any) {
      setError(getLoginErrorMessage(err));
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('O login corporativo via Google deve ser configurado no painel de administração da sua imobiliária.');
  };

  return (
    <main className="relative min-h-screen w-full bg-[#0b0e14] text-white flex flex-col justify-center overflow-hidden">
      {/* Dynamic ambient glowing neon curves and blurred lights in background */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#ff5500]/20 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[#ff7a1a]/15 blur-[140px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] min-h-screen items-center justify-between px-6 py-10 lg:px-16 xl:px-24">
        {/* Left Side: Brand and Value Proposition */}
        <div className="hidden lg:flex flex-col justify-between max-w-[620px] py-6">
          {/* Top Logo */}
          <Link to="/" className="inline-block transition-transform hover:scale-[1.02]">
            <WooTechLogo variant="dark" subtitle="crm-erp" size="lg" />
          </Link>

          {/* Center Content */}
          <div className="my-10 space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-zinc-300 backdrop-blur-md">
              <Monitor size={15} className="text-[#ff6a00]" />
              Painel Operacional
            </div>

            {/* Headline */}
            <h1 className="text-4xl xl:text-5xl font-black leading-[1.12] tracking-tight text-white">
              Acesse seu painel e gerencie toda a{' '}
              <span className="text-[#ff6a00] drop-shadow-[0_2px_15px_rgba(255,106,0,0.35)]">
                operação imobiliária.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base xl:text-lg font-medium leading-relaxed text-zinc-400">
              Leads, imóveis, vendas, locações, contratos, financeiro e muito mais, em um só lugar.
            </p>

            {/* 3 Value Proposition Cards */}
            <div className="space-y-4 pt-4">
              {features.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ff6a00]/15 text-[#ff6a00] border border-[#ff6a00]/30 shadow-[0_0_15px_rgba(255,106,0,0.15)]">
                      <Icon size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-wide">
                        {feat.title}
                      </h3>
                      <p className="text-sm font-medium text-zinc-400">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Architectural building with neon orange ambient wave accent */}
          <div className="relative mt-4 h-48 w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <img
              src="/templates/urban/urban_ready_move.png"
              alt="WooTech Imob Imóveis"
              className="h-full w-full object-cover object-center opacity-40 brightness-90 contrast-125"
            />
            {/* Glowing neon orange arc overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-transparent to-transparent" />
            <svg
              className="absolute inset-0 h-full w-full pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 400 160"
            >
              <path
                d="M-20,140 Q160,20 420,90"
                fill="none"
                stroke="#ff6a00"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="opacity-90 drop-shadow-[0_0_12px_#ff6a00]"
              />
            </svg>
          </div>
        </div>

        {/* Right Side: Clean White Floating Login Card */}
        <div className="w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-[460px] rounded-[32px] bg-white p-8 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.45)] text-zinc-900 border border-zinc-100">
            {/* Header: Centered Logo */}
            <div className="flex flex-col items-center text-center">
              <WooTechLogo variant="light" subtitle="crm-erp" size="md" />

              <h2 className="mt-6 text-2xl sm:text-[26px] font-black tracking-tight text-zinc-950">
                Entrar no WooTech Imob
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-zinc-500">
                Acesse sua conta para acompanhar leads, imóveis, contratos, atendimentos e operações.
              </p>
            </div>

            {/* Success alert */}
            {isSuccess && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                <div className="text-xs sm:text-sm font-semibold">
                  Acesso confirmado! Preparando seu ambiente...
                </div>
              </div>
            )}

            {/* Error alert */}
            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-700">
                <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={18} />
                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs sm:text-sm font-bold text-zinc-800"
                >
                  E-mail corporativo
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/20"
                    placeholder="seuemail@empresa.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs sm:text-sm font-bold text-zinc-800"
                  >
                    Senha
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#ff6a00] transition hover:text-[#e05800] hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-11 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/20"
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 transition hover:text-zinc-700"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-[#ff6a00] focus:ring-[#ff6a00] cursor-pointer"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-xs sm:text-sm font-medium text-zinc-600 cursor-pointer select-none"
                >
                  Lembrar meu e-mail neste dispositivo
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5500] via-[#ff6a00] to-[#ff7a00] px-6 text-sm sm:text-base font-bold text-white shadow-[0_8px_24px_rgba(255,106,0,0.35)] transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={19} />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar no painel
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-zinc-200" />
              <span className="absolute bg-white px-3 text-xs font-semibold uppercase text-zinc-400">
                ou
              </span>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.99] cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Entrar com o Google
            </button>

            {/* Footer */}
            <p className="mt-6 text-center text-xs sm:text-sm font-medium text-zinc-500">
              Ainda não tem acesso?{' '}
              <Link
                to="/register"
                className="font-bold text-[#ff6a00] hover:text-[#e05800] hover:underline"
              >
                Solicitar acesso
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

function getLoginErrorMessage(err: any) {
  const message = String(err?.message || '').toLowerCase();
  const status = err?.status;

  if (status === 400 || message.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos. Confirme suas credenciais com o administrador da sua imobiliária.';
  }

  if (message.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada ou contate o suporte.';
  }

  return (
    err?.message ||
    'Não foi possível entrar agora. Verifique suas credenciais e tente novamente.'
  );
}

export default Login;
