import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  FileText,
  Globe2,
  Headphones,
  House,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageSquareMore,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';

const navItems = [
  { label: 'Solucoes', target: 'solucoes', dropdown: true },
  { label: 'Recursos', target: 'recursos' },
  { label: 'Planos', target: 'planos' },
  { label: 'Clientes', target: 'clientes' },
  { label: 'Sobre nos', target: 'cta-final' },
];

const trustLogos = [
  'LugarCerto',
  'Imobiliaria Prime',
  'Casa Nova',
  'Vetor Imobiliaria',
  'Imoveis & Cia',
  'Morar',
];

const solutions = [
  {
    icon: House,
    title: 'Gestao de Imoveis',
    text: 'Cadastre, organize e divulgue imoveis com fotos, caracteristicas, valores e disponibilidade em poucos cliques.',
  },
  {
    icon: Users,
    title: 'Funil de Leads',
    text: 'Acompanhe cada oportunidade, do primeiro contato ate o fechamento do negocio.',
  },
  {
    icon: MessageSquareMore,
    title: 'Atendimento Omnichannel',
    text: 'Centralize WhatsApp, e-mail, chat e ligacoes e nunca perca uma oportunidade.',
  },
  {
    icon: FileText,
    title: 'Contratos e Documentos',
    text: 'Crie, envie e gerencie contratos e documentos com seguranca e validade juridica.',
  },
  {
    icon: Sparkles,
    title: 'Marketing Imobiliario',
    text: 'Crie campanhas, paginas de imoveis, relatorios de performance e integre com portais.',
  },
  {
    icon: CalendarClock,
    title: 'Locacao Simplificada',
    text: 'Controle locacoes, renovacoes, reajustes, vistorias e repasses de forma automatizada.',
  },
  {
    icon: BarChart3,
    title: 'Relatorios Inteligentes',
    text: 'Dashboards e relatorios completos para decisoes mais assertivas e estrategicas.',
  },
  {
    icon: MonitorSmartphone,
    title: 'App Mobile',
    text: 'Acesse seu CRM de qualquer lugar e tenha sua imobiliaria na palma da mao.',
  },
];

const techBullets = [
  'Automacao de tarefas e follow-ups',
  'Score de leads e oportunidades',
  'Sugestoes inteligentes de imoveis',
  'Integracao com portais e ferramentas',
];

const testimonials = [
  {
    quote:
      'A WooTech Imob mudou completamente nossa rotina. Ganhamos tempo, organizamos nosso funil e aumentamos nossas vendas em mais de 40%.',
    name: 'Juliana Martins',
    role: 'Diretora Comercial',
    company: 'Imobiliaria Prime',
  },
  {
    quote:
      'O suporte e incrivel e o sistema e super completo. Hoje temos controle total do nosso negocio na palma da mao.',
    name: 'Carlos Alberto',
    role: 'CEO',
    company: 'Casa Nova Imoveis',
  },
  {
    quote:
      'Migramos para a WooTech e nao queremos outra coisa. E moderno, rapido e feito para imobiliarias como a gente.',
    name: 'Fernanda Rocha',
    role: 'Gerente de Locacao',
    company: 'Vetor Imobiliaria',
  },
];

const footerColumns = [
  {
    title: 'Solucoes',
    items: ['Gestao de Imoveis', 'Leads e Funil', 'Atendimento', 'Marketing', 'Locacao', 'Relatorios'],
  },
  {
    title: 'Empresa',
    items: ['Sobre nos', 'Clientes', 'Planos', 'Parceiros', 'Blog', 'Contato'],
  },
  {
    title: 'Suporte',
    items: ['Central de Ajuda', 'Tutoriais', 'WhatsApp', 'E-mail', 'Status do Sistema'],
  },
];

