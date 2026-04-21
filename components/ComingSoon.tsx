import React, { useState } from 'react';
import { Mail, Phone, User, Send, CheckCircle2, Loader2 } from 'lucide-react';
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
      await leadService.create({
        organization_id: organizationId as any,
        name: formData.name,
        email: formData.email,
        phone: formData.whatsapp,
        source: 'Espera Imobzy',
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('Error saving lead:', err);
      setError('Ocorreu um erro ao salvar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-white overflow-hidden relative font-sans">
      {/* Background Animated Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/20 blur-[120px] rounded-full animate-pulse" />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full animate-pulse"
        style={{ animationDelay: '2s' }}
      />

      <div className="max-w-2xl w-full z-10">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6 relative">
            <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse" />
            <img
              src="/logo-imobzy.png"
              alt="Imobzy"
              className="h-20 w-auto relative z-10 drop-shadow-2xl"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase mb-4">
            {agencyName}
          </h1>
          <div className="h-1 w-20 bg-orange-500 mx-auto rounded-full mb-6" />
          <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-lg mx-auto leading-tight">
            Uma nova experiência imobiliária de elite está sendo lapidada para
            você.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />

          {success ? (
            <div className="text-center py-8 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Inscrição Confirmada!</h2>
              <p className="text-slate-400">
                Você será um dos primeiros a conhecer nossa nova plataforma.
                Fique atento ao seu e-mail e WhatsApp!
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-8 text-sm text-orange-500 font-bold uppercase tracking-widest hover:text-orange-400 transition"
              >
                Voltar
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  Seja avisado no lançamento
                </h2>
                <p className="text-sm text-slate-400">
                  Deixe seus contatos abaixo para receber acesso prioritário.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="group/input">
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-orange-500 transition-colors"
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
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative group/input">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-orange-500 transition-colors"
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
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium"
                    />
                  </div>
                  <div className="relative group/input">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-orange-500 transition-colors"
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
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-xs font-medium px-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-orange-950/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Send size={18} />
                      Garantir meu Acesso
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-4">
            <span className="h-px w-8 bg-slate-800" />
            Impulsionado por Tecnologia IMOBZY
            <span className="h-px w-8 bg-slate-800" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
