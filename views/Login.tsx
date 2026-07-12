import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Lock,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

const featureItems = [
  {
    icon: Building2,
    title: 'Gestao Urbana e Rural',
    text: 'Controle completo de imoveis, estoque e oportunidades em um so lugar.',
  },
  {
    icon: CheckCircle2,
    title: 'CRM Inteligente',
    text: 'Acompanhe leads, negociacoes e funil com automacoes que geram resultado.',
  },
  {
    icon: ShieldCheck,
    title: 'Contratos e Locacao',
    text: 'Crie, acompanhe e gerencie contratos com seguranca e praticidade.',
  },
  {
    icon: MapPin,
    title: 'Inteligencia Territorial',
    text: 'Mapas, indicadores e dados para decisoes mais assertivas.',
  },
];

const stats = [
  { value: '+ 1.200', label: 'Imobiliarias atendidas' },
  { value: '+ 150.000', label: 'Imoveis gerenciados' },
  { value: '+ 3.5 mi', label: 'Leads processados' },
  { value: '99,9%', label: 'Uptime garantido' },
];

const BrandLockup = () => (
  <div className="flex items-center gap-4">
    <div className="relative h-16 w-24 shrink-0">
      <span className="absolute left-0 top-0 text-6xl font-black leading-none tracking-[-0.18em] text-[#ff7a00]">
        W
      </span>
      <span className="absolute left-9 top-0 text-6xl font-black leading-none tracking-[-0.18em] text-white">
        W
      </span>
      <span className="absolute bottom-0 left-7 h-2 w-10 rounded-full bg-[#ff7a00]" />
    </div>
    <div className="leading-none">
      <p className="text-[1.85rem] font-black tracking-tight text-white">WOOTECH</p>
      <p className="text-[1.85rem] font-black tracking-tight text-[#ff7a00]">IMOB</p>
    </div>
  </div>
);

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
      <div className="flex min-h-screen items-center justify-center bg-[#090909]">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#ff7a00]" />
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
    <div className="min-h-screen overflow-hidden bg-[#060606] text-white">
      <div className="relative min-h-screen bg-[#060606]">
        <div className="absolute inset-y-0 right-0 hidden w-[50%] lg:block">
          <img
            src="/templates/urban/urban_ready_move.png"
            alt="Casa moderna WooTech Imob"
            className="h-full w-full object-cover opacity-88"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060606]/45 via-black/10 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-black/45" />
        </div>

        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#060606_0%,#070707_45%,rgba(6,6,6,0.52)_54%,rgba(6,6,6,0)_70%)] lg:block" />

        <div className="absolute left-[47%] top-0 hidden h-full w-[12%] lg:block">
          <div className="absolute left-[48%] top-[-12%] h-[124%] w-7 -rotate-[32deg] rounded-full bg-[#ff7a00]" />
          <div className="absolute left-[28%] top-[-12%] h-[124%] w-px -rotate-[32deg] rounded-full bg-white/25" />
          <div className="absolute left-[-10%] top-[13%] h-[72%] w-[86%] rounded-[4rem] border border-[#ff7a00]/45" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-[1500px] flex-col justify-between px-6 py-7 lg:px-10">
          <div className="grid flex-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_500px]">
            <section className="max-w-[690px] pt-3 lg:pl-5">
              <div className="mb-8">
                <BrandLockup />
              </div>

              <div className="inline-flex rounded-full border border-[#ff7a00]/55 bg-[#1a120d] px-5 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#ff9a3d]">
                Mais que CRM: gestao completa para imobiliarias
              </div>

              <h1 className="mt-8 max-w-[660px] text-4xl font-black leading-[1.03] tracking-tight text-white md:text-5xl xl:text-6xl">
                A operacao da sua <span className="text-[#ff7a00]">imobiliaria</span>, elevada a outro nivel.
              </h1>

              <p className="mt-6 max-w-[610px] text-lg font-medium leading-relaxed text-white/82 xl:text-xl">
                {COMMERCIAL_PRODUCT_NAME} integra atendimento, estoque, marketing,
                contratos e inteligencia territorial em um unico sistema. Mais
                controle, mais agilidade, mais resultado.
              </p>

              <div className="mt-9 grid max-w-[660px] gap-x-7 gap-y-6 md:grid-cols-2">
                {featureItems.map((item) => (
                  <article key={item.title} className="flex items-start gap-4">
                    <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#ff7a00]/55 bg-[#141414] text-[#ff7a00]">
                      <item.icon size={23} />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-white/72 xl:text-base">
                        {item.text}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-7 max-w-[650px] rounded-[1.5rem] border border-white/10 bg-white/[0.05] px-6 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff7a00] text-white shadow-[0_10px_30px_rgba(255,122,0,0.35)]">
                    <ShieldCheck size={24} />
                  </span>
                  <div>
                    <p className="text-xl font-bold text-white">Seguro, confiavel e sempre disponivel.</p>
                    <p className="mt-1 text-base font-medium text-white/72">
                      Seus dados protegidos com tecnologia de ponta.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="relative z-20 w-full max-w-[500px] justify-self-end">
              <div className="relative overflow-hidden rounded-[2rem] bg-white p-8 text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                {isSuccess ? (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 px-8 text-center backdrop-blur-sm">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-[#ff7a00]">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-950">Acesso confirmado</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      Preparando seu ambiente e redirecionando...
                    </p>
                    <Loader2 className="mt-5 animate-spin text-[#ff7a00]" size={24} />
                  </div>
                ) : null}

                <p className="text-sm font-black uppercase tracking-[0.28em] text-[#ff7a00]">
                  Painel administrativo
                </p>
                <h2 className="mt-6 text-4xl font-black leading-[1.02] tracking-tight text-[#141414] xl:text-5xl">
                  Bem-vindo(a) ao <span className="text-[#ff7a00]">WooTech Imob</span>
                </h2>
                <p className="mt-5 text-lg font-medium leading-relaxed text-slate-500">
                  Acesse seu ambiente para acompanhar leads, estoque, contratos,
                  atendimento e operacoes urbanas e rurais.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div className="space-y-3">
                    <label className="text-base font-bold text-slate-700">E-mail corporativo</label>
                    <div className="relative">
                      <Mail size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7a00]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-semibold text-slate-900 outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-orange-100"
                        placeholder="seu@email.com.br"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-base font-bold text-slate-700">Senha</label>
                      <Link to="/forgot-password" className="text-sm font-bold text-[#ff7a00] hover:text-[#eb6f00]">
                        Esqueci minha senha
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7a00]" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-semibold text-slate-900 outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-orange-100"
                        placeholder="Digite sua senha"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 text-lg font-medium text-slate-500">
                    <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-[#ff7a00] focus:ring-[#ff7a00]" />
                    Lembrar de mim
                  </label>

                  {error ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
                      <AlertCircle size={18} className="mt-0.5 shrink-0" />
                      <p className="text-sm font-semibold leading-relaxed">{error}</p>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-[3.75rem] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff7a00] to-[#ff5f0a] py-4 text-lg font-black text-white transition hover:from-[#f17200] hover:to-[#f25a00] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      <>
                        Entrar no painel
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-9 flex items-center gap-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  Ou acesse com
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="mt-6 space-y-3">
                  <button type="button" className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 text-lg font-bold text-slate-700 transition hover:bg-slate-50">
                    <span className="text-xl">G</span>
                    Continuar com Google
                  </button>
                  <button type="button" className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 text-lg font-bold text-slate-700 transition hover:bg-slate-50">
                    <span className="text-xl">M</span>
                    Continuar com Microsoft
                  </button>
                </div>

                <div className="mt-8 text-center text-lg font-medium text-slate-500">
                  Ainda nao tem acesso?{' '}
                  <Link to="/register" className="font-black text-[#ff7a00] hover:text-[#eb6f00]">
                    Solicitar acesso
                  </Link>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-7 grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/25 p-5 lg:grid-cols-4 lg:px-8">
            {stats.map((item) => (
              <div key={item.label} className="flex items-center gap-4 border-white/10 lg:border-r lg:last:border-r-0">
                <span className="text-[#ff7a00]">
                  <Building2 size={28} />
                </span>
                <div>
                  <p className="text-3xl font-black text-[#ff7a00]">{item.value}</p>
                  <p className="text-base font-medium text-white/75">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
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