const statBadges = [
  { title: 'Setup rapido', subtitle: 'Em ate 24h' },
  { title: 'Suporte especializado', subtitle: 'Humano e agil' },
  { title: 'Ambiente seguro', subtitle: 'Dados protegidos' },
];

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
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    sessionStorage.setItem('wootech_imob_demo_lead', JSON.stringify(formData));
    toast.success('Vamos preparar sua demonstracao.');

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

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#090909]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-8">
          <button type="button" onClick={() => scrollToSection('topo')} className="flex items-center gap-3">
            <img src="/logo-wootech-imob-orbit.svg" alt={COMMERCIAL_PRODUCT_NAME} className="h-12 w-auto" />
            <div className="leading-none text-left">
              <p className="text-2xl font-black tracking-tight text-white">WOOTECH</p>
              <p className="text-2xl font-black tracking-tight text-[#ff7a00]">IMOB</p>
            </div>
          </button>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.target)}
                className="inline-flex items-center gap-1 text-sm font-bold text-white/82 transition hover:text-white"
              >
                {item.label}
                {item.dropdown ? <ChevronDown size={14} /> : null}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              onClick={() => navigate('/login')}
              className="h-12 rounded-xl border border-white/15 px-6 text-sm font-bold text-white transition hover:bg-white/5"
            >
              Entrar no painel
            </button>
            <button
              onClick={() => scrollToSection('cta-final')}
              className="h-12 rounded-xl bg-[#ff7a00] px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,0,0.24)] transition hover:bg-[#f06f00]"
            >
              Agendar demonstracao
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white lg:hidden"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {isMenuOpen ? (
          <div className="border-t border-white/8 px-6 py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollToSection(item.target)}
                  className="rounded-xl px-3 py-3 text-left text-sm font-bold text-white/84 hover:bg-white/5"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => navigate('/login')}
                className="rounded-xl border border-white/10 px-3 py-3 text-left text-sm font-bold text-white/84"
              >
                Entrar no painel
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main id="topo">
        <section className="mx-auto grid max-w-[1440px] gap-12 px-6 pb-16 pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div className="max-w-[620px] pt-8">
            <h1 className="text-5xl font-black leading-[1.02] tracking-tight text-white md:text-7xl">
              O <span className="text-[#ff7a00]">CRM imobiliario</span> completo para imobiliarias que querem crescer.
            </h1>
            <p className="mt-6 text-xl font-medium leading-relaxed text-white/74">
              Gestao de imoveis, atendimento, marketing, contratos e relatorios em um unico sistema. Mais organizacao, mais produtividade e mais vendas.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => scrollToSection('cta-final')}
                className="h-14 rounded-xl bg-[#ff7a00] px-7 text-base font-black text-white shadow-[0_18px_32px_rgba(255,122,0,0.24)] transition hover:bg-[#ef6f00]"
              >
                Agendar demonstracao
              </button>
              <button
                onClick={() => scrollToSection('planos')}
                className="h-14 rounded-xl border border-[#5b3b22] bg-transparent px-7 text-base font-black text-white transition hover:bg-white/5"
              >
                Ver planos
              </button>
            </div>

            <div className="mt-10 flex flex-wrap gap-8">
              {statBadges.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#ff7a00]/45 text-[#ff7a00]">
                    <CheckCircle2 size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-black text-[#ff9b45]">{item.title}</p>
                    <p className="text-sm font-medium text-white/55">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[760px] rounded-[2rem] border border-[#6b3f1b] bg-gradient-to-b from-[#141414] to-[#101010] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
              <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                <div className="rounded-[1.4rem] bg-[#111111] p-4">
                  <div className="flex items-center gap-2">
                    <img src="/logo-wootech-imob-orbit.svg" alt={COMMERCIAL_PRODUCT_NAME} className="h-7 w-auto" />
                    <span className="text-xs font-black text-white">WOOTECH IMOB</span>
                  </div>
                  <div className="mt-6 space-y-3 text-sm font-bold text-white/54">
                    {['Dashboard', 'Imoveis', 'Leads', 'Atendimento', 'Contratos', 'Clientes', 'Marketing', 'Locacao', 'Relatorios', 'Configuracoes'].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-lg px-3 py-2 ${index === 1 ? 'bg-[#1f1a16] text-[#ff9b45]' : ''}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.4rem] bg-[#111111] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white">Dashboard</h2>
                    <div className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/55">
                      Diretoria
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      { title: 'Imoveis ativos', value: '1.240', note: '+12 este mes' },
                      { title: 'Leads', value: '532', note: '+18% este mes' },
                      { title: 'Atendimentos', value: '1.032', note: '+34 este mes' },
                      { title: 'Negociacoes', value: '287', note: '+3 aprovacoes' },
                    ].map((card) => (
                      <div key={card.title} className="rounded-2xl bg-[#171717] p-4">
                        <p className="text-xs font-bold text-white/45">{card.title}</p>
                        <p className="mt-3 text-3xl font-black text-white">{card.value}</p>
                        <p className="mt-2 text-xs font-bold text-[#61c273]">{card.note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
                    <div className="rounded-2xl bg-[#171717] p-4">
                      <p className="text-sm font-black text-white">Leads por origem</p>
                      <div className="mt-6 flex items-center gap-6">
                        <div className="h-40 w-40 rounded-full border-[18px] border-[#303030] border-t-[#ff7a00] border-r-[#ffb347] border-b-[#f59e0b] border-l-[#7c7c7c]" />
                        <div className="space-y-3 text-sm font-bold text-white/62">
                          {['Site 48%', 'WhatsApp 26%', 'Indicacao 14%', 'Outros 8%', 'CRM 4%'].map((item) => (
                            <div key={item} className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#ff7a00]" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#171717] p-4">
                      <p className="text-sm font-black text-white">Imoveis em destaque</p>
                      <div className="mt-4 space-y-3">
                        {[
                          { name: 'Apartamento na Praia', city: 'R$ 850.000' },
                          { name: 'Casa em Condominio', city: 'R$ 1.250.000' },
                          { name: 'Sala Comercial', city: 'R$ 390.000' },
                        ].map((item, index) => (
                          <div key={item.name} className="flex items-center gap-3 rounded-xl bg-[#1c1c1c] p-3">
                            <img
                              src={index === 0 ? '/templates/urban/urban_sea_view.png' : index === 1 ? '/templates/urban/urban_gated_community.png' : '/templates/urban/urban_apartment_center.png'}
                              alt={item.name}
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-black text-white">{item.name}</p>
                              <p className="text-xs font-bold text-white/45">{item.city}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#171717] p-4">
                    <p className="text-sm font-black text-white">Evolucao de atendimentos</p>
                    <div className="mt-5 flex h-40 items-end gap-4 rounded-xl border border-white/5 bg-[#151515] px-4 pb-4 pt-8">
                      {[30, 36, 44, 52, 59, 63, 56, 60, 68, 74].map((value, index) => (
                        <div key={index} className="flex flex-1 flex-col items-center gap-2">
                          <div
                            className="w-full rounded-full bg-gradient-to-t from-[#ff7a00] to-[#ffb347]"
                            style={{ height: `${value}%` }}
                          />
                          <span className="text-[10px] font-bold text-white/38">
                            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'][index]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/6 bg-[#111111] py-9">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-8">
            <p className="text-center text-xl font-medium text-white/78">
              Mais de 1.200 imobiliarias ja confiam na {COMMERCIAL_PRODUCT_NAME}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-6 text-center sm:grid-cols-3 lg:grid-cols-6">
              {trustLogos.map((logo) => (
                <div key={logo} className="flex items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] px-3 py-5 text-lg font-black text-white/56">
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solucoes" className="mx-auto max-w-[1440px] px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-[820px] text-center">
            <p className="text-sm font-black uppercase tracking-[0.26em] text-[#ff7a00]">Solucoes completas</p>
            <h2 className="mt-5 text-5xl font-black leading-tight text-white">
              Tudo que sua imobiliaria precisa em um so lugar
            </h2>
            <p className="mx-auto mt-5 max-w-[760px] text-xl font-medium leading-relaxed text-white/66">
              Da captacao ao pos-venda, a {COMMERCIAL_PRODUCT_NAME} conecta processos, pessoas e informacoes para voce focar no que realmente importa: fechar negocios.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {solutions.map((item) => (
              <article key={item.title} className="rounded-[1.8rem] border border-white/8 bg-[#121212] p-7 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl text-[#ff7a00]">
                  <item.icon size={26} />
                </span>
                <h3 className="text-2xl font-black text-white">{item.title}</h3>
                <p className="mt-4 text-base font-medium leading-relaxed text-white/62">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="recursos" className="border-t border-white/8">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div className="pt-5">
              <p className="text-sm font-black uppercase tracking-[0.26em] text-[#ff7a00]">Tecnologia que multiplica resultados</p>
              <h2 className="mt-5 text-5xl font-black leading-tight text-white">
                Inteligencia que transforma dados em negocios
              </h2>
              <p className="mt-5 max-w-[620px] text-xl font-medium leading-relaxed text-white/66">
                A {COMMERCIAL_PRODUCT_NAME} utiliza tecnologia e automacoes para otimizar seu tempo, aumentar a produtividade do time e melhorar a experiencia dos seus clientes.
              </p>

              <div className="mt-8 space-y-4">
                {techBullets.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-[#ff7a00]">
                      <CheckCircle2 size={18} />
                    </span>
                    <p className="text-lg font-medium text-white/82">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/8 bg-[#121212] p-5">
                <img
                  src="/templates/urban/urban_gated_community.png"
                  alt="Analise de lead WooTech Imob"
                  className="h-[520px] w-[620px] rounded-[2rem] object-cover"
                />
                <div className="absolute bottom-8 right-8 w-[220px] rounded-[2rem] border border-[#6b3f1b] bg-[#141414]/96 p-5 shadow-[0_20px_45px_rgba(0,0,0,0.35)] backdrop-blur">
                  <p className="text-sm font-black text-white">Score do Lead</p>
                  <div className="mx-auto mt-5 flex h-36 w-36 items-center justify-center rounded-full border-[12px] border-[#3c332d] border-t-[#ff7a00] border-r-[#ffb347]">
                    <div className="text-center">
                      <p className="text-5xl font-black text-white">92</p>
                      <p className="mt-1 text-sm font-black text-[#ffb347]">Muito quente</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-white/62">
                    Interesse alto em imoveis de R$ 800k - R$ 1.2M
                  </p>
                  <button className="mt-4 w-full rounded-xl border border-[#ff7a00]/35 px-4 py-3 text-sm font-black text-[#ff9b45] transition hover:bg-[#ff7a00]/8">
                    Ver detalhes do lead
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="clientes" className="border-t border-white/8">
          <div className="mx-auto max-w-[1440px] px-6 py-20 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.26em] text-[#ff7a00]">Quem usa, recomenda</p>
              <h2 className="mt-5 text-5xl font-black text-white">Historias de quem cresce com a gente</h2>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {testimonials.map((item, index) => (
                <article key={item.name} className="rounded-[1.8rem] border border-white/8 bg-[#151515] p-8">
                  <p className="text-3xl font-black text-[#ff7a00]">“</p>
                  <p className="mt-2 text-xl font-medium leading-relaxed text-white/82">{item.quote}</p>
                  <div className="mt-8 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a00] to-[#ffb347] text-lg font-black text-white">
                      {index === 0 ? 'J' : index === 1 ? 'C' : 'F'}
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">{item.name}</p>
                      <p className="text-sm font-medium text-white/58">{item.role}</p>
                      <p className="text-sm font-medium text-white/42">{item.company}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cta-final" className="mx-auto max-w-[1440px] px-6 py-10 lg:px-8">
          <div className="grid gap-8 rounded-[2.2rem] border border-[#6b3f1b] bg-[#121212] px-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-10">
            <div className="flex gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.4rem] bg-[#ff7a00] text-white shadow-[0_20px_35px_rgba(255,122,0,0.26)]">
                <LayoutDashboard size={34} />
              </div>
              <div>
                <h2 className="text-5xl font-black leading-tight text-white">
                  Pronto para levar sua imobiliaria para o proximo nivel?
                </h2>
                <p className="mt-4 max-w-[650px] text-lg font-medium leading-relaxed text-white/64">
                  Agende uma demonstracao gratuita e veja como a {COMMERCIAL_PRODUCT_NAME} pode transformar sua operacao e aumentar seus resultados.
                </p>
                <button
                  onClick={() => scrollToSection('formulario-demo')}
                  className="mt-7 rounded-xl bg-[#ff7a00] px-7 py-4 text-base font-black text-white shadow-[0_18px_32px_rgba(255,122,0,0.24)] transition hover:bg-[#ef6f00]"
                >
                  Agendar demonstracao gratuita
                </button>
              </div>
            </div>

            <div className="space-y-4 text-lg font-medium text-white/82">
              {['Demonstracao personalizada', 'Sem compromisso', 'Resposta em ate 1 hora'].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff7a00] text-white">
                    <CheckCircle2 size={15} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="formulario-demo" className="border-t border-white/8">
          <div className="mx-auto max-w-[980px] px-6 py-20 lg:px-8">
            <div className="rounded-[2rem] border border-white/8 bg-[#111111] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
              <h3 className="text-4xl font-black text-white">Agendar demonstracao</h3>
              <p className="mt-3 text-lg font-medium text-white/64">
                Preencha seus dados e nossa equipe monta uma demonstracao alinhada ao seu momento.
              </p>

              <form onSubmit={handleSubmit} className="mt-8">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-14 rounded-xl border border-white/8 bg-[#171717] px-4 text-base font-semibold text-white outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-[#ff7a00]/10"
                    placeholder="Seu nome"
                  />
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-14 rounded-xl border border-white/8 bg-[#171717] px-4 text-base font-semibold text-white outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-[#ff7a00]/10"
                    placeholder="E-mail profissional"
                  />
                  <input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-14 rounded-xl border border-white/8 bg-[#171717] px-4 text-base font-semibold text-white outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-[#ff7a00]/10"
                    placeholder="WhatsApp"
                  />
                  <input
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="h-14 rounded-xl border border-white/8 bg-[#171717] px-4 text-base font-semibold text-white outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-[#ff7a00]/10"
                    placeholder="Imobiliaria"
                  />
                </div>
                <textarea
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className="mt-4 min-h-32 w-full rounded-xl border border-white/8 bg-[#171717] px-4 py-4 text-base font-semibold text-white outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-[#ff7a00]/10"
                  placeholder="Conte rapidamente o que voce quer organizar ou acelerar na sua operacao."
                />
                <button
                  disabled={isSubmitting}
                  className="mt-5 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#ff7a00] px-8 text-base font-black text-white shadow-[0_18px_32px_rgba(255,122,0,0.24)] transition hover:bg-[#ef6f00] disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Agendar demonstracao'}
                  {!isSubmitting ? <ArrowRight size={18} /> : null}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-[#0d0d0d]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-16 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo-wootech-imob-orbit.svg" alt={COMMERCIAL_PRODUCT_NAME} className="h-12 w-auto" />
              <div className="leading-none">
                <p className="text-2xl font-black tracking-tight text-white">WOOTECH</p>
                <p className="text-2xl font-black tracking-tight text-[#ff7a00]">IMOB</p>
              </div>
            </div>
            <p className="mt-5 max-w-[320px] text-lg font-medium leading-relaxed text-white/62">
              O CRM imobiliario completo para imobiliarias urbanas e rurais que querem mais controle, produtividade e resultados.
            </p>
            <div className="mt-6 flex gap-3">
              {['IG', 'FB', 'IN', 'YT'].map((item) => (
                <span key={item} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-sm font-black text-white/72">
                  {item}
                </span>
              ))}
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-xl font-black text-white">{column.title}</p>
              <div className="mt-5 space-y-3">
                {column.items.map((item) => (
                  <div key={item} className="text-base font-medium text-white/62">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 border-t border-white/8 px-6 py-6 text-sm font-medium text-white/36 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>&copy; 2025 {PLATFORM_NAME}. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <span>Politica de Privacidade</span>
            <span>Termos de Uso</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const PLATFORM_NAME = COMMERCIAL_PRODUCT_NAME;

export default SystemSalesPage;
