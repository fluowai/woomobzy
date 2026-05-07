import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  LayoutDashboard,
  ArrowRight,
  Phone,
  Building2,
  Calendar,
  Sparkles,
  Play
} from 'lucide-react';
import { leadService } from '../services/leads';
import { toast } from 'sonner';
import ConsultingAgent from '../components/ConsultingAgent';

const SystemSalesPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    interest: 'Consultoria de Implementação',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await leadService.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        source: 'Página de Vendas - Consultoria',
        notes: `Empresa: ${formData.company} | Interesse: ${formData.interest}`,
      } as any);
      setIsSuccess(true);
      toast.success('Solicitação enviada com sucesso!');
      setSubmittedLead({ ...formData });
    } catch (error) {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: <LayoutDashboard className="w-5 h-5 text-emerald-600" />,
      title: "Gestão 360º",
      desc: "Controle total de imóveis rurais e urbanos em um só lugar."
    },
    {
      icon: <Zap className="w-5 h-5 text-emerald-600" />,
      title: "IA Integrada",
      desc: "Automação inteligente de leads e respostas via WhatsApp."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: "Segurança Total",
      desc: "Dados protegidos com criptografia de ponta a ponta."
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      title: "Multi-inquilino",
      desc: "Configure suas próprias APIs do Google e Groq por empresa."
    }
  ];

  return (
    <div className="sales-page-wrapper" style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 25%, #f0fdfa 50%, #f5f3ff 75%, #fdf4ff 100%)',
      fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-5%',
        width: '35vw',
        height: '35vw',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0) 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        zIndex: 0
      }} />

      {/* Main Content Split Layout */}
      <div className="flex w-full z-10">
        
        {/* Left Side: Branding & Value Proposition */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-20 relative">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                   <span className="text-emerald-600 font-black italic">I</span>
                </div>
              </div>
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                IMOB<span className="text-emerald-600">ZY</span>
              </span>
            </div>

            <h1 className="text-5xl font-extrabold text-slate-900 leading-tight mb-6 uppercase italic tracking-tighter">
              Transforme sua imobiliária com <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 underline decoration-emerald-200 decoration-8 underline-offset-8">inteligência</span>
            </h1>
            
            <p className="text-lg text-slate-600 mb-12 leading-relaxed font-medium">
              A plataforma definitiva que integra IA Generativa, CRM de alta performance e sites ultra-personalizáveis. Implementação guiada para resultados imediatos.
            </p>

            <div className="grid grid-cols-2 gap-8 mb-12">
              {features.map((f, i) => (
                <div key={i} className="group p-5 rounded-2xl border border-white/50 bg-white/40 backdrop-blur-sm hover:bg-white/70 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="mb-3 p-2 w-fit rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1 uppercase text-sm tracking-wide">{f.title}</h3>
                  <p className="text-xs text-slate-500 font-medium">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-6">
               <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                      <img src={`https://i.pravatar.cc/100?u=${i + 20}`} alt="User" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">+150 Imobiliárias</span>
                  <span className="text-xs">Implementadas com sucesso este ano</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Consulting Form (styled like Login) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-lg">
            {/* Mobile Logo Only */}
            <div className="lg:hidden flex flex-col items-center mb-10">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-200 mb-4">
                 <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                   <span className="text-emerald-600 font-black text-2xl italic">I</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">IMOBZY</h2>
            </div>

            <div className="bg-white/70 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-emerald-900/5 border border-white relative overflow-hidden">
              {/* Success Overlay */}
              {isSuccess && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-inner shadow-emerald-200">
                    <CheckCircle2 size={48} className="animate-bounce" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">Solicitação Recebida!</h3>
                  <p className="text-slate-600 font-medium mb-8">Nossa equipe entrará em contato em breve. Enquanto isso, nossa assistente IA Clara está disponível para tirar suas dúvidas.</p>
                  <button 
                    onClick={() => setIsSuccess(false)}
                    className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
                  >
                    Entendido
                  </button>
                </div>
              )}

              <div className="mb-10 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                  <Sparkles size={14} />
                  Acesso Exclusivo
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter leading-none uppercase italic">Agendar <span className="text-emerald-600">Consultoria</span></h2>
                <p className="text-slate-500 font-medium">Preencha os dados abaixo para iniciar sua jornada de implementação guiada.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Seu Nome</label>
                    <div className="relative group">
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="block w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                        placeholder="Ex: João Silva"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Imobiliária</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                        <Building2 size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="block w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                        placeholder="Nome da Empresa"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">E-mail Corporativo</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="block w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                      placeholder="seu@email.com.br"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">WhatsApp de Contato</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <Phone size={18} />
                    </div>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="block w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-emerald-100 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group mt-4"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      Solicitar Consultoria
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <Calendar size={12} className="text-emerald-600" /> Vagas limitadas para este mês
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                &copy; {new Date().getFullYear()} IMOBZY Technology • Ecosystem v4.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Agent */}
      <ConsultingAgent initialLeadData={submittedLead} />

      <style dangerouslySetInnerHTML={{ __html: `
        .sales-page-wrapper {
          transition: background 0.5s ease;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default SystemSalesPage;
