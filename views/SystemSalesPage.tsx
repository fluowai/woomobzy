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
  Play,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import WooTechLogo from '../components/WooTechLogo';

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

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const SystemSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    imobiliaria: '',
    corretores: '1-5',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setLeadForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitted(true);
      toast.success(
        'Solicitação recebida com sucesso! Nossa equipe entrará em contato.'
      );
    } catch {
      toast.error('Erro ao enviar solicitação. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0e] font-sans text-white selection:bg-[#ff6a00] selection:text-white">
      {/* Background ambient glowing neon curves */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#ff6a00]/15 to-transparent blur-[140px]" />
      <div className="pointer-events-none fixed top-1/4 right-0 h-[700px] w-[600px] rounded-full bg-[#ff7a1a]/10 blur-[160px]" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#090b0e]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-8">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('topo')}
            className="flex items-center gap-3 transition hover:opacity-90 cursor-pointer"
          >
            <WooTechLogo variant="dark" subtitle="crm" size="md" />
          </button>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.target)}
                className="group flex items-center gap-1.5 text-sm font-semibold text-zinc-300 transition hover:text-white cursor-pointer"
              >
                {item.label}
                {item.dropdown && (
                  <ChevronDown
                    size={14}
                    className="text-zinc-500 transition group-hover:text-white"
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="hidden items-center gap-5 lg:flex">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-bold text-zinc-300 transition hover:text-white cursor-pointer"
            >
              Entrar no painel
            </button>
            <button
              onClick={() => scrollToSection('cta-final')}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff6a00] px-6 text-sm font-bold text-white shadow-[0_4px_20px_rgba(255,106,0,0.35)] transition hover:bg-[#ff7a1a] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Agendar demonstração
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/5 bg-[#090b0e]/98 backdrop-blur-2xl lg:hidden overflow-hidden"
            >
              <div className="flex flex-col gap-2 p-6">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => scrollToSection(item.target)}
                    className="rounded-xl px-4 py-3 text-left text-base font-semibold text-zinc-300 hover:bg-white/5 hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="mt-4 flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full rounded-xl border border-white/10 px-4 py-3 text-center text-base font-bold text-white hover:bg-white/5"
                  >
                    Entrar no painel
                  </button>
                  <button
                    onClick={() => scrollToSection('cta-final')}
                    className="w-full rounded-full bg-[#ff6a00] px-4 py-3 text-center text-base font-bold text-white shadow-lg shadow-orange-500/20"
                  >
                    Agendar demonstração
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main id="topo" className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1fr_1.15fr] lg:px-8 xl:pt-20 xl:pb-28">
          {/* Ambient orange light arc trailing in background */}
          <svg
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-full max-w-[800px] h-[500px] opacity-70 -z-10"
            viewBox="0 0 800 500"
            fill="none"
          >
            <path
              d="M-50,420 Q400,200 850,280"
              stroke="#ff6a00"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="drop-shadow-[0_0_20px_#ff6a00]"
            />
          </svg>

          {/* Left Hero Texts */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-[620px]"
          >
            {/* Pill Badge */}
            <motion.div
              variants={fadeIn}
              className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-[#ff6a00]/10 px-4 py-1.5 mb-6 backdrop-blur-md"
            >
              <House size={15} className="text-[#ff6a00]" />
              <span className="text-xs sm:text-sm font-semibold text-orange-200">
                O futuro da gestão imobiliária chegou
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeIn}
              className="text-4xl font-black leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              O{' '}
              <span className="text-[#ff6a00] drop-shadow-[0_2px_20px_rgba(255,106,0,0.35)]">
                CRM imobiliário
              </span>{' '}
              completo para quem quer crescer.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeIn}
              className="mt-6 text-base sm:text-lg lg:text-xl font-normal leading-relaxed text-zinc-400"
            >
              Gestão de imóveis, atendimento omnichannel, marketing, contratos e
              relatórios em um único sistema de alta performance.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeIn}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <button
                onClick={() => scrollToSection('cta-final')}
                className="inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-[#ff6a00] px-8 text-sm sm:text-base font-bold text-white shadow-[0_8px_25px_rgba(255,106,0,0.4)] transition hover:bg-[#ff7a1a] hover:scale-105 active:scale-95 cursor-pointer"
              >
                Agendar demonstração <ArrowRight size={17} />
              </button>
              <button
                onClick={() => scrollToSection('solucoes')}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-7 text-sm sm:text-base font-semibold text-zinc-200 backdrop-blur-md transition hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-300">
                  <Play size={11} className="ml-0.5 fill-current" />
                </div>
                Ver como funciona
              </button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              variants={fadeIn}
              className="mt-12 flex flex-wrap gap-x-8 gap-y-4 pt-4 border-t border-white/5"
            >
              {statBadges.map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff6a00]/10 text-[#ff6a00] border border-[#ff6a00]/20">
                    <CheckCircle2 size={16} />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      {item.title}
                    </p>
                    <p className="text-[11px] font-medium text-zinc-500">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Hero Visual: Exact High-Fidelity System Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            {/* Orange ambient glow behind mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-[#ff6a00]/15 rounded-[3rem] blur-[80px] -z-10" />

            {/* Mockup Outer Frame */}
            <div className="w-full max-w-[720px] rounded-[32px] border border-white/10 bg-[#10131a] p-4 sm:p-5 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <div className="grid gap-4 md:grid-cols-[170px_1fr]">
                {/* Mockup Mini-Sidebar */}
                <div className="rounded-2xl bg-[#0c0f15] border border-white/5 p-4 flex flex-col justify-between">
                  <div>
                    {/* Mini Logo */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-6 w-6">
                        <svg viewBox="0 0 44 44" fill="none" className="w-full h-full">
                          <path
                            d="M5 14L13.5 34H18.5L22 24.5L17.5 14H12.5L9.5 22L7.2 14H5Z"
                            fill="#ff6a00"
                          />
                          <path
                            d="M22 24.5L25.5 34H30.5L39 14H34L30.5 24.5L27 14H22.5L20 20L22 24.5Z"
                            fill="#ff6a00"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Nav Items */}
                    <div className="space-y-1.5 text-xs font-semibold">
                      <div className="rounded-xl bg-[#ff6a00] px-3 py-2 text-white font-bold shadow-md shadow-orange-500/20 flex items-center gap-2">
                        <House size={14} />
                        Dashboard
                      </div>
                      {[
                        'Imóveis',
                        'Leads',
                        'Atendimento',
                        'Contratos',
                        'Clientes',
                        'Marketing',
                        'Locação',
                        'Relatórios',
                        'Configurações',
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-xl px-3 py-1.5 text-zinc-400 hover:text-white transition"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mockup Main Dashboard Panel */}
                <div className="rounded-2xl bg-[#0c0f15] border border-white/5 p-5 flex flex-col gap-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white">Dashboard</h3>
                      <p className="text-[11px] font-medium text-zinc-500">
                        Visão geral do negócio
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
                      Diretoria
                      <ChevronDown size={12} className="text-zinc-500" />
                    </div>
                  </div>

                  {/* 4 Metric Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Imóveis Ativos */}
                    <div className="rounded-xl border border-white/5 bg-[#141822] p-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                        <House size={13} className="text-amber-500" />
                        Imóveis ativos
                      </div>
                      <div className="mt-2 text-2xl font-black text-white">
                        1.240
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-emerald-400">
                        +12 este mês
                      </div>
                    </div>

                    {/* Novos Leads */}
                    <div className="rounded-xl border border-white/5 bg-[#141822] p-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                        <Users size={13} className="text-orange-400" />
                        Novos Leads
                      </div>
                      <div className="mt-2 text-2xl font-black text-white">
                        532
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-emerald-400">
                        +18% este mês
                      </div>
                    </div>

                    {/* Atendimentos */}
                    <div className="rounded-xl border border-white/5 bg-[#141822] p-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                        <MessageSquareMore size={13} className="text-amber-400" />
                        Atendimentos
                      </div>
                      <div className="mt-2 text-2xl font-black text-white">
                        1.032
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-zinc-400">
                        Tempo médio 4m
                      </div>
                    </div>

                    {/* Negociações */}
                    <div className="rounded-xl border border-white/5 bg-[#141822] p-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                        <BarChart3 size={13} className="text-[#ff6a00]" />
                        Negociações
                      </div>
                      <div className="mt-2 text-2xl font-black text-white">
                        287
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-[#ff6a00]">
                        +3 aprovações
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Leads por origem + Imóvel em destaque */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Leads por Origem */}
                    <div className="rounded-xl border border-white/5 bg-[#141822] p-3.5">
                      <p className="text-xs font-bold text-white">
                        Leads por origem
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        {/* Donut graphic */}
                        <div className="relative h-16 w-16 shrink-0">
                          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                            <circle
                              cx="18"
                              cy="18"
                              r="13"
                              fill="none"
                              stroke="#202532"
                              strokeWidth="5"
                            />
                            {/* Site 48% */}
                            <circle
                              cx="18"
                              cy="18"
                              r="13"
                              fill="none"
                              stroke="#ff6a00"
                              strokeWidth="5"
                              strokeDasharray="40 100"
                              strokeDashoffset="0"
                            />
                            {/* WhatsApp 26% */}
                            <circle
                              cx="18"
                              cy="18"
                              r="13"
                              fill="none"
                              stroke="#f5d0a9"
                              strokeWidth="5"
                              strokeDasharray="22 100"
                              strokeDashoffset="-40"
                            />
                          </svg>
                        </div>
                        <div className="space-y-1 text-[10px] font-medium text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#ff6a00]" /> Site 48%
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#f5d0a9]" /> WhatsApp 26%
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <span className="h-2 w-2 rounded-full bg-zinc-600" /> Outros 26%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Em Destaque Card */}
                    <div className="rounded-xl border border-white/5 bg-[#141822] p-3.5 flex flex-col justify-between">
                      <p className="text-xs font-bold text-white">Em destaque</p>
                      <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-white/5 p-2 border border-white/5">
                        <img
                          src="/templates/urban/urban_sea_view.png"
                          alt="Apt Alto Padrão"
                          className="h-10 w-10 rounded-md object-cover"
                        />
                        <div>
                          <p className="text-[11px] font-bold text-white leading-tight">
                            Apt. Alto Padrão
                          </p>
                          <p className="text-[11px] font-black text-[#ff6a00] mt-0.5">
                            R$ 1.850.000
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* LOGOS STRIP */}
        <section className="border-y border-white/5 bg-[#0c0f15]/80 py-10 backdrop-blur-md">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
              Mais de 1.200 imobiliárias já confiam na WooTech Imob
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60 grayscale transition hover:grayscale-0">
              {trustLogos.map((logo) => (
                <div
                  key={logo}
                  className="text-lg font-black tracking-tight text-zinc-400"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOLUTIONS GRID */}
        <section
          id="solucoes"
          className="relative mx-auto max-w-[1440px] px-6 py-20 lg:px-8 xl:py-28"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeIn}
            className="mx-auto max-w-[820px] text-center"
          >
            <div className="inline-flex items-center justify-center rounded-full bg-[#ff6a00]/10 px-4 py-1.5 mb-6 border border-[#ff6a00]/25">
              <p className="text-xs font-bold uppercase tracking-widest text-[#ff6a00]">
                Soluções completas
              </p>
            </div>
            <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              Tudo que sua imobiliária precisa <br />
              <span className="text-zinc-500">em um só lugar</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[720px] text-base sm:text-lg font-normal leading-relaxed text-zinc-400">
              Da captação ao pós-venda, conectamos processos, pessoas e
              informações para você focar no que realmente importa: fechar grandes negócios.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4"
          >
            {solutions.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-white/5 bg-[#11141c] p-6 transition-all duration-300 hover:border-[#ff6a00]/40 hover:bg-[#141824] hover:shadow-[0_10px_30px_rgba(255,106,0,0.1)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff6a00]/10 text-[#ff6a00] border border-[#ff6a00]/20 transition-transform group-hover:scale-110">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </motion.div>
        </section>

        {/* TESTIMONIALS */}
        <section
          id="clientes"
          className="border-t border-white/5 bg-[#0b0e14] py-20 lg:py-28"
        >
          <div className="mx-auto max-w-[1440px] px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-4 py-1.5 mb-4 border border-emerald-500/20">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Depoimentos reais
                </span>
              </div>
              <h2 className="text-3xl font-black text-white sm:text-4xl">
                Quem usa, recomenda
              </h2>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {testimonials.map((test) => (
                <div
                  key={test.name}
                  className="rounded-2xl border border-white/5 bg-[#11141c] p-8 flex flex-col justify-between"
                >
                  <p className="text-sm font-medium leading-relaxed text-zinc-300 italic">
                    "{test.quote}"
                  </p>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-sm font-bold text-white">{test.name}</p>
                    <p className="text-xs text-zinc-500">
                      {test.role} • {test.company}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FORM SECTION */}
        <section
          id="cta-final"
          className="relative mx-auto max-w-[1440px] px-6 py-20 lg:px-8 xl:py-28"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-orange-500/30 bg-gradient-to-br from-[#131620] via-[#0f121a] to-[#090b0e] p-8 sm:p-12 lg:p-16 shadow-2xl">
            {/* Ambient orange light */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#ff6a00]/20 blur-[100px]" />

            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#ff6a00]">
                  Comece agora
                </span>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                  Pronto para transformar sua imobiliária?
                </h2>
                <p className="mt-4 text-base sm:text-lg text-zinc-400">
                  Preencha o formulário e um especialista demonstrará na prática como a WooTech Imob aumentará a conversão de leads e a receita da sua equipe.
                </p>

                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                    <CheckCircle2 size={18} className="text-[#ff6a00]" />
                    Demonstração 100% personalizada
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                    <CheckCircle2 size={18} className="text-[#ff6a00]" />
                    Sem compromisso ou fidelidade forçada
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                    <CheckCircle2 size={18} className="text-[#ff6a00]" />
                    Implantação assistida por nossa equipe técnica
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="rounded-2xl border border-white/10 bg-[#161a24] p-6 sm:p-8 shadow-xl">
                {submitted ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-white">
                      Demonstração Solicitada!
                    </h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      Em instantes nosso consultor entrará em contato via WhatsApp.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                        Seu Nome
                      </label>
                      <input
                        type="text"
                        name="nome"
                        required
                        value={leadForm.nome}
                        onChange={handleInputChange}
                        placeholder="Ex: Carlos Silva"
                        className="mt-1 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#ff6a00] focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                          E-mail Corporativo
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={leadForm.email}
                          onChange={handleInputChange}
                          placeholder="seuemail@empresa.com"
                          className="mt-1 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#ff6a00] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                          WhatsApp
                        </label>
                        <input
                          type="tel"
                          name="whatsapp"
                          required
                          value={leadForm.whatsapp}
                          onChange={handleInputChange}
                          placeholder="(00) 00000-0000"
                          className="mt-1 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#ff6a00] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Nome da Imobiliária
                        </label>
                        <input
                          type="text"
                          name="imobiliaria"
                          required
                          value={leadForm.imobiliaria}
                          onChange={handleInputChange}
                          placeholder="Imobiliária Nova"
                          className="mt-1 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#ff6a00] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Equipe de Corretores
                        </label>
                        <select
                          name="corretores"
                          value={leadForm.corretores}
                          onChange={handleInputChange}
                          className="mt-1 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 text-sm text-white focus:border-[#ff6a00] focus:outline-none"
                        >
                          <option value="1-5">1 a 5 corretores</option>
                          <option value="6-15">6 a 15 corretores</option>
                          <option value="16-50">16 a 50 corretores</option>
                          <option value="50+">Mais de 50 corretores</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5500] via-[#ff6a00] to-[#ff7a00] text-sm sm:text-base font-bold text-white shadow-[0_8px_25px_rgba(255,106,0,0.35)] transition hover:brightness-105 disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={19} />
                      ) : (
                        <>
                          Agendar Demonstração Gratuita
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#07090c] py-16">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <WooTechLogo variant="dark" subtitle="crm-erp" size="md" />
              <p className="mt-4 max-w-sm text-xs sm:text-sm font-medium leading-relaxed text-zinc-400">
                A infraestrutura de inteligência, CRM e ERP que potencializa o crescimento de imobiliárias e corretores modernos.
              </p>
            </div>
            {footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold uppercase tracking-wider text-white">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-zinc-400">
                  {col.items.map((item) => (
                    <li key={item}>
                      <button
                        onClick={() => scrollToSection('solucoes')}
                        className="transition hover:text-white"
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <p>© {new Date().getFullYear()} WooTech Imob. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <button onClick={() => navigate('/privacy')} className="hover:text-zinc-300">
                Privacidade
              </button>
              <button onClick={() => navigate('/terms')} className="hover:text-zinc-300">
                Termos de uso
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SystemSalesPage;
