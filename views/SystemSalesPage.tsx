import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
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
import { leadService } from '../services/leads';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const menuItems = [
  { label: 'Plataforma', target: 'plataforma' },
  { label: 'Soluções', target: 'beneficios' },
  { label: 'Recursos', target: 'como-funciona' },
  { label: 'Clientes', target: 'clientes' },
  { label: 'Preços', target: 'demo-form' },
  { label: 'Conteúdos', target: 'integracoes' },
];

const heroStats = [
  { label: 'Leads captados', value: '1.248', delta: '+18%' },
  { label: 'Oportunidades', value: '312', delta: '+22%' },
  { label: 'Negociações', value: '78', delta: '+8%' },
  { label: 'Receita prevista', value: 'R$ 1,48M', delta: '+30%' },
];

const kanbanColumns = [
  { title: 'Novo lead', color: 'bg-amber-400', cards: ['João Mendes', 'Mariana Telles'] },
  { title: 'Qualificado', color: 'bg-orange-400', cards: ['Beatriz Lima', 'Rapha Nunes'] },
  { title: 'Proposta', color: 'bg-sky-400', cards: ['Juliana Costa', 'Lucas Ferreira'] },
  { title: 'Negociação', color: 'bg-emerald-400', cards: ['Ana Paula', 'Felipe Santos'] },
];

const metrics = [
  { icon: TrendingUp, value: '+250%', label: 'produtividade comercial' },
  { icon: Clock3, value: '-60%', label: 'tempo de resposta' },
  { icon: Workflow, value: '+1.8M', label: 'leads processados/mês' },
  { icon: ShieldCheck, value: '99,9%', label: 'uptime e segurança' },
];

const benefits = [
  {
    icon: LayoutDashboard,
    title: 'CRM imobiliário visual',
    text: 'Pipeline claro para acompanhar captação, atendimento, propostas e fechamento em uma única operação.',
  },
  {
    icon: MessageSquare,
    title: 'Atendimento omnichannel',
    text: 'Centralize WhatsApp, site, portais, Instagram e e-mail sem perder histórico ou oportunidades.',
  },
  {
    icon: Bot,
    title: 'IA para qualificação',
    text: 'Priorize leads com maior intenção, receba sugestões de próximo passo e reduza atendimento manual.',
  },
  {
    icon: Home,
    title: 'Gestão de imóveis',
    text: 'Controle disponibilidade, mídia, documentos, portais e dados comerciais com padrão profissional.',
  },
  {
    icon: CalendarCheck,
    title: 'Agenda e visitas',
    text: 'Organize visitas, retornos, follow-ups e tarefas críticas para manter o time em movimento.',
  },
  {
    icon: BarChart3,
    title: 'Dashboards executivos',
    text: 'Métricas de conversão, velocidade de atendimento e previsão de vendas em tempo real.',
  },
];

const beforeItems = [
  'Leads espalhados em planilhas e conversas',
  'Atendimento lento e sem prioridade',
  'Gestores sem previsibilidade de venda',
  'Corretores repetindo tarefas manuais',
];

const afterItems = [
  'Todos os canais centralizados no CRM',
  'IA indicando intenção e próximo passo',
  'Pipeline previsível por etapa e corretor',
  'Automação para follow-up e distribuição',
];

const steps = [
  ['1', 'Captar', 'Receba leads de site, portais, WhatsApp e redes sociais em uma entrada organizada.'],
  ['2', 'Qualificar', 'A IA identifica intenção, urgência, perfil e melhores oportunidades para o time.'],
  ['3', 'Distribuir', 'Direcione o lead para o corretor certo com regras e contexto completo.'],
  ['4', 'Negociar', 'Acompanhe propostas, visitas, tarefas e mensagens sem perder o ritmo comercial.'],
  ['5', 'Escalar', 'Use dados para replicar o que vende mais e corrigir gargalos rapidamente.'],
];

const integrations = [
  { icon: MessageSquare, title: 'WhatsApp', text: 'Business API' },
  { icon: Instagram, title: 'Instagram', text: 'Direct' },
  { icon: Globe2, title: 'Site', text: 'Formulários' },
  { icon: Mail, title: 'E-mail', text: 'Marketing' },
  { icon: Building2, title: 'Portais', text: 'Imobiliários' },
  { icon: Zap, title: 'Zapier', text: 'Automação' },
  { icon: Send, title: 'RD Station', text: 'Marketing' },
  { icon: Plug, title: 'APIs', text: 'Integrações' },
];

