import React, { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ResetPassword: React.FC = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirmation) return setError('As senhas não coincidem.');
    setSubmitting(true);
    try {
      await updatePassword(password);
      navigate('/login', { replace: true });
    } catch {
      setError('O link expirou ou não é mais válido. Solicite uma nova recuperação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f2] px-5 py-8 text-slate-950 sm:px-8">
      <section className="w-full max-w-[500px] rounded-[28px] border border-white bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-9">
        <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#0d8f62]"><ArrowLeft size={17} /> Voltar para o login</Link>
        <div className="mb-8"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#0d8f62]"><CheckCircle2 size={24} /></div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Crie uma nova senha</h1><p className="mt-4 text-base leading-relaxed text-slate-600">Escolha uma senha forte para proteger seu acesso ao Imobzy.</p></div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-2 text-sm font-bold text-slate-800" htmlFor="new-password">Nova senha<input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-14 w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 text-base outline-none focus:border-[#14b87a] focus:bg-white focus:ring-4 focus:ring-emerald-100" /></label>
          <label className="block space-y-2 text-sm font-bold text-slate-800" htmlFor="confirm-password">Confirme a nova senha<input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-14 w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 text-base outline-none focus:border-[#14b87a] focus:bg-white focus:ring-4 focus:ring-emerald-100" /></label>
          {error ? <p role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold leading-relaxed text-rose-700">{error}</p> : null}
          <button type="submit" disabled={submitting} className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#0b1c18] px-5 text-base font-black text-white hover:bg-[#123329] disabled:cursor-not-allowed disabled:opacity-70">{submitting ? <><Loader2 className="animate-spin" size={20} /> Salvando...</> : 'Salvar nova senha'}</button>
        </form>
      </section>
    </main>
  );
};

export default ResetPassword;
