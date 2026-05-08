import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  LayoutDashboard,
  Phone,
  Building2,
  Mail,
  Loader2,
  Sparkles,
  MessageSquare,
  Users,
  ChevronRight
} from 'lucide-react';
import { leadService } from '../services/leads';
import { toast } from 'sonner';
import ConsultingAgent from '../components/ConsultingAgent';

const SystemSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await leadService.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        source: 'Página de Vendas - Demonstração',
        notes: `Empresa: ${formData.company} | Interesse: Demonstração Completa`,
      } as any);
      
      toast.success('Dados recebidos! Redirecionando para agendamento...');
      
      // Redirect to Typebot style qualification page
      setTimeout(() => {
        navigate(`/consultoria/qualificacao?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&company=${encodeURIComponent(formData.company)}`);
      }, 1500);
      
    } catch (error) {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const featureCards = [
    {
      icon: <LayoutDashboard className="w-6 h-6 text-emerald-600" />,
      title: "Gestão 360°",
      desc: "Controle imóveis, clientes, proprietários, corretores e negociações em um único painel."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-emerald-600" />,
      title: "Central de Atendimento",
      desc: "Organize conversas do WhatsApp, Instagram, formulários, portais e campanhas."
    },
    {
      icon: <Users className="w-6 h-6 text-emerald-600" />,
      title: "CRM Comercial",
      desc: "Acompanhe cada lead desde o primeiro contato até a visita, proposta e fechamento."
    },
    {
      icon: <Zap className="w-6 h-6 text-emerald-600" />,
      title: "Inteligência com IA",
      desc: "Use agentes inteligentes para qualificar leads, gerar mensagens e apoiar sua equipe comercial."
    }
  ];

  const bullets = [
    "Leads centralizados",
    "Atendimento organizado",
    "CRM comercial",
    "IA para qualificação",
    "Gestão de imóveis",
    "Visão 360° da operação"
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-100">
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-emerald-50/50 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35vw] h-[35vw] bg-indigo-50/30 rounded-full blur-[100px]" />
      </div>

      {/* Top Header */}
      <header className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/50">
            <span className="text-white font-black italic text-xl">I</span>
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic">IMOBZY</span>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Plataforma segura para imobiliárias</span>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        
        {/* Left Column: Value Prop */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[0.95] mb-8 tracking-tighter uppercase italic">
            A central inteligente para sua imobiliária <br />
            <span className="text-emerald-600">vender mais</span> com organização, velocidade e controle
          </h1>
          
          <p className="text-xl text-slate-700 font-bold leading-relaxed mb-6 max-w-2xl">
            A IMOBZY conecta CRM, atendimento, gestão de imóveis, automação e inteligência artificial para sua imobiliária ter uma operação comercial mais profissional.
          </p>
          
          <p className="text-base text-slate-500 font-medium leading-relaxed mb-10 max-w-2xl">
            Organize seus leads, acompanhe negociações, integre canais de atendimento e tenha uma visão completa do que acontece na sua imobiliária.
          </p>

          {/* Bullets Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 mb-16">
            {bullets.map((bullet, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span className="text-sm font-black uppercase tracking-widest text-slate-600 italic">{bullet}</span>
              </div>
            ))}
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureCards.map((card, i) => (
              <div key={i} className="group p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  {card.icon}
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-3 uppercase italic tracking-tight">{card.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Demo Form Card */}
        <div className="lg:col-span-5 relative">
          <div className="sticky top-12 bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-emerald-900/10 border border-white">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter leading-none uppercase italic">Agende uma <span className="text-emerald-600">demonstração</span> da IMOBZY</h2>
              <p className="text-slate-500 font-medium text-sm">Veja como sua imobiliária pode organizar a operação, melhorar o atendimento e vender com mais previsibilidade.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Imobiliária</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <Building2 size={18} />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                    placeholder="Nome da empresa"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">E-mail Corporativo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                    placeholder="exemplo@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">WhatsApp</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <Phone size={18} />
                  </div>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl shadow-emerald-200/50 flex items-center justify-center gap-3 mt-6 group"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    Quero conhecer a IMOBZY
                    <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-6">
                Demonstração guiada para imobiliárias que querem estruturar melhor sua operação comercial.
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Social Proof Footer */}
      <section className="border-t border-slate-100 py-12 px-6 bg-slate-50/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-60">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=${i + 50}`} alt="User" />
                </div>
              ))}
            </div>
            <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 italic">+150 imobiliárias já confiam na IMOBZY</span>
          </div>
          
          <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
            © {new Date().getFullYear()} IMOBZY Central de Inteligência Comercial
          </div>
        </div>
      </section>

      {/* AI Assistant Agent */}
      <ConsultingAgent />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.6s ease-out forwards; }
      `}} />
    </div>
  );
};

export default SystemSalesPage;
