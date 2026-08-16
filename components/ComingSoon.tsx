import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import {
  Mail,
  Phone,
  User,
  Send,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { leadService } from '../services/leads';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';

interface ResellerBranding {
  name?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

interface ComingSoonProps {
  organizationId: string;
  agencyName: string;
  resellerBranding?: ResellerBranding | null;
}

const DEFAULT_PRIMARY = '#6366f1';
const DEFAULT_SECONDARY = '#8b5cf6';

function hexToRgb(hex: string) {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return { r: 99, g: 102, b: 241 };
  const int = parseInt(h, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ComingSoon: React.FC<ComingSoonProps> = ({
  organizationId,
  agencyName,
  resellerBranding,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reseller = resellerBranding || null;
  const primary = reseller?.primaryColor || DEFAULT_PRIMARY;
  const secondary = reseller?.secondaryColor || DEFAULT_SECONDARY;
  const footerLogo = reseller?.logoUrl || '/logo-wootech-imob.svg';
  const footerName = reseller?.name || COMMERCIAL_PRODUCT_NAME;

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

  const brandCss = {
    '--cs-primary': primary,
    '--cs-primary-20': rgba(primary, 0.2),
    '--cs-primary-12': rgba(primary, 0.12),
    '--cs-primary-08': rgba(primary, 0.08),
    '--cs-primary-50': rgba(primary, 0.5),
    '--cs-primary-text': primary,
    '--cs-secondary-16': rgba(secondary, 0.16),
  } as React.CSSProperties;

  return (
    <div
      className="coming-soon-branded relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050505] p-4 font-sans text-white selection:bg-indigo-500/30"
      style={brandCss}
    >
      <style>{`
        .coming-soon-branded .cs-top-grad {
          background: linear-gradient(to bottom, var(--cs-primary-20), transparent);
        }
        .coming-soon-branded .cs-blob-1 {
          background: var(--cs-primary-20);
        }
        .coming-soon-branded .cs-blob-2 {
          background: var(--cs-secondary-16);
        }
        .coming-soon-branded .cs-icon {
          color: var(--cs-primary-text);
        }
        .coming-soon-branded .cs-accent {
          color: var(--cs-primary-text);
        }
        .coming-soon-branded .cs-card-line {
          background: linear-gradient(to right, transparent, var(--cs-primary-50), transparent);
        }
        .coming-soon-branded .cs-input-icon {
          color: rgba(100, 116, 139, 1);
          transition: color 150ms;
        }
        .coming-soon-branded .group\\/input:focus-within .cs-input-icon {
          color: var(--cs-primary-text);
        }
        .coming-soon-branded .cs-input:focus {
          border-color: var(--cs-primary-50);
          background: rgba(255, 255, 255, 0.1);
        }
        .coming-soon-branded .cs-btn {
          background: var(--cs-primary);
          color: #ffffff;
          transition: filter 150ms, transform 150ms;
        }
        .coming-soon-branded .cs-btn:hover {
          filter: brightness(1.1);
        }
        .coming-soon-branded .cs-btn:active {
          transform: scale(0.98);
        }
      `}</style>

      <div className="pointer-events-none absolute top-0 h-[500px] w-full cs-top-grad" />
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[50%] w-[50%] animate-pulse rounded-full blur-[150px] cs-blob-1" />
      <div
        className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[50%] w-[50%] animate-pulse rounded-full blur-[150px] cs-blob-2"
        style={{ animationDelay: '3s' }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0,transparent_1px)] bg-[size:6px_6px] opacity-20 mix-blend-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <div className="mb-10 w-full animate-in fade-in slide-in-from-bottom-8 text-center duration-1000">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
            <Sparkles size={14} className="cs-icon" />
            <span className="text-xs font-medium uppercase tracking-widest text-slate-300">
              Em Construcao
            </span>
          </div>

          <h1 className="mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl">
            {agencyName}
          </h1>

          <p className="mx-auto max-w-md text-lg font-light leading-relaxed text-slate-400 md:text-xl">
            Estamos preparando uma plataforma imobiliaria de alto padrao em
            parceria com a{' '}
            <strong className="cs-accent font-medium">
              {COMMERCIAL_PRODUCT_NAME}
            </strong>
            .
          </p>
        </div>

        <div className="group relative w-full animate-in rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-2xl fade-in slide-in-from-bottom-10 duration-1000 delay-150 sm:p-10">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent" />
          <div className="pointer-events-none absolute left-10 right-10 top-[-1px] h-px cs-card-line opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          {success ? (
            <div className="animate-in py-10 text-center zoom-in duration-500">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                <CheckCircle2 size={48} strokeWidth={1.5} />
              </div>
              <h2 className="mb-3 text-3xl font-bold text-white">
                Lugar Garantido!
              </h2>
              <p className="mb-8 leading-relaxed text-slate-400">
                Voce recebera um convite exclusivo assim que a nova plataforma
                estiver no ar.
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
                <h2 className="mb-2 text-2xl font-bold text-white">
                  Lista VIP
                </h2>
                <p className="text-sm text-slate-400">
                  Cadastre-se para ser notificado no lancamento oficial.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative group/input">
                  <User
                    className="cs-input-icon absolute left-4 top-1/2 -translate-y-1/2"
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
                    className="cs-input w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-6 font-medium text-white outline-none transition-all placeholder:text-slate-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="relative group/input">
                    <Mail
                      className="cs-input-icon absolute left-4 top-1/2 -translate-y-1/2"
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
                      className="cs-input w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-6 font-medium text-white outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                  <div className="relative group/input">
                    <Phone
                      className="cs-input-icon absolute left-4 top-1/2 -translate-y-1/2"
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
                      className="cs-input w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-6 font-medium text-white outline-none transition-all placeholder:text-slate-500"
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
                  className="cs-btn mt-2 flex w-full items-center justify-center gap-3 rounded-xl py-4 text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-70"
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
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
              Desenvolvido por
            </span>
            <img
              src={footerLogo}
              alt={footerName}
              className="h-8 cursor-pointer opacity-50 grayscale transition-opacity hover:opacity-100 hover:grayscale-0"
            />
            {reseller?.name && (
              <span className="text-xs font-semibold text-slate-400">
                {reseller.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
