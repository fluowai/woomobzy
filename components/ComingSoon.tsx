import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { Mail, Phone, User, Send, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { leadService } from '../services/leads';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';

interface ComingSoonProps {
  organizationId: string;
  agencyName: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({
  organizationId,
  agencyName,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!organizationId) {
        throw new Error('Organizacao nao identificada para captura de lead.');
      }

      await leadService.create({
        organization_id: organizationId as any,
        name: formData.name,
        email: formData.email,
        phone: formData.whatsapp,
        source: `Espera ${COMMERCIAL_PRODUCT_NAME}`,
        campaign: 'Pagina de Lancamento',
        organic_channel: window.location.hostname,
      });
      setSuccess(true);
    } catch (err: any) {
      logger.error('Error saving lead:', err);
      setError('Ocorreu um erro ao salvar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050505] p-4 font-sans text-white selection:bg-indigo-500/30">
      <div className="pointer-events-none absolute top-0 h-[500px] w-full bg-gradient-to-b from-indigo-900/20 to-transparent" />
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[50%] w-[50%] animate-pulse rounded-full bg-indigo-600/20 blur-[150px]" />
      <div
        className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[50%] w-[50%] animate-pulse rounded-full bg-blue-600/10 blur-[150px]"
        style={{ animationDelay: '3s' }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0,transparent_1px)] bg-[size:6px_6px] opacity-20 mix-blend-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <div className="mb-10 w-full animate-in fade-in slide-in-from-bottom-8 text-center duration-1000">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-xs font-medium uppercase tracking-widest text-slate-300">Em Construcao</span>
          </div>

          <h1 className="mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl">
            {agencyName}
          </h1>

          <p className="mx-auto max-w-md text-lg font-light leading-relaxed text-slate-400 md:text-xl">
            Estamos preparando uma plataforma imobiliaria de alto padrao em parceria com a <strong className="font-medium text-indigo-400">{COMMERCIAL_PRODUCT_NAME}</strong>.
          </p>
        </div>

        <div className="group relative w-full animate-in rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-2xl fade-in slide-in-from-bottom-10 duration-1000 delay-150 sm:p-10">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/5 to-transparent" />
          <div className="pointer-events-none absolute left-10 right-10 top-[-1px] h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          {success ? (
            <div className="animate-in py-10 text-center zoom-in duration-500">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                <CheckCircle2 size={48} strokeWidth={1.5} />
              </div>
              <h2 className="mb-3 text-3xl font-bold text-white">Lugar Garantido!</h2>
              <p className="mb-8 leading-relaxed text-slate-400">
                Voce recebera um convite exclusivo assim que a nova plataforma estiver no ar.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="text-sm font-semibold uppercase tracking-wider text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Voltar
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h2 className="mb-2 text-2xl font-bold text-white">Lista VIP</h2>
                <p className="text-sm text-slate-400">
                  Cadastre-se para ser notificado no lancamento oficial.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative group/input">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within/input:text-indigo-400"
                    size={20}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Seu Nome Completo"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-6 font-medium text-white outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="relative group/input">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within/input:text-indigo-400"
                      size={20}
                    />
                    <input
                      type="email"
                      required
                      placeholder="E-mail"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-6 font-medium text-white outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10"
                    />
                  </div>
                  <div className="relative group/input">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within/input:text-indigo-400"
                      size={20}
                    />
                    <input
                      type="tel"
                      required
                      placeholder="WhatsApp"
                      value={formData.whatsapp}
                      onChange={(e) =>
                        setFormData({ ...formData, whatsapp: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-6 font-medium text-white outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/10"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                    <p className="text-center text-sm text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-3 rounded-xl bg-white py-4 text-sm font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all active:scale-[0.98] hover:bg-slate-200 disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Quero ser avisado
                      <Send size={16} className="ml-1" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-12 animate-in text-center fade-in duration-1000 delay-300">
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">Desenvolvido por</span>
            <img
              src="/logo-wootech-imob.svg"
              alt={COMMERCIAL_PRODUCT_NAME}
              className="h-8 cursor-pointer opacity-50 grayscale transition-opacity hover:opacity-100 hover:grayscale-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
