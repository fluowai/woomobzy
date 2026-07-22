import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  FileText,
  House,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageSquareMore,
  MonitorSmartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';

const navItems = [
  { label: 'Soluções', target: 'solucoes', dropdown: true },
  { label: 'Recursos', target: 'recursos' },
  { label: 'Planos', target: 'planos' },
  { label: 'Clientes', target: 'clientes' },
  { label: 'Sobre nós', target: 'cta-final' },
];

const trustLogos = [
  'LugarCerto',
  'Imobiliária Prime',
  'Casa Nova',
  'Vetor Imobiliária',
  'Imóveis & Cia',
  'Morar',
];

const solutions = [
  {
    icon: House,
    title: 'Gestão de Imóveis',
    text: 'Cadastre, organize e divulgue imóveis com fotos, características e disponibilidade em poucos cliques.',
  },
  {
    icon: Users,
    title: 'Funil de Leads',
    text: 'Acompanhe cada oportunidade, do primeiro contato até o fechamento do negócio de forma inteligente.',
  },
  {
    icon: MessageSquareMore,
    title: 'Atendimento Omnichannel',
    text: 'Centralize WhatsApp, e-mail, chat e ligações e nunca perca uma oportunidade de venda.',
  },
  {
    icon: FileText,
    title: 'Contratos e Documentos',
    text: 'Crie, envie e gerencie contratos e documentos com segurança e validade jurídica.',
  },
  {
    icon: Sparkles,
    title: 'Marketing Imobiliário',
    text: 'Crie campanhas, páginas de imóveis, relatórios de performance e integre com portais.',
  },
  {
    icon: CalendarClock,
    title: 'Locação Simplificada',
    text: 'Controle locações, renovações, reajustes, vistorias e repasses de forma 100% automatizada.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Inteligentes',
    text: 'Dashboards e relatórios completos para decisões mais assertivas e estratégicas no dia a dia.',
  },
  {
    icon: MonitorSmartphone,
    title: 'App Mobile',
    text: 'Acesse seu CRM de qualquer lugar e tenha sua imobiliária literalmente na palma da mão.',
  },
];

const techBullets = [
  'Automação de tarefas e follow-ups',
  'Score inteligente de leads e oportunidades',
  'Sugestões automáticas de imóveis via IA',
  'Integração nativa com maiores portais',
];

const testimonials = [
  {
    quote:
      'A WooTech Imob mudou completamente nossa rotina. Ganhamos tempo, organizamos nosso funil e aumentamos nossas vendas em mais de 40% logo nos primeiros meses.',
    name: 'Juliana Martins',
    role: 'Diretora Comercial',
    company: 'Imobiliária Prime',
  },
  {
    quote:
      'O suporte é incrível e o sistema é super completo. Hoje temos controle total do nosso negócio na palma da mão. Não trocaríamos por nenhuma outra ferramenta.',
    name: 'Carlos Alberto',
    role: 'CEO',
    company: 'Casa Nova Imóveis',
  },
  {
    quote:
      'Migramos para a WooTech e não queremos outra coisa. É moderno, muito rápido e claramente feito por quem entende as dores de imobiliárias como a gente.',
    name: 'Fernanda Rocha',
    role: 'Gerente de Locação',
    company: 'Vetor Imobiliária',
  },
];

const footerColumns = [
  {
    title: 'Soluções',
    items: [
      'Gestão de Imóveis',
      'Leads e Funil',
      'Atendimento',
      'Marketing',
      'Locação',
      'Relatórios',
    ],
  },
  {
    title: 'Empresa',
    items: ['Sobre nós', 'Clientes', 'Planos', 'Parceiros', 'Blog', 'Contato'],
  },
  {
    title: 'Suporte',
    items: [
      'Central de Ajuda',
      'Tutoriais',
      'WhatsApp',
      'E-mail',
      'Status do Sistema',
    ],
  },
];

const statBadges = [
  { title: 'Setup rápido', subtitle: 'Em até 24h' },
  { title: 'Suporte especializado', subtitle: 'Humano e ágil' },
  { title: 'Ambiente seguro', subtitle: 'Dados criptografados' },
];

