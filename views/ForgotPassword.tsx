import React, { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError('Não foi possível enviar o e-mail agora. Confira o endereço e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f2] px-5 py-8 text-slate-950 sm:px-8">
      <section className="w-full max-w-[500px] rounded-[28px] border border-white bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-9">
        <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#0d8f62]">
          <ArrowLeft size={17} /> Voltar para o login
        </Link>

        {sent ? (
          <div role="status" className="space-y-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-[#0d8f62]"><CheckCircle2 size={28} /></div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Confira seu e-mail</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">Se existe uma conta para <strong>{email}</strong>, enviamos um link para criar uma nova senha.</p>
            </div>
            <Link to="/login" className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#0b1c18] px-5 text-sm font-black text-white hover:bg-[#123329]">Voltar para o login</Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#0d8f62]"><ShieldCheck size={24} /></div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#14b87a]">Recuperação de acesso</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Redefina sua senha</h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600">Informe o e-mail usado no Imobzy e enviaremos as instruções para você recuperar o acesso.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="recovery-email" className="block text-sm font-bold text-slate-800">E-mail corporativo</label>
                <div className="relative">
                  <Mail size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="recovery-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@imobiliaria.com.br" className="h-14 w-full rounded-2xl border border-slate-200 bg-[#f8fafc] pl-12 pr-4 text-base font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#14b87a] focus:bg-white focus:ring-4 focus:ring-emerald-100" />
                </div>
              </div>
              {error ? <p role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-relaxed text-rose-700">{error}</p> : null}
              <button type="submit" disabled={submitting} className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#0b1c18] px-5 text-base font-black text-white shadow-[0_16px_36px_rgba(11,28,24,0.22)] transition hover:bg-[#123329] disabled:cursor-not-allowed disabled:opacity-70">
                {submitting ? <><Loader2 className="animate-spin" size={20} /> Enviando...</> : 'Enviar link de recuperação'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
};

export default ForgotPassword;
