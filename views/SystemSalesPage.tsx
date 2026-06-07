import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Globe2,
  Home,
  Instagram,
  LayoutDashboard,
  Loader2,
  Mail,
  Menu,
  MessageSquare,
  Phone,
  Plug,
  Quote,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const menuItems = [
  { label: 'Plataforma', target: 'plataforma' },
  { label: 'Soluções', target: 'beneficios' },
  { label: 'Recursos', target: 'como-funciona' },
  { label: 'Preços', target: 'demo-form' },
];

const metrics = [
  { icon: TrendingUp, value: '+250%', label: 'Produtividade' },
  { icon: Clock3, value: '-60%', label: 'Tempo Resposta' },
  { icon: Workflow, value: '+1.8M', label: 'Leads/Mês' },
  { icon: ShieldCheck, value: '99,9%', label: 'Uptime' },
];

const benefits = [
  {
    icon: LayoutDashboard,
    title: 'CRM Visual e Intuitivo',
    text: 'Acompanhe captação, atendimento e propostas em um só lugar.',
  },
  {
    icon: MessageSquare,
    title: 'Atendimento Centralizado',
    text: 'WhatsApp, site, portais e Instagram integrados no mesmo funil.',
  },
  {
    icon: Bot,
    title: 'Qualificação com IA',
    text: 'Identifique os leads mais quentes e priorize seu tempo.',
  },
  {
    icon: Home,
    title: 'Gestão Inteligente de Imóveis',
    text: 'Controle de mídia, documentos e portais de forma simples.',
  },
];

const beforeItems = [
  'Leads perdidos no WhatsApp',
  'Falta de visão geral de vendas',
  'Corretores esquecendo follow-ups',
];

const afterItems = [
  'Tudo centralizado e seguro',
  'Dashboards com métricas claras',
  'IA e automações ajudando o corretor',
];

const SystemSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    goal: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    sessionStorage.setItem('imobfluow_demo_lead', JSON.stringify(formData));
    toast.success('Vamos qualificar sua operação antes de liberar a agenda.');
    setTimeout(() => {
      navigate(`/consultoria/qualificacao?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`);
    }, 600);
  };

  const scrollToSection = (target: string) => {
    setIsMenuOpen(false);
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-[#07172a] selection:bg-emerald-100 selection:text-emerald-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
          <button type="button" onClick={() => scrollToSection('plataforma')} className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <Sparkles size={20} />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">
              Imob<span className="text-emerald-600">Fluow</span>
            </span>
          </button>
          
          <nav className="hidden items-center gap-8 md:flex">
            {menuItems.map((item) => (
              <button key={item.label} onClick={() => scrollToSection(item.target)} className="text-sm font-bold text-slate-600 transition-colors hover:text-emerald-600">
                {item.label}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
              Entrar
            </button>
            <button onClick={() => scrollToSection('demo-form')} className="hidden rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 sm:inline-flex">
              Agendar Demo
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO: Two-column split layout */}
        <section id="plataforma" className="relative min-h-[90vh] bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 flex items-center overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.08)_0%,transparent_60%)]" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-50/60 to-transparent" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />

          <div className="relative w-full mx-auto max-w-7xl px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
            {/* LEFT: Text content */}
            <div className="flex flex-col items-start">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-700">
                <Zap size={14} className="fill-emerald-600 text-emerald-600" />
                O NOVO PADRÃO COMERCIAL
              </div>

              <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 md:text-6xl xl:text-7xl">
                Imobiliárias que faturam usam{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                  processos.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg font-medium text-slate-600 md:text-xl leading-relaxed">
                Venda mais imóveis organizando sua operação com CRM visual, inteligência artificial e atendimento centralizado em um só lugar.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <button onClick={() => scrollToSection('demo-form')} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 text-base font-black text-white shadow-xl shadow-emerald-600/25 transition-all hover:scale-105 hover:bg-emerald-700">
                  Ver na Prática <ArrowRight size={18} />
                </button>
                <button onClick={() => scrollToSection('beneficios')} className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-8 text-base font-bold text-slate-700 transition-all hover:border-emerald-200 hover:bg-emerald-50">
                  Explorar Soluções
                </button>
              </div>

              {/* Social proof */}
              <div className="mt-12 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {['bg-emerald-400', 'bg-teal-400', 'bg-cyan-400', 'bg-sky-400'].map((c, i) => (
                    <div key={i} className={`w-9 h-9 rounded-full border-2 border-white ${c} flex items-center justify-center text-white text-xs font-bold`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  <span className="text-emerald-600 font-black">+2.000</span> profissionais já utilizam
                </p>
              </div>
            </div>

            {/* RIGHT: Dashboard mockup */}
            <div className="relative hidden lg:block">
              {/* Floating metric cards */}
              <div className="absolute -top-6 -left-8 z-10 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 p-4 flex items-center gap-3 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Produtividade</p>
                  <p className="text-lg font-black text-slate-900">+250%</p>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 z-10 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 p-4 flex items-center gap-3 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Clock3 size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Tempo Resposta</p>
                  <p className="text-lg font-black text-slate-900">-60%</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
                <div className="rounded-[1.5rem] bg-slate-100 overflow-hidden border border-slate-100 relative">
                  <img src="/images/sales/hero-corretores.webp" alt="Sistema ImobFluow" className="w-full h-auto object-cover opacity-90 mix-blend-multiply" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-6">
                    <div className="flex gap-3 flex-wrap">
                      {metrics.map((m, i) => (
                        <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 text-white">
                          <p className="text-xs font-medium opacity-80">{m.label}</p>
                          <p className="text-xl font-black mt-0.5">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile image */}
          <div className="lg:hidden w-full px-6 pb-12 mt-4">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
              <img src="/images/sales/hero-corretores.webp" alt="Sistema ImobFluow" className="w-full h-auto object-cover rounded-[1.5rem] opacity-90 mix-blend-multiply" />
            </div>
          </div>
        </section>

        {/* Metrics bar */}
        <section className="bg-slate-900 py-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {metrics.map((m, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <m.icon size={24} className="text-emerald-400 mb-2" />
                  <p className="text-3xl font-black text-white">{m.value}</p>
                  <p className="text-sm font-medium text-slate-400 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* NEW LAYOUT: Bento Grid for Benefits */}
        <section id="beneficios" className="py-24 bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-black text-slate-900 md:text-5xl">Menos esforço, mais fechamentos.</h2>
              <p className="mt-4 text-lg font-medium text-slate-600">Tudo o que sua equipe precisa para bater a meta do mês.</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b, i) => (
                <div key={i} className={`rounded-3xl border border-slate-100 p-8 transition-shadow hover:shadow-xl hover:shadow-emerald-900/5 ${i === 0 ? 'bg-emerald-600 text-white md:col-span-2' : 'bg-slate-50'}`}>
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${i === 0 ? 'bg-white/20' : 'bg-emerald-100 text-emerald-600'}`}>
                    <b.icon size={28} />
                  </div>
                  <h3 className={`text-xl font-black mb-3 ${i === 0 ? 'text-white' : 'text-slate-900'}`}>{b.title}</h3>
                  <p className={`font-medium ${i === 0 ? 'text-emerald-50' : 'text-slate-600'}`}>{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section Refined */}
        <section className="py-24 bg-slate-900 text-white">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black md:text-4xl">A diferença entre estagnar e escalar</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-[2rem] bg-white/5 border border-white/10 p-10">
                <p className="text-sm font-black uppercase text-rose-400 mb-6 tracking-wider">A Maneira Antiga</p>
                <div className="space-y-4">
                  {beforeItems.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <XCircle className="text-rose-400 shrink-0 mt-0.5" />
                      <span className="font-semibold text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[2rem] bg-emerald-600 border border-emerald-500 p-10 shadow-2xl shadow-emerald-900/50">
                <p className="text-sm font-black uppercase text-emerald-100 mb-6 tracking-wider">Com ImobFluow</p>
                <div className="space-y-4">
                  {afterItems.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <CheckCircle2 className="text-white shrink-0 mt-0.5" />
                      <span className="font-semibold text-emerald-50">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Form Section */}
        <section id="demo-form" className="py-24 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-50/50 -skew-x-12 transform origin-top-right hidden lg:block" />
          <div className="relative mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-4xl font-black text-slate-900 leading-tight">
                  Pronto para <span className="text-emerald-600">acelerar</span> suas vendas?
                </h2>
                <p className="mt-4 text-lg font-medium text-slate-600">
                  Agende uma demonstração com nossos especialistas e veja a ImobFluow em ação.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 font-semibold text-slate-700">
                    <CheckCircle2 className="text-emerald-600" /> Sem compromisso financeiro
                  </div>
                  <div className="flex items-center gap-3 font-semibold text-slate-700">
                    <CheckCircle2 className="text-emerald-600" /> Demonstração focada na sua dor
                  </div>
                </div>
              </div>
              
              <div className="rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-900/5 border border-slate-100">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" placeholder="Seu nome" />
                  <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" placeholder="E-mail profissional" />
                  <input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" placeholder="WhatsApp" />
                  <input required value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" placeholder="Nome da Imobiliária" />
                  <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-black text-white transition hover:bg-emerald-700 disabled:opacity-70">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Quero ver a Plataforma'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center text-center">
           <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Sparkles size={16} />
              </div>
              <span className="text-lg font-black text-slate-900">ImobFluow</span>
            </div>
            <p className="text-slate-500 font-medium max-w-sm mb-8">O sistema definitivo para imobiliárias que buscam alta performance.</p>
            <p className="text-sm font-bold text-slate-400">© {new Date().getFullYear()} ImobFluow. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default SystemSalesPage;
