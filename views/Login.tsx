import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Home,
  Layers3,
  Loader2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuthenticatedPanelPath } from '../src/lib/panelNavigation';

const Login: React.FC = () => {
  const { signIn, user, profile, isImpersonating, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem('woonexo-login-email');
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);
  if (user && loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9f8]">
        <Loader2 className="animate-spin text-[#ff684d]" />
      </div>
    );
  if (user && profile)
    return (
      <Navigate
        to={getAuthenticatedPanelPath(profile, isImpersonating)}
        replace
      />
    );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      if (remember) localStorage.setItem('woonexo-login-email', email.trim());
      else localStorage.removeItem('woonexo-login-email');
    } catch (err: any) {
      const message = String(err?.message || '').toLowerCase();
      setError(
        message.includes('invalid login') || err?.status === 400
          ? 'E-mail ou senha inválidos. Confira seus dados e tente novamente.'
          : message.includes('not confirmed')
            ? 'E-mail ainda não confirmado. Fale com o administrador.'
            : 'Não foi possível entrar agora. Tente novamente.'
      );
      setSubmitting(false);
    }
  };
  return (
    <main className="min-h-screen bg-[#f7f9f8] text-[#082f38]">
      <div className="grid min-h-screen lg:grid-cols-[.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-[#075861] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <img
            src="/templates/urban/urban_ready_move.png"
            alt="Operação imobiliária WooNexo"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(3,57,65,.98),rgba(4,93,101,.84)_52%,rgba(255,104,77,.35))]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="text-5xl font-black italic text-[#ff684d]">
                ∞
              </span>
              <span>
                <strong className="block text-3xl font-black leading-none">
                  WooNexo
                </strong>
                <small className="font-bold">por Wootech</small>
              </span>
            </div>
            <h1 className="mt-24 max-w-[560px] text-5xl font-black leading-[.98] tracking-[-.04em] xl:text-6xl">
              Sua operação imobiliária{' '}
              <span className="text-[#ff8a75]">começa aqui.</span>
            </h1>
            <p className="mt-6 max-w-[500px] text-lg leading-relaxed text-white/78">
              Uma plataforma completa para conectar imóveis, pessoas e
              oportunidades.
            </p>
          </div>
          <div className="relative z-10 grid gap-5">
            {[
              [
                'Imóveis urbanos e rurais',
                'Gerencie diferentes tipos de imóveis em um único ambiente.',
                Home,
              ],
              [
                'Equipe conectada',
                'Alinhe seu time, distribua demandas e acompanhe resultados.',
                Users,
              ],
              [
                'Gestão em um só lugar',
                'Leads, imóveis, negociações e agenda integrados.',
                Layers3,
              ],
            ].map(([title, text, Icon]) => (
              <div key={title as string} className="flex items-start gap-4">
                <span className="rounded-2xl bg-white/15 p-3">
                  <Icon size={24} />
                </span>
                <div>
                  <p className="text-lg font-black">{title as string}</p>
                  <p className="mt-1 max-w-[360px] text-sm leading-relaxed text-white/70">
                    {text as string}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[560px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <div className="flex items-center gap-2 text-[#082f38]">
                <span className="text-4xl font-black italic text-[#ff684d]">
                  ∞
                </span>
                <strong className="text-2xl font-black">WooNexo</strong>
              </div>
            </div>
            <div className="rounded-[28px] border border-white bg-white p-7 shadow-[0_22px_70px_rgba(8,47,56,.12)] sm:p-10">
              <div className="text-center">
                <div className="hidden justify-center lg:flex">
                  <div className="flex items-center gap-2 text-[#082f38]">
                    <span className="text-5xl font-black italic text-[#ff684d]">
                      ∞
                    </span>
                    <span>
                      <strong className="block text-3xl font-black leading-none">
                        WooNexo
                      </strong>
                      <small className="font-bold">por Wootech</small>
                    </span>
                  </div>
                </div>
                <h2 className="mt-8 text-4xl font-black tracking-[-.04em]">
                  Entrar na WooNexo
                </h2>
                <p className="mt-3 text-lg text-[#31515a]">
                  Acesse sua conta e gerencie sua operação imobiliária.
                </p>
              </div>
              <form onSubmit={submit} className="mt-9 space-y-5">
                <label className="block text-sm font-black" htmlFor="email">
                  E-mail corporativo
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@imobiliaria.com.br"
                    className="mt-2 h-14 w-full rounded-xl border border-slate-300 px-4 text-base font-medium outline-none focus:border-[#0b5962] focus:ring-4 focus:ring-[#0b5962]/10"
                  />
                </label>
                <label className="block text-sm font-black" htmlFor="password">
                  Senha
                  <div className="relative mt-2">
                    <input
                      id="password"
                      type={visible ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="h-14 w-full rounded-xl border border-slate-300 px-4 pr-12 text-base font-medium outline-none focus:border-[#0b5962] focus:ring-4 focus:ring-[#0b5962]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(!visible)}
                      aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#31515a]"
                    >
                      {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </label>
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 accent-[#ff684d]"
                    />
                    Lembrar meu e-mail
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-black text-[#08616a]"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                {error && (
                  <div
                    role="alert"
                    className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"
                  >
                    <AlertCircle size={18} className="shrink-0" />
                    {error}
                  </div>
                )}
                <button
                  disabled={submitting}
                  className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#ff684d] text-lg font-black text-white shadow-[0_10px_24px_rgba(255,104,77,.24)] hover:bg-[#f2563d] disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} /> Entrando...
                    </>
                  ) : (
                    <>
                      Entrar no painel <ArrowRight size={21} />
                    </>
                  )}
                </button>
              </form>
              <p className="mt-8 text-center text-sm font-medium">
                Ainda não tem acesso?{' '}
                <Link to="/register" className="font-black text-[#ff684d]">
                  Solicitar acesso
                </Link>
              </p>
            </div>
            <Link
              to="/"
              className="mt-8 block text-center font-bold text-[#08616a] underline"
            >
              Voltar ao site
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};
export default Login;
