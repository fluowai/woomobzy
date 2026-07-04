import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { Mail, Phone, User, Send, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { leadService } from '../services/leads';

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
        source: 'Espera ImobFluow',
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
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 text-white overflow-hidden relative font-sans selection:bg-indigo-500/30">
      {/* Premium Background Effects */}
      <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full animate-pulse pointer-events-none" />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse pointer-events-none"
        style={{ animationDelay: '3s' }}
      />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0,transparent_1px)] bg-[size:6px_6px] opacity-20 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-xl w-full z-10 flex flex-col items-center relative">
        
        {/* Header Content */}
        <div className="text-center mb-10 w-full animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-xs font-medium tracking-widest uppercase text-slate-300">Em Construção</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            {agencyName}
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 font-light max-w-md mx-auto leading-relaxed">
            Estamos preparando uma plataforma imobiliária de alto padrão em parceria com a <strong className="text-indigo-400 font-medium">ImobFluow</strong>.
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full bg-black/40 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl relative group animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-3xl pointer-events-none" />
          <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {success ? (
            <div className="text-center py-10 animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                <CheckCircle2 size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-white">Lugar Garantido!</h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                Você receberá um convite exclusivo assim que a nova plataforma estiver no ar.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="text-sm text-indigo-400 font-semibold uppercase tracking-wider hover:text-indigo-300 transition-colors"
              >
                Voltar
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold mb-2 text-white">Lista VIP</h2>
                <p className="text-sm text-slate-400">
                  Cadastre-se para ser notificado no lançamento oficial.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative group/input">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors"
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-6 outline-none focus:border-indigo-500/50 focus:bg-white/10 text-white placeholder:text-slate-500 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="relative group/input">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors"
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
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-6 outline-none focus:border-indigo-500/50 focus:bg-white/10 text-white placeholder:text-slate-500 transition-all font-medium"
                    />
                  </div>
                  <div className="relative group/input">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors"
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
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-6 outline-none focus:border-indigo-500/50 focus:bg-white/10 text-white placeholder:text-slate-500 transition-all font-medium"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-sm text-center">
                      {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-slate-200 py-4 rounded-xl font-bold uppercase text-sm tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] mt-2 disabled:opacity-70"
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

        {/* Footer */}
        <div className="mt-12 text-center animate-in fade-in duration-1000 delay-300">
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">Desenvolvido por</span>
            <img
              src="/logo-imobfluow.svg"
              alt="ImobFluow"
              className="h-8 opacity-50 hover:opacity-100 transition-opacity cursor-pointer grayscale hover:grayscale-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