const BrandLockup = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex items-center gap-3">
    <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] p-[2px] shadow-lg ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
      <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#020617]">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3/5 w-3/5 text-[#6366f1]">
          <path d="M3 21L7.5 12L12 21L16.5 12L21 21M3 12L7.5 3L12 12L16.5 3L21 12" stroke="url(#paint0_linear)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="paint0_linear" x1="3" y1="12" x2="21" y2="12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6"/>
              <stop offset="1" stopColor="#8b5cf6"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
    {!compact && (
      <div className="flex flex-col">
        <span className="text-lg font-black leading-none tracking-tight text-white">WooTech</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6366f1]">Imob</span>
      </div>
    )}
  </div>
);

const SystemSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    goal: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const scrollToSection = (target: string) => {
    setIsMenuOpen(false);
    document
      .getElementById(target)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    sessionStorage.setItem('wootech_imob_demo_lead', JSON.stringify(formData));
    toast.success('Vamos preparar sua demonstração.');

    setTimeout(() => {
      const params = new URLSearchParams({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        goal: formData.goal,
      });
      navigate(`/consultoria/qualificacao?${params.toString()}`);
    }, 600);
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-[#3b82f6]/30 selection:text-[#6366f1]">
      {/* Background Glow Accents */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#3b82f6]/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#3b82f6]/5 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-8 relative z-10">
          <button
            type="button"
            onClick={() => scrollToSection('topo')}
            className="flex items-center gap-3"
          >
            <BrandLockup />
          </button>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.target)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-white/70 transition-colors hover:text-white"
              >
                {item.label}
                {item.dropdown ? <ChevronDown size={14} /> : null}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <button
              onClick={() => navigate('/login')}
              className="h-11 rounded-xl px-6 text-sm font-bold text-white/90 transition hover:text-white hover:bg-white/5"
            >
              Entrar no painel
            </button>
            <button
              onClick={() => scrollToSection('cta-final')}
              className="h-11 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#6366f1] px-6 text-sm font-bold text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)] transition hover:shadow-[0_8px_25px_rgba(59,130,246,0.45)] hover:scale-105 active:scale-95"
            >
              Agendar demonstração
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/5 bg-[#020617]/95 backdrop-blur-xl lg:hidden overflow-hidden"
            >
              <div className="flex flex-col gap-2 p-6">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => scrollToSection(item.target)}
                    className="rounded-xl px-4 py-3 text-left text-base font-bold text-white/80 hover:bg-white/10"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="mt-4 flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full rounded-xl border border-white/10 px-4 py-3 text-center text-base font-bold text-white/90"
                  >
                    Entrar no painel
                  </button>
                  <button
                    onClick={() => scrollToSection('cta-final')}
                    className="w-full rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#6366f1] px-4 py-3 text-center text-base font-bold text-white shadow-lg"
                  >
                    Agendar demonstração
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="topo" className="relative z-10">
        <section className="mx-auto grid max-w-[1440px] gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1fr_1.1fr] lg:px-8 xl:pt-24 xl:pb-32">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-[620px] pt-8"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-4 py-2 mb-8">
              <Sparkles size={16} className="text-[#3b82f6]" />
              <span className="text-sm font-bold text-[#6366f1]">O futuro da gestão imobiliária chegou</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl font-black leading-[1.1] tracking-tight text-white md:text-6xl xl:text-7xl">
              O <span className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">CRM imobiliário</span> completo para quem quer crescer.
            </motion.h1>
            
            <motion.p variants={fadeIn} className="mt-6 text-xl font-medium leading-relaxed text-white/60">
              Gestão de imóveis, atendimento omnichannel, marketing, contratos e relatórios em um único sistema de alta performance.
            </motion.p>

            <motion.div variants={fadeIn} className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={() => scrollToSection('cta-final')}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#6366f1] px-8 text-base font-black text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)] transition hover:shadow-[0_15px_40px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95"
              >
                Agendar demonstração <ArrowRight size={18} />
              </button>
              <button
                onClick={() => scrollToSection('planos')}
                className="inline-flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 text-base font-black text-white transition hover:bg-white/10"
              >
                Ver planos
              </button>
            </motion.div>

            <motion.div variants={fadeIn} className="mt-12 flex flex-wrap gap-x-8 gap-y-4">
              {statBadges.map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#3b82f6]">
                    <CheckCircle2 size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white/90">{item.title}</p>
                    <p className="text-xs font-medium text-white/50">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            {/* Decorative blur behind mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[600px] max-h-[600px] bg-gradient-to-tr from-[#3b82f6]/20 to-transparent rounded-full blur-[80px] -z-10" />
            
            <div className="w-full max-w-[760px] rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-4 shadow-2xl backdrop-blur-3xl">
              <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                {/* Sidebar Mockup */}
                <div className="rounded-[1.8rem] bg-black/40 border border-white/5 p-4 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-8">
                    <BrandLockup compact />
                  </div>
                  <div className="space-y-2 text-sm font-bold text-white/50">
                    {[
                      'Dashboard', 'Imóveis', 'Leads', 'Atendimento', 'Contratos',
                      'Clientes', 'Marketing', 'Locação', 'Relatórios', 'Configurações',
                    ].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-xl px-4 py-2.5 transition-colors ${index === 0 ? 'bg-gradient-to-r from-[#3b82f6]/20 to-transparent border border-[#3b82f6]/30 text-white' : 'hover:bg-white/5'}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main Content Mockup */}
                <div className="rounded-[1.8rem] bg-black/40 border border-white/5 p-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-white">Dashboard</h2>
                      <p className="text-xs text-white/50 font-medium">Visão geral do negócio</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-white/70">
                      Diretoria
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { title: 'Imóveis ativos', value: '1.240', note: '+12 este mês', color: 'text-emerald-400' },
                      { title: 'Novos Leads', value: '532', note: '+18% este mês', color: 'text-emerald-400' },
                      { title: 'Atendimentos', value: '1.032', note: 'Tempo médio 4m', color: 'text-white/50' },
                      { title: 'Negociações', value: '287', note: '+3 aprovações', color: 'text-[#6366f1]' },
                    ].map((card, i) => (
                      <div key={card.title} className="rounded-2xl border border-white/5 bg-white/5 p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full opacity-50" />
                        <p className="text-xs font-bold text-white/50">{card.title}</p>
                        <p className="mt-3 text-3xl font-black text-white">{card.value}</p>
                        <p className={`mt-2 text-xs font-bold ${card.color}`}>{card.note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                      <p className="text-sm font-black text-white">Leads por origem</p>
                      <div className="mt-6 flex items-center gap-6">
                        <div className="relative h-32 w-32 shrink-0">
                          <div className="absolute inset-0 rounded-full border-[14px] border-white/5" />
                          <div className="absolute inset-0 rounded-full border-[14px] border-[#3b82f6] border-r-transparent border-b-transparent border-l-transparent rotate-45" />
                          <div className="absolute inset-0 rounded-full border-[14px] border-[#6366f1] border-t-transparent border-b-transparent border-l-transparent rotate-45" />
                        </div>
                        <div className="space-y-3 text-xs font-bold text-white/60">
                          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#3b82f6]" /> Site 48%</div>
                          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#6366f1]" /> WhatsApp 26%</div>
                          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-white/20" /> Indicação 14%</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                      <p className="text-sm font-black text-white mb-4">Em destaque</p>
                      <div className="space-y-3">
                        {[
                          { name: 'Apt. Alto Padrão', city: 'R$ 1.850.000', img: 'urban_sea_view.png' },
                          { name: 'Casa Condomínio', city: 'R$ 2.450.000', img: 'urban_gated_community.png' },
                        ].map((item, index) => (
                          <div key={item.name} className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5 transition hover:bg-white/10">
                            <img
                              src={`/templates/urban/${item.img}`}
                              alt={item.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-black text-white">{item.name}</p>
                              <p className="text-[10px] font-bold text-[#6366f1]">{item.city}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Logos Section */}
        <section className="border-y border-white/5 bg-black/40 py-12 backdrop-blur-md">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-8">
            <p className="text-center text-sm font-bold uppercase tracking-widest text-white/40">
              Mais de 1.200 imobiliárias já confiam na {COMMERCIAL_PRODUCT_NAME}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale transition hover:grayscale-0">
              {trustLogos.map((logo) => (
                <div key={logo} className="text-xl font-black tracking-tighter text-white">
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="solucoes" className="relative mx-auto max-w-[1440px] px-6 py-24 lg:px-8 xl:py-32">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="mx-auto max-w-[820px] text-center"
          >
            <div className="inline-flex items-center justify-center rounded-full bg-[#3b82f6]/10 px-4 py-1.5 mb-6 border border-[#3b82f6]/20">
              <p className="text-xs font-black uppercase tracking-widest text-[#3b82f6]">Soluções completas</p>
            </div>
            <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
              Tudo que sua imobiliária precisa <br/>
              <span className="text-white/40">em um só lugar</span>
            </h2>
            <p className="mx-auto mt-6 max-w-[760px] text-lg font-medium leading-relaxed text-white/60">
              Da captação ao pós-venda, conectamos processos, pessoas e informações para você focar no que realmente importa: fechar grandes negócios.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4"
          >
            {solutions.map((item) => (
              <motion.article
                variants={fadeIn}
                key={item.title}
                className="group relative rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04] hover:border-white/10"
              >
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[#3b82f6]/0 to-[#3b82f6]/0 opacity-0 transition-opacity group-hover:from-[#3b82f6]/5 group-hover:opacity-100" />
                <span className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5 border border-[#3b82f6]/20 text-[#6366f1] transition-transform group-hover:scale-110">
                  <item.icon size={26} strokeWidth={2} />
                </span>
                <h3 className="relative text-xl font-black text-white">{item.title}</h3>
                <p className="relative mt-4 text-sm font-medium leading-relaxed text-white/50 group-hover:text-white/70 transition-colors">
                  {item.text}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </section>

        {/* Highlights Section */}
        <section id="recursos" className="relative border-t border-white/5 bg-[#0f172a]">
          <div className="mx-auto grid max-w-[1440px] gap-16 px-6 py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8 xl:py-32">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
            >
              <div className="inline-flex items-center justify-center rounded-full bg-[#3b82f6]/10 px-4 py-1.5 mb-6 border border-[#3b82f6]/20">
                <p className="text-xs font-black uppercase tracking-widest text-[#3b82f6]">Tecnologia Avançada</p>
              </div>
              <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
                Inteligência que transforma <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]">dados em negócios</span>
              </h2>
              <p className="mt-6 max-w-[540px] text-lg font-medium leading-relaxed text-white/60">
                Utilizamos a mais alta tecnologia de automações e inteligência artificial para otimizar seu tempo, aumentar a produtividade do time e revolucionar a experiência do cliente.
              </p>

              <div className="mt-10 space-y-5">
                {techBullets.map((item) => (
                  <div key={item} className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#6366f1] text-white shadow-lg">
                      <CheckCircle2 size={16} />
                    </span>
                    <p className="text-base font-bold text-white/80">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="relative flex justify-center"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[120%] bg-gradient-to-tl from-[#3b82f6]/10 to-transparent rounded-full blur-[100px] -z-10" />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-4 shadow-2xl">
                <img
                  src="/templates/urban/urban_gated_community.png"
                  alt="Análise de lead WooTech Imob"
                  className="h-[480px] w-full max-w-[600px] rounded-[2rem] object-cover opacity-80"
                />
                
                {/* Floating UI Elements */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute bottom-10 right-10 w-[240px] rounded-[1.8rem] border border-white/10 bg-black/70 p-6 shadow-2xl backdrop-blur-xl"
                >
                  <p className="text-xs font-black uppercase tracking-widest text-white/70 text-center mb-4">Score do Lead</p>
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-[10px] border-white/5 border-t-[#3b82f6] border-r-[#6366f1] shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                    <div className="text-center">
                      <p className="text-5xl font-black text-white">92</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#6366f1]">
                        Muito quente
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-[92%] bg-gradient-to-r from-[#3b82f6] to-[#6366f1]" />
                    </div>
                    <p className="text-center text-[10px] font-bold text-white/50 uppercase">Probabilidade de Fechamento</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="clientes" className="relative border-t border-white/5 py-24 xl:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3b82f6]/5 to-transparent -z-10" />
          <div className="mx-auto max-w-[1440px] px-6 lg:px-8">
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
              className="text-center"
            >
              <h2 className="text-4xl font-black text-white md:text-5xl">
                Histórias de quem <span className="text-[#6366f1]">cresce com a gente</span>
              </h2>
            </motion.div>

            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
              className="mt-16 grid gap-6 md:grid-cols-3"
            >
              {testimonials.map((item, index) => (
                <motion.article
                  variants={fadeIn}
                  key={item.name}
                  className="relative rounded-[2rem] border border-white/5 bg-black/40 p-10 backdrop-blur-md transition hover:bg-white/5"
                >
                  <p className="text-6xl font-serif text-[#3b82f6]/20 absolute top-6 left-6">"</p>
                  <p className="relative z-10 text-lg font-medium leading-relaxed text-white/70 pt-4">
                    {item.quote}
                  </p>
                  <div className="mt-10 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#6366f1] text-lg font-black text-white shadow-lg">
                      {index === 0 ? 'J' : index === 1 ? 'C' : 'F'}
                    </div>
                    <div>
                      <p className="text-base font-black text-white">{item.name}</p>
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wide">{item.role}</p>
                      <p className="text-xs font-bold text-[#6366f1]">{item.company}</p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta-final" className="mx-auto max-w-[1440px] px-6 py-12 lg:px-8 pb-24">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-br from-[#1e293b] to-[#0f172a] px-8 py-16 shadow-2xl lg:px-16"
          >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#3b82f6]/20 to-transparent rounded-bl-full blur-[80px] -z-10" />
            
            <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-center relative z-10">
              <div>
                <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
                  Pronto para elevar sua imobiliária <span className="text-[#6366f1]">ao próximo nível?</span>
                </h2>
                <p className="mt-6 max-w-[500px] text-lg font-medium leading-relaxed text-white/60">
                  Agende uma demonstração gratuita e descubra como a {COMMERCIAL_PRODUCT_NAME} vai transformar completamente sua operação.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-6 text-sm font-bold text-white/70">
                  <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-[#3b82f6]" /> Demonstração 1 a 1</div>
                  <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-[#3b82f6]" /> Sem compromisso</div>
                </div>
              </div>

              <div id="formulario-demo" className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-12 rounded-xl border border-white/10 bg-black/50 px-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition focus:border-[#3b82f6] focus:bg-black"
                      placeholder="Nome completo"
                    />
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-12 rounded-xl border border-white/10 bg-black/50 px-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition focus:border-[#3b82f6] focus:bg-black"
                      placeholder="E-mail profissional"
                    />
                    <input
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="h-12 rounded-xl border border-white/10 bg-black/50 px-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition focus:border-[#3b82f6] focus:bg-black"
                      placeholder="WhatsApp"
                    />
                    <input
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="h-12 rounded-xl border border-white/10 bg-black/50 px-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition focus:border-[#3b82f6] focus:bg-black"
                      placeholder="Nome da Imobiliária"
                    />
                  </div>
                  <textarea
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    className="min-h-[100px] rounded-xl border border-white/10 bg-black/50 p-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition focus:border-[#3b82f6] focus:bg-black resize-none"
                    placeholder="Conte rapidamente o que você quer resolver ou acelerar na sua operação..."
                  />
                  <button
                    disabled={isSubmitting}
                    className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-base font-black text-white shadow-[0_10px_20px_rgba(59,130,246,0.3)] transition hover:shadow-[0_15px_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Agendar demonstração'}
                    {!isSubmitting && <ArrowRight size={18} />}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-[#020617]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <BrandLockup />
            <p className="mt-6 max-w-[320px] text-sm font-medium leading-relaxed text-white/50">
              O CRM imobiliário definitivo para imobiliárias urbanas e rurais que buscam controle total, máxima produtividade e crescimento escalável.
            </p>
            <div className="mt-8 flex gap-3">
              {['IG', 'FB', 'IN', 'YT'].map((item) => (
                <button
                  key={item}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-xs font-black text-white/60 transition hover:bg-[#3b82f6] hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-black uppercase tracking-widest text-white/90 mb-6">{column.title}</p>
              <div className="space-y-4">
                {column.items.map((item) => (
                  <button
                    key={item}
                    className="block text-sm font-medium text-white/50 transition hover:text-[#3b82f6]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-8 text-xs font-bold text-white/40 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>&copy; {new Date().getFullYear()} {PLATFORM_NAME}. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <button className="hover:text-white transition">Política de Privacidade</button>
              <button className="hover:text-white transition">Termos de Uso</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const PLATFORM_NAME = COMMERCIAL_PRODUCT_NAME;

export default SystemSalesPage;
