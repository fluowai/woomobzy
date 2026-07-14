import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const capabilityItems = [
  {
    icon: Building2,
    label: 'Urbano e rural',
    text: 'Carteiras, captacao, estoque e oportunidades no mesmo painel.',
  },
  {
    icon: MapPin,
    label: 'Territorio inteligente',
    text: 'Dados de localizacao e indicadores para decisoes comerciais.',
  },
  {
    icon: ShieldCheck,
    label: 'Operacao protegida',
    text: 'Controle de acesso, contratos e rotinas com mais previsibilidade.',
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

  const { signIn, user, profile, loading: authLoading } = useAuth();

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
        'Sua conta ainda nao esta vinculada a uma empresa. Fale com o administrador para liberar o acesso ao painel.'
      );
    }
  }, [authLoading, isSuccess, profile?.organization_id, profile?.role, user]);

  if (user && authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7f4]">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          <Loader2 className="animate-spin text-[#14b87a]" size={20} />
          Preparando seu painel...
        </div>
      </div>
    );
  }

  if (user && (profile?.organization_id || profile?.role === 'superadmin')) {
    return <Navigate to="/admin" replace />;
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

  return (
    <main className="min-h-screen bg-[#f4f7f2] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(480px,1.08fr)]">
        <section className="relative hidden overflow-hidden bg-[#0b1c18] px-10 py-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0">
            <img
              src="/templates/urban/urban_ready_move.png"
              alt="Apartamento moderno gerenciado pelo WooTech Imob"
              className="h-full w-full object-cover opacity-26"
            />
            <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(11,28,24,0.98),rgba(11,28,24,0.82)_48%,rgba(20,184,122,0.36))]" />
          </div>

          <div className="relative z-10">
            <Link
              to="/"
              aria-label="Voltar para a pagina inicial"
              className="inline-flex rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8ff66] focus:ring-offset-4 focus:ring-offset-[#0b1c18]"
            >
              <img src="/logo-wootech-imob.svg" alt="WooTech Imob" className="h-12 w-auto brightness-0 invert" />
            </Link>
          </div>

          <div className="relative z-10 max-w-[560px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c8ff66]">
              <Sparkles size={15} />
              Painel operacional
            </div>

            <h1 className="mt-8 max-w-[560px] text-5xl font-black leading-[1.03] text-white xl:text-6xl">
              Uma central unica para vender, atender e gerir imoveis.
            </h1>

            <p className="mt-6 max-w-[500px] text-lg font-medium leading-relaxed text-white/76">
              {COMMERCIAL_PRODUCT_NAME} organiza leads, carteira, contratos e
              inteligencia territorial para equipes urbanas e rurais.
            </p>
          </div>

          <div className="relative z-10 grid gap-3">
            {capabilityItems.map((item) => (
              <article key={item.label} className="flex items-start gap-4 rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c8ff66] text-[#0b1c18]">
                  <item.icon size={21} />
                </span>
                <div>
                  <h2 className="mb-0 text-base font-bold text-white">{item.label}</h2>
                  <p className="mb-0 mt-1 text-sm font-medium leading-relaxed text-white/66">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[520px]">
            <div className="mb-10 flex items-center justify-between gap-4 lg:hidden">
              <Link to="/" aria-label="Voltar para a pagina inicial" className="inline-flex">
                <img src="/logo-wootech-imob.svg" alt="WooTech Imob" className="h-12 w-auto" />
              </Link>
            </div>

            <div className="rounded-[28px] border border-white bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8">
              {isSuccess ? (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="mb-0 text-sm font-bold">Acesso confirmado</p>
                    <p className="mb-0 mt-1 text-sm font-medium text-emerald-700">
                      Preparando seu ambiente de trabalho...
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mb-8">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#14b87a]">
                  Painel administrativo
                </p>
                <h2 className="mb-0 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                  Entrar no {COMMERCIAL_PRODUCT_NAME}
                </h2>
                <p className="mb-0 mt-4 text-base font-medium leading-relaxed text-slate-500">
                  Acesse seu ambiente para acompanhar leads, imoveis, contratos,
                  atendimento e operacoes.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-bold text-slate-800">
                    E-mail corporativo
                  </label>
                  <div className="relative">
                    <Mail size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-[#f8fafc] pl-12 pr-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#14b87a] focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      placeholder="voce@imobiliaria.com.br"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="password" className="block text-sm font-bold text-slate-800">
                      Senha
                    </label>
                    <Link to="/forgot-password" className="text-sm font-bold text-[#0d8f62] hover:text-[#06704b]">
                      Esqueci minha senha
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-[#f8fafc] pl-12 pr-12 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#14b87a] focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      placeholder="Digite sua senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#14b87a] focus:ring-[#14b87a]"
                  />
                  Lembrar meu e-mail neste dispositivo
                </label>

                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p className="mb-0 text-sm font-semibold leading-relaxed">{error}</p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#0b1c18] px-5 text-base font-black text-white shadow-[0_16px_36px_rgba(11,28,24,0.22)] transition hover:bg-[#123329] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={21} />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar no painel
                      <ArrowRight size={19} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#0d8f62]">
                    <ShieldCheck size={20} />
                  </span>
                  <div>
                    <p className="mb-0 text-sm font-bold text-slate-900">Acesso seguro</p>
                    <p className="mb-0 mt-1 text-sm font-medium leading-relaxed text-slate-500">
                      Use as credenciais liberadas pelo administrador da sua imobiliaria.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mb-0 mt-7 text-center text-sm font-medium text-slate-500">
                Ainda nao tem acesso?{' '}
                <Link to="/register" className="font-black text-[#0d8f62] hover:text-[#06704b]">
                  Solicitar acesso
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

function getLoginErrorMessage(err: any) {
  const message = String(err?.message || '').toLowerCase();
  const status = err?.status;

  if (status === 400 || message.includes('invalid login credentials')) {
    return 'E-mail ou senha invalidos. Se esta conta acabou de ser criada pelo SuperAdmin, confirme se a imobiliaria foi salva com uma senha de acesso.';
  }

  if (message.includes('email not confirmed')) {
    return 'E-mail ainda nao confirmado. Peca ao administrador para confirmar ou recriar o acesso.';
  }

  return err?.message || 'Nao foi possivel entrar agora. Verifique suas credenciais e tente novamente.';
}

export default Login;
