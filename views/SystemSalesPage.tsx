import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  DatabaseZap,
  FileText,
  Globe2,
  LandPlot,
  LayoutPanelTop,
  Loader2,
  Menu,
  MessageSquare,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRoundCheck,
  WalletCards,
  Workflow,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { COMMERCIAL_PRODUCT_NAME } from '../utils/branding';

const menuItems = [
  { label: 'Plataforma', target: 'funcionalidades' },
  { label: 'Operacao com IA', target: 'operacao-ia' },
  { label: 'Rural + Urbano', target: 'rural-urbano' },
  { label: 'Planos', target: 'planos' },
];

const portalLogos = [
  { name: 'ZAP Imoveis', color: 'bg-orange-500', text: 'Z' },
  { name: 'VivaReal', color: 'bg-sky-500', text: 'VR' },
  { name: 'OLX', color: 'bg-violet-600', text: 'OLX' },
  { name: 'Imovelweb', color: 'bg-orange-600', text: 'IW' },
  { name: 'Chaves na Mao', color: 'bg-rose-500', text: 'CM' },
  { name: 'QuintoAndar', color: 'bg-indigo-600', text: '5A' },
];

const heroMetrics = [
  { value: 'CRM + ERP', label: 'operacao comercial e administrativa unificadas' },
  { value: 'Rural + Urbano', label: 'uma plataforma para duas realidades do mercado' },
  { value: 'IA + Dados', label: 'atendimento, automacao e inteligencia aplicada' },
];

const chatMessages = [
  {
    side: 'right',
    text: 'Oi, vi essa fazenda e tambem preciso de uma opcao urbana para renda. Voces atendem os dois perfis?',
    time: '14:20',
  },
  {
    side: 'left',
    text: 'Atendemos sim. Vou separar oportunidades rurais com dados tecnicos e opcoes urbanas dentro do seu perfil.',
    time: '14:21',
  },
  {
    side: 'right',
    text: 'Prefiro falar de retorno, documentacao e prazo para visita.',
    time: '14:22',
  },
  {
    side: 'left',
    text: 'Perfeito. Ja deixei o lead qualificado no CRM e posso seguir com visita, dossie e proposta.',
    time: '14:23',
  },
];

const platformCards = [
  {
    icon: MessageSquare,
    title: 'Atendimento comercial com IA',
    text: 'WhatsApp, formularios, campanhas e roteiros comerciais trabalhando juntos para qualificar o lead antes do corretor entrar.',
    badge: 'Alta conversao',
  },
  {
    icon: LayoutPanelTop,
    title: 'CRM de ponta a ponta',
    text: 'Pipeline, distribuicao, historico, tarefas, agendas, match de imovel e acompanhamento do funil sem planilhas paralelas.',
  },
  {
    icon: WalletCards,
    title: 'ERP da operacao imobiliaria',
    text: 'Contratos, locacao, documentos, processos, controle operacional e visibilidade gerencial em um unico ambiente.',
    badge: 'Operacao real',
  },
  {
    icon: Globe2,
    title: 'Estoque e canais sincronizados',
    text: 'Cadastre uma vez e transforme o imovel em publicacao, landing page, catalogo e feed para portais conectados.',
  },
  {
    icon: LandPlot,
    title: 'Modulo rural com vantagem competitiva',
    text: 'Cadastro tecnico, mapas, CAR, SIGEF, dossie, valuation e inteligencia territorial para negociacoes de alto valor.',
    badge: 'Diferencial de mercado',
  },
  {
    icon: DatabaseZap,
    title: 'Dados que viram decisao',
    text: 'Sua operacao deixa de ser um conjunto de telas e passa a gerar contexto, prioridade, previsibilidade e escala.',
  },
];

const operationPillars = [
  'A IA atende em segundos, qualifica e entrega contexto no CRM.',
  'A equipe trabalha com pipeline, agenda, tarefas e historico unificados.',
  'O estoque alimenta campanhas, portais, paginas e propostas sem retrabalho.',
  'A lideranca acompanha operacao urbana e rural com mais controle e menos ruido.',
];