const testimonials = [
  {
    quote: 'Centralizamos atendimento, funil e gestão. Em poucas semanas já tínhamos mais velocidade e previsibilidade.',
    name: 'Carlos Machado',
    role: 'Diretor Comercial',
    metric: '+35% em vendas',
    avatar: 'https://i.pravatar.cc/120?img=12',
  },
  {
    quote: 'O time parou de perder lead no WhatsApp. A distribuição ficou clara e os retornos acontecem na hora certa.',
    name: 'Juliana Ribeiro',
    role: 'Gerente de Operações',
    metric: '-58% no tempo de resposta',
    avatar: 'https://i.pravatar.cc/120?img=47',
  },
  {
    quote: 'Os relatórios tiraram a operação do achismo. Hoje sabemos onde cada venda trava e o que precisa melhorar.',
    name: 'Rafael Nogueira',
    role: 'CEO',
    metric: '4,9/5 de avaliação',
    avatar: 'https://i.pravatar.cc/120?img=33',
  },
];

const socialProofAvatars = ['https://i.pravatar.cc/80?img=21', 'https://i.pravatar.cc/80?img=36', 'https://i.pravatar.cc/80?img=52', 'https://i.pravatar.cc/80?img=59'];

const SectionHeader: React.FC<{ eyebrow: string; title: string; text?: string }> = ({ eyebrow, title, text }) => (
  <div className="mx-auto max-w-3xl text-center">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-black leading-tight text-[#07172a] md:text-4xl">{title}</h2>
    {text ? <p className="mt-4 text-base font-semibold leading-7 text-slate-600">{text}</p> : null}
  </div>
);

const DashboardPreview: React.FC = () => (
  <div className="relative">
    <div className="max-h-[420px] overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_28px_80px_rgba(15,23,42,0.14)] sm:max-h-[680px] lg:max-h-none">
      <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-[#f5f7fb]">
        <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-300" />
            <span className="h-3 w-3 rounded-full bg-amber-300" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="hidden rounded-full bg-slate-100 px-4 py-1 text-xs font-black text-slate-500 sm:block">app.imobzy.com/pipeline</div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Sparkles size={15} />
          </div>
        </div>

        <div className="grid min-h-[380px] sm:min-h-[520px] lg:grid-cols-[160px_1fr]">
          <aside className="hidden border-r border-slate-200 bg-white p-4 lg:block">
            <img src="/logo-imobzy-360.svg" alt="IMOBZY" className="mb-7 h-8 w-auto" />
            {['Visão geral', 'Leads', 'Atendimentos', 'Imóveis', 'Agenda', 'Relatórios'].map((item, index) => (
              <div key={item} className={`mb-2 flex items-center gap-2 rounded-xl px-3 py-3 text-xs font-black ${index === 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
                <span className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                {item}
              </div>
            ))}
          </aside>

          <div className="min-w-0 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Operação comercial</p>
                <h3 className="mt-1 text-2xl font-black text-[#07172a]">Pipeline em tempo real</h3>
              </div>
              <button className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-lg shadow-emerald-900/15">+ Novo lead</button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-black text-slate-500">{stat.label}</p>
                  <p className="mt-2 whitespace-nowrap text-2xl font-black text-[#07172a]">{stat.value}</p>
                  <p className="mt-2 text-xs font-black text-emerald-600">{stat.delta}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-base font-black text-[#07172a]">Funil de oportunidades</h4>
                <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">78 negociações ativas</span>
              </div>
              <div className="overflow-x-auto pb-2 xl:overflow-visible">
                <div className="grid min-w-[640px] grid-cols-4 gap-3 xl:min-w-0">
                  {kanbanColumns.map((column) => (
                    <div key={column.title} className="rounded-[18px] bg-[#f5f7fb] p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${column.color}`} />
                        <span className="text-[11px] font-black text-slate-700">{column.title}</span>
                      </div>
                      <div className="space-y-2">
                        {column.cards.map((card) => (
                          <div key={card} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                            <p className="text-xs font-black leading-4 text-[#07172a]">{card}</p>
                            <p className="mt-2 text-[11px] font-bold text-slate-400">R$ 680.000</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {['WhatsApp respondido', 'Visita agendada', 'Proposta enviada'].map((item, index) => (
                <div key={item} className="rounded-[18px] border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    {index === 0 ? <MessageSquare size={18} /> : index === 1 ? <CalendarCheck size={18} /> : <Send size={18} />}
                  </div>
                  <p className="text-xs font-black text-[#07172a]">{item}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">Agora há pouco</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 h-20 rounded-b-[18px] bg-gradient-to-t from-white to-transparent sm:hidden" />
    </div>
  </div>
);

const HeroAdvisorPanel: React.FC = () => (
  <div className="relative">
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
      <div className="grid bg-[#07172a] lg:grid-cols-[0.82fr_1fr]">
        <div className="relative z-10 p-6 text-white sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-emerald-200">
            <Bot size={15} />
            IA comercial ativa
          </div>
          <h3 className="mt-5 text-2xl font-black leading-tight sm:text-3xl">
            Atendimento rápido, corretor certo e lead quente no funil.
          </h3>
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
            A IMOBZY organiza cada contato para sua equipe agir com contexto, velocidade e previsibilidade.
          </p>

          <div className="mt-7 grid gap-3">
            {[
              ['00:42', 'tempo médio para primeiro contato'],
              ['92%', 'leads com próximo passo sugerido'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-2xl font-black text-emerald-300">{value}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[360px] overflow-hidden bg-slate-100 sm:min-h-[430px]">
          <img
            src="/images/sales/hero-corretores.webp"
            alt="Corretores imobiliários usando tecnologia para acompanhar leads e oportunidades"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,23,42,0.02)_0%,rgba(7,23,42,0.52)_100%)]" />
          <div className="absolute bottom-5 left-5 right-5 rounded-[20px] border border-white/25 bg-white/90 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <MessageSquare size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-[#07172a]">Novo lead qualificado</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                  Cliente com intenção alta para imóvel de R$ 680 mil. Próximo passo enviado ao corretor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="absolute -bottom-5 left-5 hidden rounded-[18px] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 sm:block">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <TrendingUp size={19} />
        </div>
        <div>
          <p className="text-sm font-black text-[#07172a]">+35% em conversão</p>
          <p className="text-xs font-bold text-slate-500">operações com playbook ativo</p>
        </div>
      </div>
    </div>
  </div>
);

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

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      toast.success('IMOBZY instalado com sucesso.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await leadService.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        source: 'Página de Vendas - Demonstração',
        notes: `Empresa: ${formData.company} | Objetivo: ${formData.goal || 'Não informado'} | Interesse: Demonstração Completa`,
      } as any);

      toast.success('Dados recebidos! Redirecionando para agendamento...');

      setTimeout(() => {
        navigate(`/consultoria/qualificacao?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&company=${encodeURIComponent(formData.company)}`);
      }, 1200);
    } catch (error) {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    setIsMenuOpen(false);
    document.getElementById('demo-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToSection = (target: string) => {
    setIsMenuOpen(false);
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#07172a] selection:bg-emerald-100 selection:text-emerald-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5">
          <button type="button" onClick={() => scrollToSection('plataforma')} className="flex items-center">
            <img src="/logo-imobzy-360.svg" alt="IMOBZY" className="h-9 w-auto" />
          </button>
          <nav className="hidden items-center gap-7 lg:flex">
            {menuItems.map((item) => (
              <button key={item.label} onClick={() => scrollToSection(item.target)} className="flex items-center gap-1 text-sm font-extrabold text-slate-700 transition hover:text-emerald-700">
                {item.label}
                {['Plataforma', 'Soluções', 'Recursos', 'Conteúdos'].includes(item.label) && <ChevronDown size={14} />}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/login')} className="hidden h-11 rounded-xl border border-slate-300 px-6 text-sm font-black text-slate-800 transition hover:border-emerald-500 hover:text-emerald-700 sm:block">
              Entrar
            </button>
            <button onClick={scrollToForm} className="h-11 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700 sm:px-6 sm:text-sm">
              Agendar demo
            </button>
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm lg:hidden"
            >
              {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="fixed inset-x-3 top-[72px] z-50 rounded-[20px] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15 lg:hidden">
            <nav className="grid grid-cols-2 gap-2">
              {menuItems.map((item) => (
                <button key={item.label} type="button" onClick={() => scrollToSection(item.target)} className="rounded-2xl bg-[#f5f7fb] px-4 py-3 text-left text-sm font-black text-slate-800">
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="mt-3 grid gap-2">
              {!isStandalone && installPrompt && (
                <button type="button" onClick={handleInstallApp} className="h-11 rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-700">
                  Instalar aplicativo
                </button>
              )}
              <button type="button" onClick={() => navigate('/login')} className="h-11 rounded-2xl border border-slate-200 text-sm font-black text-slate-900">
                Entrar no painel
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="plataforma" className="bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fb_100%)]">
          <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-8 sm:gap-12 sm:py-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-16">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm">
                <Sparkles size={15} />
                Plataforma comercial inteligente para imobiliárias
              </div>
              <h1 className="max-w-2xl text-[36px] font-black leading-[0.98] text-[#07172a] sm:text-6xl lg:text-[68px]">
                Venda mais imóveis com automação, IA e pipeline previsível.
              </h1>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">
                A IMOBZY centraliza leads, imóveis, atendimento e dados comerciais para sua equipe responder rápido, negociar melhor e escalar vendas.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                <button onClick={scrollToForm} className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 text-sm font-black text-white shadow-xl shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 sm:h-14">
                  Agendar demonstração <ArrowRight size={18} />
                </button>
                <button onClick={() => scrollToSection('beneficios')} className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-8 text-sm font-black text-[#07172a] transition hover:border-emerald-500 hover:text-emerald-700 sm:h-14">
                  Ver plataforma <ChevronRight size={18} />
                </button>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex -space-x-3">
                  {socialProofAvatars.map((avatar) => (
                    <img key={avatar} src={avatar} alt="" className="h-10 w-10 rounded-full border-2 border-white object-cover" />
                  ))}
                </div>
                <p className="max-w-sm text-sm font-bold leading-6 text-slate-600">
                  +350 imobiliárias já transformaram sua operação comercial com a IMOBZY.
                </p>
              </div>
            </div>
            <HeroAdvisorPanel />
          </div>

          <div className="mx-auto max-w-[1280px] px-5 pb-10 sm:pb-14">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Produto em ação</p>
                <h2 className="mt-2 text-2xl font-black text-[#07172a] sm:text-3xl">Veja o pipeline IMOBZY organizando a operação.</h2>
              </div>
              <p className="max-w-md text-sm font-semibold leading-6 text-slate-600">
                Dashboard, funil e automações aparecem como prova concreta depois da promessa principal.
              </p>
            </div>
            <DashboardPreview />
          </div>
        </section>

        <section className="bg-white py-8">
          <div className="mx-auto max-w-[1280px] px-5">
            <div className="grid gap-3 rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4">
              {metrics.map(({ icon: Icon, value, label }) => (
                <div key={value} className="flex items-center gap-4 rounded-2xl p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-[#07172a]">{value}</p>
                    <p className="text-xs font-bold leading-5 text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="beneficios" className="bg-[#f5f7fb] py-16">
          <div className="mx-auto max-w-[1280px] px-5">
            <SectionHeader
              eyebrow="Plataforma completa"
              title="O sistema comercial que sua imobiliária usa todos os dias."
              text="Menos troca de abas, menos retrabalho e mais clareza para transformar atendimento em venda."
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-black text-[#07172a]">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto grid max-w-[1280px] gap-8 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Problema x solução</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[#07172a] md:text-4xl">Pare de operar no improviso. Venda com processo.</h2>
              <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
                A IMOBZY transforma uma rotina espalhada em uma operação comercial com prioridade, contexto e previsibilidade.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[20px] border border-rose-100 bg-rose-50/60 p-6">
                <p className="mb-5 text-sm font-black uppercase text-rose-600">Antes</p>
                {beforeItems.map((item) => (
                  <p key={item} className="mb-4 flex gap-3 text-sm font-bold leading-6 text-slate-700">
                    <XCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="rounded-[20px] border border-emerald-100 bg-emerald-50/80 p-6">
                <p className="mb-5 text-sm font-black uppercase text-emerald-700">Com IMOBZY</p>
                {afterItems.map((item) => (
                  <p key={item} className="mb-4 flex gap-3 text-sm font-bold leading-6 text-slate-700">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-[#f5f7fb] py-16">
          <div className="mx-auto max-w-[1280px] px-5">
            <SectionHeader
              eyebrow="Como funciona"
              title="Um fluxo simples para organizar a operação inteira."
            />
            <div className="mt-10 grid gap-4 lg:grid-cols-5">
              {steps.map(([number, title, text]) => (
                <div key={title} className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07172a] text-sm font-black text-white">{number}</div>
                  <h3 className="text-base font-black text-[#07172a]">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="integracoes" className="bg-white py-16">
          <div className="mx-auto max-w-[1280px] px-5">
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <SectionHeader
                eyebrow="Ecossistema conectado"
                title="Integre seus canais e automatize a jornada do lead."
              />
              <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
                {integrations.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="rounded-[20px] border border-slate-200 bg-[#f5f7fb] p-4 text-center">
                    <Icon className="mx-auto text-emerald-600" size={24} />
                    <p className="mt-3 text-sm font-black text-[#07172a]">{title}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="clientes" className="bg-[#f5f7fb] py-16">
          <div className="mx-auto max-w-[1280px] px-5">
            <SectionHeader
              eyebrow="Quem usa, aprova"
              title="Cases reais de times comerciais que precisavam de mais controle."
            />
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {testimonials.map((item) => (
                <div key={item.name} className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
                  <Quote size={30} className="text-emerald-600" />
                  <p className="mt-5 text-base font-semibold leading-7 text-slate-700">{item.quote}</p>
                  <div className="mt-6 flex items-center gap-4">
                    <img src={item.avatar} alt={item.name} className="h-12 w-12 rounded-full object-cover" />
                    <div>
                      <p className="font-black text-[#07172a]">{item.name}</p>
                      <p className="text-xs font-bold text-slate-500">{item.role}</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">{item.metric}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo-form" className="bg-white py-16">
          <div className="mx-auto max-w-[1280px] px-5">
            <div className="overflow-hidden rounded-[24px] bg-[#07172a] p-6 text-white shadow-2xl shadow-slate-900/20 md:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Próximo passo</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
                    Veja como a IMOBZY organizaria sua operação comercial.
                  </h2>
                  <p className="mt-4 text-base font-semibold leading-7 text-slate-300">
                    Demonstração personalizada, sem compromisso, com foco nos gargalos da sua imobiliária.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 text-sm font-black text-slate-200">
                    <span className="rounded-full bg-white/10 px-4 py-2">Sem cartão</span>
                    <span className="rounded-full bg-white/10 px-4 py-2">Diagnóstico rápido</span>
                    <span className="rounded-full bg-white/10 px-4 py-2">Plano de implantação</span>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="grid gap-3 rounded-[20px] bg-white p-4 text-[#07172a] shadow-xl md:grid-cols-2 md:p-5">
                  <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Nome completo" />
                  <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="E-mail profissional" />
                  <input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="WhatsApp" />
                  <input required value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Nome da imobiliária" />
                  <select value={formData.goal} onChange={(e) => setFormData({ ...formData, goal: e.target.value })} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:col-span-2">
                    <option value="">Principal objetivo</option>
                    <option>Organizar leads e atendimento</option>
                    <option>Aumentar vendas</option>
                    <option>Automatizar processos</option>
                    <option>Integrar WhatsApp e canais</option>
                  </select>
                  <button disabled={isSubmitting} className="flex h-14 min-h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700 disabled:opacity-60 md:col-span-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={22} /> : <>Agendar demonstração agora <ArrowRight size={18} /></>}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#07172a] px-5 py-10 text-white">
        <div className="mx-auto grid max-w-[1280px] gap-8 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <img src="/logo-imobzy-360.svg" alt="IMOBZY" className="h-11 w-auto rounded-xl bg-white p-1" />
            <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-slate-300">
              Plataforma SaaS para imobiliárias que precisam vender com organização, velocidade e inteligência comercial.
            </p>
          </div>
          {[
            ['Plataforma', 'CRM', 'Atendimento', 'Automação', 'IA'],
            ['Soluções', 'Vendas', 'Locação', 'Lançamentos', 'Rural'],
          ].map(([title, ...items]) => (
            <div key={title}>
              <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</h3>
              {items.map((item) => <p key={item} className="mb-3 text-sm font-semibold text-slate-300">{item}</p>)}
            </div>
          ))}
          <div>
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Contato</h3>
            <p className="mb-3 flex items-center gap-3 text-sm font-semibold text-slate-300"><Phone size={16} />(11) 4000-1234</p>
            <p className="mb-3 flex items-center gap-3 text-sm font-semibold text-slate-300"><Mail size={16} />contato@imobzy.com.br</p>
            <p className="flex items-center gap-3 text-sm font-semibold text-slate-300"><Building2 size={16} />São Paulo, SP</p>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-[1280px] flex-col gap-4 border-t border-white/10 pt-6 text-xs font-semibold text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} IMOBZY. Todos os direitos reservados.</p>
          <div className="flex flex-wrap gap-4 md:gap-8"><span>Privacidade</span><span>Termos</span><span>Status</span></div>
        </div>
      </footer>
    </div>
  );
};

export default SystemSalesPage;
