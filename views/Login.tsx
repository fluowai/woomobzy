import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  COMMERCIAL_PRODUCT_NAME,
  PLATFORM_BRAND_NAME,
  PLATFORM_TAGLINE,
} from '../utils/branding';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Loader2,
  Mail,
  Map,
  MessageSquareText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';

const loginHighlights = [
  {
    icon: Map,
    title: 'Rural com inteligencia territorial',
    desc: 'CAR, SIGEF, dossie, mapas e operacao comercial no mesmo fluxo.',
  },
  {
    icon: WalletCards,
    title: 'ERP para a operacao inteira',
    desc: 'Capte, distribua, acompanhe contratos, locacao e indicadores sem trocar de sistema.',
  },
  {
    icon: MessageSquareText,
    title: 'CRM + WhatsApp + IA',
    desc: 'Lead entra, a IA qualifica e o corretor assume com contexto e prioridade.',
  },
  {
    icon: ShieldCheck,
    title: 'Multiempresa com governanca',
    desc: 'Controle por organizacao, permissoes, integracoes e dados centralizados.',
  },
];

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { signIn, user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (
      user &&
      !authLoading &&
      !profile?.organization_id &&
      profile?.role !== 'superadmin' &&
      isSuccess
    ) {
      setIsSuccess(false);
      setError(
        'Sua conta ainda nao esta vinculada a uma empresa. Fale com o administrador para liberar o acesso ao painel.'
      );
    }
  }, [authLoading, isSuccess, profile?.organization_id, profile?.role, user]);

  if (user && authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1b17]">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#c8ff66]" />
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
      await signIn(email, password);
      setIsSuccess(true);
    } catch (err: any) {
      setError(getLoginErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#071411] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(120,255,214,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(192,255,99,0.12),_transparent_28%),linear-gradient(135deg,#071411_0%,#0d231d_50%,#10241f_100%)]" />
      <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[#14b87a]/10 blur-3xl" />
      <div className="absolute bottom-[-6rem] right-[-4rem] h-80 w-80 rounded-full bg-[#c8ff66]/10 blur-3xl" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden px-8 py-10 lg:flex lg:flex-col lg:justify-between lg:px-14 xl:px-20">
          <div className="flex items-center gap-4">
            <img
              src="/logo-wootech-imob-orbit.svg"
              alt={COMMERCIAL_PRODUCT_NAME}
              className="h-14 w-auto"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#c8ff66]">
                {PLATFORM_BRAND_NAME}
              </p>
              <h1 className="text-2xl font-bold tracking-tight">{COMMERCIAL_PRODUCT_NAME}</h1>
            </div>
          </div>

          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#c8ff66]">
              Mais que CRM: ERP imobiliario urbano + rural
            </span>
            <h2 className="mt-7 text-5xl font-bold leading-[1.02] tracking-tight text-white xl:text-6xl">
              A operacao da sua imobiliaria merece um sistema que pensa o negocio inteiro.
            </h2>
            <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-white/72">
              {COMMERCIAL_PRODUCT_NAME} conecta atendimento, estoque, marketing, locacao,
              contratos e inteligencia territorial para imobiliarias urbanas e rurais
              que precisam crescer com controle.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {loginHighlights.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition hover:border-[#c8ff66]/30 hover:bg-white/[0.06]"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c8ff66]/12 text-[#c8ff66]">
                    <item.icon size={20} />
                  </span>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-white/65">
                    {item.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {['ERP', 'CRM', 'Rural'].map((tag) => (
                <div
                  key={tag}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[10px] font-black uppercase text-white backdrop-blur"
                >
                  {tag}
                </div>
              ))}
            </div>
            <p className="text-sm font-semibold text-white/55">
              {PLATFORM_TAGLINE.replace('CRM imobiliario', 'Plataforma operacional imobiliaria')}
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-lg">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <img
                src="/logo-wootech-imob-orbit.svg"
                alt={COMMERCIAL_PRODUCT_NAME}
                className="h-12 w-auto"
              />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#c8ff66]">
                  {PLATFORM_BRAND_NAME}
                </p>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {COMMERCIAL_PRODUCT_NAME}
                </h2>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/95 p-7 text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-9">
              {isSuccess ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/92 px-8 text-center backdrop-blur-sm">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-950">Acesso confirmado</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Preparando o ambiente da sua operacao e redirecionando...
                  </p>
                  <Loader2 className="mt-5 animate-spin text-emerald-600" size={24} />
                </div>
              ) : null}

              <div className="mb-8">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">
                  Painel administrativo
                </span>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                  Entre para operar com visao completa.
                </h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                  Acesse seu ambiente para acompanhar leads, estoque, contratos,
                  atendimento e operacao rural ou urbana em um unico lugar.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="ml-1 text-sm font-bold text-slate-700">
                    E-mail corporativo
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="voce@empresa.com.br"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="ml-1 text-sm font-bold text-slate-700">Senha</label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold text-emerald-700 transition hover:text-emerald-800"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Digite sua senha"
                    />
                  </div>
                </div>

                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p className="text-sm font-semibold leading-relaxed">{error}</p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0d6b52] text-base font-bold text-white transition hover:bg-[#0a5b45] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={22} />
                  ) : (
                    <>
                      Entrar no painel
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 grid gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p className="font-semibold">
                    Operacao urbana e rural com a mesma base de dados.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p className="font-semibold">
                    CRM, ERP, marketing e atendimento conectados em um unico ambiente.
                  </p>
                </div>
              </div>

              <div className="mt-7 border-t border-slate-100 pt-7 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Ainda nao tem acesso liberado?
                </p>
                <Link
                  to="/register"
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Solicitar criacao de conta
                </Link>
              </div>
            </div>

            <p className="mt-6 text-center text-xs font-semibold text-white/40">
              &copy; {new Date().getFullYear()} {PLATFORM_BRAND_NAME}. Todos os direitos reservados.
            </p>
          </div>
        </section>
      </div>
    </div>
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