const nicheTracks = [
  {
    title: 'Imobiliaria Urbana',
    badge: 'Comercial + locacao + atendimento',
    points: [
      'Captacao, estoque, CRM e distribuicao de leads',
      'WhatsApp, campanhas, landing pages e publicacao',
      'Locacao, contratos, documentos e operacao recorrente',
    ],
  },
  {
    title: 'Imobiliaria Rural',
    badge: 'Documentacao + geointeligencia + dossie',
    points: [
      'CAR, SIGEF, mapas e cadastro tecnico dentro do fluxo',
      'Dossie comercial, analise e apresentacao profissional',
      'Mais argumento, mais seguranca e mais valor percebido na negociacao',
    ],
  },
];

const operatingFlow = [
  {
    n: '1',
    title: 'Capture e qualifique',
    text: 'Landing pages, campanhas, WhatsApp e IA transformam interesse em lead com contexto.',
  },
  {
    n: '2',
    title: 'Organize e execute',
    text: 'CRM, agenda, distribuicao, estoque e equipe operam com clareza do proximo passo.',
  },
  {
    n: '3',
    title: 'Feche com previsibilidade',
    text: 'Proposta, documentos, contratos, dossies e operacao comercial passam a ter rastreabilidade.',
  },
];

const beforeAfter = {
  before: [
    'WhatsApp, planilhas, anuncios e documentos andando em ferramentas separadas',
    'Lead chega, mas o contexto se perde entre corretores e canais',
    'Operacao rural e urbana exigem processos diferentes e sem padrao',
    'A gestao sabe que esta ocupada, mas nao enxerga o gargalo real',
  ],
  after: [
    'Uma unica plataforma para comercial, operacao e crescimento',
    'Lead entra qualificado, com historico, perfil e proximo passo claro',
    'Rural e urbano convivem com inteligencia, governanca e padrao operacional',
    'A lideranca acompanha a esteira inteira, nao apenas tarefas soltas',
  ],
};

const plans = [
  {
    name: 'Start',
    tag: 'Para corretores e operacoes enxutas',
    description:
      'Base ideal para organizar atendimento, estoque e processo comercial com mais velocidade.',
    items: [
      'CRM comercial com pipeline e historico',
      'WhatsApp, formularios e captacao centralizados',
      'Estoque, paginas e publicacoes em um fluxo unico',
    ],
  },
  {
    name: 'Performance',
    tag: 'Para imobiliarias em crescimento',
    highlight: true,
    description:
      'Estrutura para escalar atendimento, distribuicao, automacao e visibilidade operacional.',
    items: [
      'Tudo do Start com mais automacao e governanca',
      'IA para atendimento, qualificacao e apoio comercial',
      'Mais controle gerencial sobre equipe, canais e operacao',
    ],
  },
  {
    name: 'Enterprise',
    tag: 'Para operacoes complexas e multiunidade',
    description:
      'Configuracao consultiva para imobiliarias com fluxo urbano, rural ou hibrido.',
    items: [
      'Desenho de operacao por nicho e por time',
      'Camadas de processo, permissao e rollout',
      'Estrutura pronta para escalar com seguranca',
    ],
  },
];

const salesBullets = [
  { icon: ShieldCheck, text: 'Diagnostico consultivo da sua operacao' },
  { icon: Workflow, text: 'Mapeamento do fluxo comercial e operacional' },
  { icon: CalendarCheck, text: 'Plano de implantacao por prioridade' },
  { icon: FileText, text: 'Visao clara do que automatizar primeiro' },
];

const SystemSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [, setIsStandalone] = useState(false);
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    sessionStorage.setItem('wootech_imob_demo_lead', JSON.stringify(formData));
    toast.success('Vamos preparar um diagnostico da sua operacao.');

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

  const scrollToSection = (target: string) => {
    setIsMenuOpen(false);
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#f6f4ec] text-slate-950 selection:bg-emerald-100 selection:text-emerald-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#081713]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => scrollToSection('topo')}
            className="flex items-center gap-3 text-white"
          >
            <img
              src="/logo-wootech-imob-orbit.svg"
              alt={COMMERCIAL_PRODUCT_NAME}
              className="h-10 w-auto"
            />
            <span className="hidden text-lg font-bold tracking-tight sm:inline">
              {COMMERCIAL_PRODUCT_NAME}
            </span>
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.target)}
                className="text-sm font-bold text-white/75 transition-colors hover:text-[#c8ff66]"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => navigate('/login')}
              className="h-10 rounded-full px-5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Entrar
            </button>
            <button
              onClick={() => scrollToSection('demo-form')}
              className="h-10 rounded-full bg-[#c8ff66] px-5 text-sm font-bold text-[#0a1b17] shadow-lg shadow-[#c8ff66]/30 transition hover:bg-[#d5ff84]"
            >
              Agendar diagnostico
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 md:hidden"
            aria-label="Abrir menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {isMenuOpen ? (
          <div className="border-t border-white/10 bg-[#081713] px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollToSection(item.target)}
                  className="rounded-xl px-3 py-3 text-left text-sm font-bold text-white/80 hover:bg-white/10"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => navigate('/login')}
                className="rounded-xl px-3 py-3 text-left text-sm font-bold text-[#c8ff66] hover:bg-white/10"
              >
                Entrar
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main id="topo">
        <section className="relative overflow-hidden bg-[#081713] pt-16 text-white">
          <img
            src="/images/sales/hero-corretores.webp"
            alt="Equipe imobiliaria usando plataforma operacional"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.16]"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(200,255,102,0.12),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(20,184,122,0.18),_transparent_28%),linear-gradient(135deg,#081713_0%,#103126_55%,#0a1826_100%)]" />

          <div className="relative mx-auto grid min-h-[calc(95vh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.92fr]">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c8ff66]/20 bg-[#c8ff66]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c8ff66]">
                <Sparkles size={14} />
                ERP imobiliario com IA para operacao urbana e rural
              </div>

              <h1 className="text-4xl font-bold leading-[1.01] tracking-tight sm:text-6xl lg:text-7xl">
                Sua imobiliaria nao precisa de mais um CRM.
                <span className="block text-[#c8ff66]">Precisa de uma operacao inteira conectada.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-white/76 sm:text-xl">
                {COMMERCIAL_PRODUCT_NAME} unifica comercial, estoque, atendimento,
                marketing, contratos, locacao e inteligencia territorial para
                imobiliarias que vendem no urbano, no rural ou nos dois.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => scrollToSection('demo-form')}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#c8ff66] px-8 text-base font-bold text-[#081713] shadow-2xl shadow-[#c8ff66]/20 transition hover:bg-[#d5ff84]"
                >
                  Quero ver minha operacao nisso <ArrowRight size={19} />
                </button>
                <button
                  onClick={() => scrollToSection('operacao-ia')}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 text-base font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <PlayCircle size={18} /> Ver a experiencia
                </button>
              </div>

              <div className="mt-10 grid max-w-3xl gap-3 md:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 backdrop-blur"
                  >
                    <p className="text-xl font-bold text-[#c8ff66]">{metric.value}</p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-white/62">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[640px] pb-16 pt-4">
              <div className="ml-auto w-[79%] overflow-hidden rounded-[1.8rem] border border-white/15 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="relative min-h-[540px] overflow-hidden rounded-[1.45rem]">
                  <img
                    src="/templates/urban/urban_sea_view.png"
                    alt="Operacao urbana publicada"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute bottom-8 left-6 right-6">
                    <p className="text-sm font-bold text-white/78">Painel de estoque e canais</p>
                    <h2 className="mt-1 text-3xl font-bold">Estoque pronto para vender</h2>
                    <p className="mt-2 text-sm font-bold text-white/84">
                      portais, paginas, campanhas e atendimento trabalhando juntos
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute left-0 top-24 w-[305px] overflow-hidden rounded-[1.75rem] border-[8px] border-[#101716] bg-[#f7f1e6] shadow-2xl shadow-black/35">
                <div className="flex items-center gap-3 bg-[#0c5a49] px-4 py-3 text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c8ff66] text-sm font-black text-[#0c1e19]">
                    W
                  </span>
                  <div>
                    <p className="text-sm font-bold">{COMMERCIAL_PRODUCT_NAME} IA</p>
                    <p className="text-[11px] font-semibold text-emerald-200">
                      online - qualificando e distribuindo
                    </p>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  {chatMessages.map((message) => (
                    <div
                      key={`${message.text}-${message.time}`}
                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs font-semibold leading-relaxed ${
                        message.side === 'right'
                          ? 'ml-auto bg-[#defec4] text-slate-900'
                          : 'mr-auto bg-white text-slate-900 shadow-sm'
                      }`}
                    >
                      {message.text}
                      <span className="mt-1 block text-right text-[10px] font-bold text-slate-400">
                        {message.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-4 right-0 hidden w-48 space-y-2 sm:block">
                {portalLogos.slice(0, 4).map((portal) => (
                  <div
                    key={portal.name}
                    className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-lg"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${portal.color} text-[10px] text-white`}
                    >
                      {portal.text}
                    </span>
                    {portal.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="portais" className="border-b border-slate-200 bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-400">
              Estoque conectado com canais que aceleram a venda
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {portalLogos.map((portal) => (
                <div
                  key={portal.name}
                  className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm"
                >
                  <span
                    className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1 text-[10px] font-bold text-white ${portal.color}`}
                  >
                    {portal.text}
                  </span>
                  <span className="text-sm font-bold text-slate-950">{portal.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-7 text-xs font-semibold text-slate-500">
              Um cadastro consistente alimenta portais, paginas, campanhas e atendimento.
            </p>
          </div>
        </section>

        <section id="operacao-ia" className="bg-[#fbfaf6] py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.88fr_1fr] lg:items-center">
            <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[2rem] border-[10px] border-[#101716] bg-[#f7f1e6] shadow-2xl shadow-slate-900/18">
              <div className="flex items-center gap-3 bg-[#0c5a49] px-5 py-4 text-white">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c8ff66] font-black text-[#0a1b17]">
                  W
                </span>
                <div>
                  <p className="font-bold">{COMMERCIAL_PRODUCT_NAME} IA</p>
                  <p className="text-xs font-semibold text-emerald-200">online - respondendo agora</p>
                </div>
              </div>
              <div className="space-y-3 p-5">
                {chatMessages.map((message) => (
                  <div
                    key={`large-${message.text}`}
                    className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed ${
                      message.side === 'right' ? 'ml-auto bg-[#defec4]' : 'mr-auto bg-white shadow-sm'
                    }`}
                  >
                    {message.text}
                    <span className="mt-1 block text-right text-[10px] font-bold text-slate-400">
                      {message.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Atendimento com contexto
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                A IA nao substitui sua equipe. Ela prepara o terreno para sua equipe vender melhor.
              </h2>
              <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-slate-600">
                O diferencial nao e apenas responder mensagens. E transformar cada contato em
                um lead qualificado, com historico, perfil, urgencia e proximo passo claro dentro da operacao.
              </p>

              <div className="mt-8 space-y-3">
                {operationPillars.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-emerald-800">
                      <Bot size={18} />
                    </span>
                    <p className="font-bold text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                Plataforma operacional completa
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Uma marca forte vende. Uma operacao conectada escala.
              </h2>
              <p className="mt-4 text-lg font-medium leading-relaxed text-slate-600">
                {COMMERCIAL_PRODUCT_NAME} foi pensado para quem ja percebeu que vender mais
                depende de atendimento, processo, dados, marketing e execucao trabalhando no mesmo ritmo.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {platformCards.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-[1.8rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <feature.icon size={24} />
                    </span>
                    {feature.badge ? (
                      <span className="rounded-full border border-[#c8ff66]/40 bg-[#c8ff66]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#466300]">
                        {feature.badge}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                    {feature.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="rural-urbano"
          className="bg-gradient-to-br from-[#103126] to-[#0a1826] py-20 text-white sm:py-28"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-14 max-w-4xl text-center">
              <span className="rounded-full border border-[#c8ff66]/30 bg-[#c8ff66]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c8ff66]">
                Rural e urbano sem conflito de discurso
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
                Nao e uma adaptacao improvisada. E uma plataforma que entende as duas operacoes.
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {nicheTracks.map((track) => (
                <article
                  key={track.title}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 backdrop-blur"
                >
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c8ff66]">
                    {track.badge}
                  </span>
                  <h3 className="mt-5 text-3xl font-bold">{track.title}</h3>
                  <div className="mt-6 space-y-4">
                    {track.points.map((point) => (
                      <div key={point} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-[#c8ff66]" size={18} />
                        <p className="text-sm font-semibold leading-relaxed text-white/78">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#fbfaf6] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-14 max-w-4xl text-center">
              <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                Fluxo pensado para resultado
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Da captacao ao fechamento sem perder contexto no caminho.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {operatingFlow.map((step) => (
                <article key={step.n} className="relative rounded-[1.8rem] border border-slate-200 bg-white p-7 shadow-sm">
                  <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-[#0d6b52] text-2xl font-bold text-white shadow-xl shadow-emerald-900/10">
                    {step.n}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                    {step.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.92fr_1fr] lg:items-center">
            <div className="relative">
              <img
                src="/images/sales/hero-corretores.webp"
                alt="Gestao imobiliaria em alta performance"
                className="h-[460px] w-full rounded-[2rem] object-cover shadow-2xl shadow-slate-900/12"
              />
              <div className="absolute right-4 top-12 rounded-2xl bg-white p-5 shadow-xl">
                <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <TrendingUp size={14} className="text-emerald-600" /> Operacao acompanhada
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">Mais previsibilidade</p>
                <p className="text-xs font-bold text-slate-500">menos retrabalho e mais visao de funil</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.8rem] border border-rose-100 bg-rose-50 p-6">
                <p className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-rose-700">
                  Quando o sistema e so uma soma de telas
                </p>
                <div className="space-y-4">
                  {beforeAfter.before.map((item) => (
                    <div key={item} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                        <ArrowRight size={12} className="rotate-45" />
                      </span>
                      <p className="text-sm font-bold text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-emerald-200 bg-emerald-50 p-6">
                <p className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">
                  Quando a operacao roda no {COMMERCIAL_PRODUCT_NAME}
                </p>
                <div className="space-y-4">
                  {beforeAfter.after.map((item) => (
                    <div key={item} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={18} />
                      <p className="text-sm font-bold text-slate-800">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="planos" className="bg-[#fbfaf6] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <span className="rounded-full bg-[#c8ff66]/20 px-4 py-2 text-xs font-bold text-[#466300]">
                Estrutura por estagio de operacao
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Planos pensados para maturidade, nao para empurrar modulo sem contexto.
              </h2>
              <p className="mt-4 text-lg font-medium leading-relaxed text-slate-600">
                Sem expor preco nesta fase: o foco aqui e encaixar a plataforma no momento certo da sua operacao.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative rounded-[2rem] border p-7 shadow-sm ${
                    plan.highlight
                      ? 'border-[#c8ff66] bg-white text-slate-950 shadow-2xl shadow-[#c8ff66]/10'
                      : 'border-slate-200 bg-white text-slate-950'
                  }`}
                >
                  {plan.highlight ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#c8ff66] px-5 py-1 text-xs font-bold text-[#0a1b17]">
                      Mais aderente para crescimento
                    </span>
                  ) : null}
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">{plan.tag}</p>
                  <p className="mt-6 text-sm font-medium leading-relaxed text-slate-600">
                    {plan.description}
                  </p>
                  <button
                    onClick={() => scrollToSection('demo-form')}
                    className={`mt-6 h-12 w-full rounded-full text-sm font-bold transition ${
                      plan.highlight
                        ? 'bg-[#0d6b52] text-white hover:bg-[#0a5b45]'
                        : 'bg-slate-950 text-white hover:bg-slate-900'
                    }`}
                  >
                    Quero entender esse formato
                  </button>
                  <ul className="mt-6 space-y-3">
                    {plan.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm font-bold text-slate-600">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={16} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="demo-form" className="bg-gradient-to-br from-[#103126] to-[#0a1826] py-20 text-white sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <h2 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
                Vamos desenhar a copy, a operacao e a implantacao que fazem sentido para sua imobiliaria.
              </h2>
              <p className="mt-5 text-lg font-medium leading-relaxed text-white/75">
                O objetivo nao e te vender mais uma ferramenta. E mostrar como sua imobiliaria
                pode operar com mais clareza, velocidade e valor percebido.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {salesBullets.map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/8 p-4 text-sm font-bold text-white/82"
                  >
                    <item.icon className="text-[#c8ff66]" size={18} />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-white/14 bg-white p-5 text-slate-950 shadow-2xl sm:p-8"
            >
              <div className="mb-5">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Diagnostico comercial e operacional
                </span>
                <h3 className="mt-4 text-2xl font-bold">Quero ver o {COMMERCIAL_PRODUCT_NAME} no meu contexto</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="Seu nome"
                />
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="E-mail profissional"
                />
                <input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="WhatsApp"
                />
                <input
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="Imobiliaria"
                />
              </div>

              <textarea
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="mt-4 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Qual frente mais precisa de atencao agora? Ex: captacao, WhatsApp, locacao, rural, dossie, contratos, distribuicao de leads..."
              />

              <button
                disabled={isSubmitting}
                className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#0d6b52] px-8 text-base font-bold text-white transition hover:bg-[#0a5b45] disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Quero meu diagnostico'}
                {!isSubmitting ? <ArrowRight size={18} /> : null}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0a1826] py-14 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/logo-wootech-imob-orbit.svg"
                alt={COMMERCIAL_PRODUCT_NAME}
                className="h-10 w-auto"
              />
              <span className="font-bold">{COMMERCIAL_PRODUCT_NAME}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm font-medium leading-relaxed text-white/62">
              Plataforma operacional para imobiliarias urbanas e rurais com CRM, ERP, IA e inteligencia territorial.
            </p>
          </div>
          <div>
            <p className="font-bold">Plataforma</p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-white/62">
              <button onClick={() => scrollToSection('funcionalidades')} className="block hover:text-white">
                Plataforma
              </button>
              <button onClick={() => scrollToSection('operacao-ia')} className="block hover:text-white">
                Operacao com IA
              </button>
              <button onClick={() => scrollToSection('rural-urbano')} className="block hover:text-white">
                Rural + Urbano
              </button>
            </div>
          </div>
          <div>
            <p className="font-bold">Jornada</p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-white/62">
              <button onClick={() => scrollToSection('planos')} className="block hover:text-white">
                Estrutura de planos
              </button>
              <button onClick={() => scrollToSection('demo-form')} className="block hover:text-white">
                Diagnostico
              </button>
              <button onClick={() => navigate('/login')} className="block hover:text-white">
                Login
              </button>
            </div>
          </div>
          <div>
            <p className="font-bold">Marca</p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-white/62">
              <span className="block">WooTech Imob</span>
              <span className="block">Imobiliaria urbana e rural</span>
              <span className="block">Operacao, dados e crescimento</span>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-4 pt-8 text-center text-xs font-semibold text-white/45 sm:px-6">
          &copy; {new Date().getFullYear()} {COMMERCIAL_PRODUCT_NAME}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default SystemSalesPage;
