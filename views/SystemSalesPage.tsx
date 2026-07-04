import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardSignature,
  FileText,
  Globe2,
  Image,
  Loader2,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Workflow,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

const menuItems = [
  { label: 'Funcionalidades', target: 'funcionalidades' },
  { label: 'WhatsApp + IA', target: 'whatsapp-ia' },
  { label: 'Portais', target: 'portais' },
  { label: 'Planos', target: 'planos' },
];

const portalLogos = [
  { name: 'ZAP Imoveis', color: 'bg-orange-500', text: 'Z' },
  { name: 'VivaReal', color: 'bg-sky-500', text: 'VR' },
  { name: 'OLX', color: 'bg-violet-600', text: 'OLX' },
  { name: 'Imovelweb', color: 'bg-orange-600', text: 'IW' },
  { name: 'Chaves na Mao', color: 'bg-rose-500', text: 'CM' },
  { name: 'QuintoAndar', color: 'bg-indigo-600', text: '5A' },
  { name: 'Mercado Livre', color: 'bg-yellow-400', text: 'ML' },
];

const heroMetrics = [
  { value: '+2.400', label: 'corretores impactados' },
  { value: '3,2x', label: 'mais velocidade no lead' },
  { value: '5 min', label: 'para iniciar o fluxo' },
];

const chatMessages = [
  { side: 'right', text: 'Oi, vi o anuncio do apartamento na Praia da Costa.', time: '14:20' },
  { side: 'left', text: 'Perfeito. Esse apto tem 3 quartos, 110m2 e vista mar. Voce pensa em morar ou investir?', time: '14:21' },
  { side: 'right', text: 'Pra morar. Familia de 4 pessoas.', time: '14:22' },
  { side: 'left', text: 'Tenho 3 opcoes no perfil e posso agendar visita ainda hoje.', time: '14:23' },
];

const propertyCards = [
  {
    image: '/templates/urban/urban_apartment_center.png',
    city: 'Vila Velha - ES',
    title: 'Apto moderno - 110m2',
    price: 'R$ 720.000',
    meta: '3 quartos',
  },
  {
    image: '/templates/urban/urban_sea_view.png',
    city: 'Guarapari - ES',
    title: 'Casa de praia frente mar',
    price: 'R$ 2.4M',
    meta: '4 suites',
  },
  {
    image: '/templates/urban/urban_luxury_pool.png',
    city: 'Vitoria - ES',
    title: 'Cobertura duplex',
    price: 'R$ 1.85M',
    meta: '4 vagas',
  },
  {
    image: '/templates/urban/urban_exclusive_launch.png',
    city: 'BH - MG',
    title: 'Studio premium vista cidade',
    price: 'R$ 480k',
    meta: '1 quarto',
  },
];

const features = [
  {
    icon: MessageSquare,
    title: 'Agente IA no WhatsApp',
    text: 'Atende, qualifica com BANT, recomenda imovel e marca visita como um SDR que nao dorme.',
    badge: 'Carro-chefe',
  },
  {
    icon: Megaphone,
    title: 'Anuncios Meta em minutos',
    text: 'IA cria texto, publico, roteiro e campanha para Facebook e Instagram a partir do imovel.',
  },
  {
    icon: Globe2,
    title: 'Feed XML para portais',
    text: 'Publique estoque em ZAP, VivaReal, OLX, Imovelweb e outros canais sem recadastrar tudo.',
  },
  {
    icon: ClipboardSignature,
    title: 'Contrato digital',
    text: 'Venda, locacao, autorizacao, assinatura, validade juridica e historico do negocio.',
    badge: 'Em breve',
  },
  {
    icon: Target,
    title: 'Match IA lead x imovel',
    text: 'Cruza perfil, urgencia, regiao e faixa de preco para sugerir as melhores opcoes.',
  },
  {
    icon: Image,
    title: 'Banco de criativos com IA',
    text: 'Gere posts, stories, capas e materiais de campanha dentro do kit de marca.',
  },
  {
    icon: Globe2,
    title: 'Catalogo online de imoveis',
    text: 'Um mini-site sempre atualizado para bio, cartao de visita, WhatsApp e campanhas.',
    badge: 'Plano escala',
    special: true,
  },
];

const steps = [
  {
    n: '1',
    title: 'Conecte WhatsApp + estoque',
    text: 'Cadastre seus imoveis, canais e regras. A IA aprende seu jeito de atender.',
  },
  {
    n: '2',
    title: 'Lead chega pre-qualificado',
    text: 'Anuncio rodando, formulario preenchido, IA conversa e entrega score de prioridade.',
  },
  {
    n: '3',
    title: 'Voce aparece para fechar',
    text: 'Agende visita, gere proposta, emita contrato e acompanhe tudo pelo funil.',
  },
];

const markets = ['Litoral', 'Metropole', 'Interior', 'Rural', 'Serra', 'Nordeste', 'Sul', 'Cerrado'];

const plans = [
  {
    name: 'Essencial',
    tag: 'Corretor autonomo comecando',
    price: 'R$ 87,90',
    items: ['WhatsApp + IA de qualificacao', 'CRM imobiliario completo', 'Estoque de ate 50 imoveis', '3 campanhas Meta/mes', '1 usuario', 'Link publico por imovel'],
  },
  {
    name: 'Negocio',
    tag: 'Corretor estabelecido',
    price: 'R$ 147,90',
    highlight: true,
    items: ['Tudo do Essencial', 'Campanhas Meta ilimitadas', '5.000 mensagens do assistente/mes', 'Estoque de ate 300 imoveis', 'Publicador XML', 'Contratos digitais'],
  },
  {
    name: 'Escala',
    tag: 'Imobiliaria ou equipe',
    price: 'R$ 287,90',
    items: ['Tudo do Negocio', 'Ate 10 usuarios', 'Contratos ilimitados', 'Match automatico IA', 'Analytics de mercado', 'Catalogo online completo'],
  },
];

const oldWay = [
  'Lead perdido entre WhatsApp, planilha e corretor',
  'Campanha depende de agencia e aprovacoes lentas',
  'Imovel recadastrado manualmente em varios lugares',
  'Contrato, visita e follow-up sem rastreabilidade',
];

const newWay = [
  'Lead entra qualificado e com contexto no CRM',
  'IA cria campanha, copy, arte e proximo passo',
  'Estoque vira catalogo, landing page e publicacao',
  'Fechamento com documentos, contrato e historico',
];

const SystemSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [, setIsStandalone] = useState(false);
  const [billing, setBilling] = useState<'annual' | 'monthly'>('monthly');
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
    sessionStorage.setItem('imobfluow_demo_lead', JSON.stringify(formData));
    toast.success('Vamos qualificar sua operacao antes de liberar a agenda.');
    setTimeout(() => {
      const params = new URLSearchParams({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        goal: formData.goal,
      });
      navigate(
        `/consultoria/qualificacao?${params.toString()}`
      );
    }, 600);
  };

  const scrollToSection = (target: string) => {
    setIsMenuOpen(false);
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#f8f7f1] text-slate-950 selection:bg-emerald-100 selection:text-emerald-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#06130e]/96 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => scrollToSection('topo')} className="flex items-center gap-2 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d89d12] text-white">
              <Building2 size={20} />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Imob<span className="text-[#d89d12]">Flow</span>
            </span>
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.target)}
                className="text-sm font-bold text-white/78 transition-colors hover:text-[#f2b51d]"
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
              className="h-10 rounded-full bg-[#d89d12] px-5 text-sm font-bold text-white shadow-lg shadow-[#d89d12]/30 transition hover:bg-[#efb21a]"
            >
              Testar gratis 7 dias
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
          <div className="border-t border-white/10 bg-[#06130e] px-4 py-4 md:hidden">
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
                className="rounded-xl px-3 py-3 text-left text-sm font-bold text-[#f2b51d] hover:bg-white/10"
              >
                Entrar
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main id="topo">
        <section className="relative overflow-hidden bg-[#06130e] pt-16 text-white">
          <img
            src="/images/sales/hero-corretores.webp"
            alt="Corretores usando tecnologia imobiliaria"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.28]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#06130e] via-[#123a2c]/94 to-[#09162b]/96" />

          <div className="relative mx-auto grid min-h-[calc(92vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d89d12]/40 bg-[#d89d12]/12 px-4 py-2 text-xs font-bold text-[#f2b51d]">
                <Sparkles size={14} />
                CRM imobiliario com IA - Brasil - 2026
              </div>

              <h1 className="text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Seu proximo lead chega <span className="text-[#d89d12]">pre-qualificado</span> no WhatsApp.
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-white/78 sm:text-xl">
                A ImobFlow atende, qualifica e marca visita por voce. Publique seu imovel em portais, crie campanhas com IA e apareca apenas para fechar.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => scrollToSection('demo-form')}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#d89d12] px-8 text-base font-bold text-white shadow-2xl shadow-[#d89d12]/30 transition hover:bg-[#efb21a]"
                >
                  Testar gratis 7 dias <ArrowRight size={19} />
                </button>
                <button
                  onClick={() => scrollToSection('whatsapp-ia')}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 text-base font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <PlayCircle size={18} /> Ver a IA atendendo
                </button>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                {heroMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur">
                    <p className="text-2xl font-bold text-[#f2b51d]">{metric.value}</p>
                    <p className="mt-1 text-xs font-semibold text-white/62">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[620px] pb-14 pt-4">
              <div className="ml-auto w-[78%] overflow-hidden rounded-[1.6rem] border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="relative min-h-[520px] overflow-hidden rounded-[1.25rem]">
                  <img src="/templates/urban/urban_sea_view.png" alt="Imovel publicado" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute bottom-8 left-6 right-6">
                    <p className="text-sm font-bold text-white/78">Lead quente - Vila Velha</p>
                    <h2 className="mt-1 text-3xl font-bold">Apto vista mar</h2>
                    <p className="mt-2 text-sm font-bold text-white/84">110m2 - R$ 720.000</p>
                  </div>
                </div>
              </div>

              <div className="absolute left-0 top-24 w-[290px] overflow-hidden rounded-[1.75rem] border-[8px] border-[#101716] bg-[#f6f0e6] shadow-2xl shadow-black/35">
                <div className="flex items-center gap-3 bg-[#075c4d] px-4 py-3 text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d89d12] text-sm font-bold">A</span>
                  <div>
                    <p className="text-sm font-bold">ImobFlow IA</p>
                    <p className="text-[11px] font-semibold text-emerald-200">online - respondendo agora</p>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  {chatMessages.map((message) => (
                    <div
                      key={`${message.text}-${message.time}`}
                      className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs font-semibold leading-relaxed ${
                        message.side === 'right'
                          ? 'ml-auto bg-[#dcffc7] text-slate-900'
                          : 'mr-auto bg-white text-slate-900 shadow-sm'
                      }`}
                    >
                      {message.text}
                      <span className="mt-1 block text-right text-[10px] font-bold text-slate-400">{message.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-4 right-0 hidden w-44 space-y-2 sm:block">
                {portalLogos.slice(0, 4).map((portal) => (
                  <div key={portal.name} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-lg">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${portal.color} text-[10px] text-white`}>
                      {portal.text}
                    </span>
                    {portal.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="portais" className="border-b border-slate-100 bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-400">Seu imovel publicado automaticamente em</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {portalLogos.map((portal) => (
                <div key={portal.name} className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm">
                  <span className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1 text-[10px] font-bold text-white ${portal.color}`}>
                    {portal.text}
                  </span>
                  <span className="text-sm font-bold text-slate-950">{portal.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-7 text-xs font-semibold text-slate-500">Feed XML automatico: cadastre 1 vez, apareca em todos os canais conectados.</p>
          </div>
        </section>

        <section id="whatsapp-ia" className="bg-[#fbfaf6] py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:items-center">
            <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[2rem] border-[10px] border-[#101716] bg-[#f6f0e6] shadow-2xl shadow-slate-900/18">
              <div className="flex items-center gap-3 bg-[#075c4d] px-5 py-4 text-white">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d89d12] font-bold">A</span>
                <div>
                  <p className="font-bold">ImobFlow IA</p>
                  <p className="text-xs font-semibold text-emerald-200">online - respondendo agora</p>
                </div>
              </div>
              <div className="space-y-3 p-5">
                {chatMessages.map((message) => (
                  <div
                    key={`large-${message.text}`}
                    className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed ${
                      message.side === 'right' ? 'ml-auto bg-[#dcffc7]' : 'mr-auto bg-white shadow-sm'
                    }`}
                  >
                    {message.text}
                    <span className="mt-1 block text-right text-[10px] font-bold text-slate-400">{message.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ao vivo - IA conversando
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Sua IA atende enquanto voce dorme.
              </h2>
              <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-slate-600">
                O agente conversa no WhatsApp como um corretor humano: pergunta orcamento, entende urgencia, identifica perfil e ja marca a visita.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  'Atende em segundos, 24h por dia, 7 dias por semana',
                  'Qualifica com BANT: orcamento, urgencia, perfil e FGTS',
                  'Recomenda imoveis compativeis com o lead',
                  'Salva tudo no CRM e aciona o corretor certo',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
              <div>
                <span className="rounded-full border border-[#d89d12]/30 bg-[#d89d12]/10 px-4 py-2 text-xs font-bold text-[#b77f00]">
                  Seu estoque, brilhando
                </span>
                <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                  Seus imoveis em 7 portais, com 1 cadastro so.
                </h2>
              </div>
              <p className="text-lg font-medium leading-relaxed text-slate-600 lg:text-right">
                Cadastre na ImobFlow. O feed sincroniza automaticamente sem refazer fotos, descricao ou preco.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {propertyCards.map((property) => (
                <article key={property.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-48">
                    <img src={property.image} alt={property.title} className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-900">
                      Publicado - 7 portais
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <MapPin size={13} /> {property.city}
                    </p>
                    <h3 className="mt-2 text-base font-bold text-slate-950">{property.title}</h3>
                    <p className="mt-3 text-xs font-bold text-slate-500">{property.meta}</p>
                    <p className="mt-4 text-xl font-bold text-emerald-950">{property.price}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="bg-[#fbfaf6] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <span className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Stack completo</span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Tudo que um corretor precisa, em um so lugar.
              </h2>
              <p className="mt-4 text-lg font-medium leading-relaxed text-slate-600">
                Pare de pular entre WhatsApp, Excel, gerenciador de anuncios e portais. A ImobFlow une tudo.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className={`rounded-2xl border p-7 transition hover:-translate-y-1 hover:shadow-xl ${
                    feature.special
                      ? 'border-violet-200 bg-violet-50 shadow-violet-900/10'
                      : 'border-slate-200 bg-white shadow-slate-900/5'
                  }`}
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.special ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-800'}`}>
                      <feature.icon size={24} />
                    </span>
                    {feature.badge ? (
                      <span className="rounded-full border border-[#d89d12]/30 bg-[#d89d12]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#b77f00]">
                        {feature.badge}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="fluxo" className="bg-gradient-to-br from-[#123a2c] to-[#09162b] py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-14 max-w-4xl text-center">
              <span className="rounded-full border border-[#d89d12]/40 bg-[#d89d12]/12 px-4 py-2 text-xs font-bold text-[#f2b51d]">
                Setup em minutos
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
                Da captacao ao fechamento em 3 passos.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.n} className="relative">
                  <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-[#d89d12] text-2xl font-bold text-white shadow-xl shadow-[#d89d12]/25">
                    {step.n}
                  </span>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:items-center">
            <div className="relative">
              <img
                src="/images/sales/hero-corretores.webp"
                alt="Corretor analisando performance"
                className="h-[440px] w-full rounded-3xl object-cover shadow-2xl shadow-slate-900/12"
              />
              <div className="absolute right-4 top-12 rounded-2xl bg-white p-5 shadow-xl">
                <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <TrendingUp size={14} className="text-emerald-600" /> Performance do mes
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">R$ 1,8M</p>
                <p className="text-xs font-bold text-slate-500">em VGV fechado</p>
              </div>
            </div>
            <div>
              <span className="rounded-full bg-[#d89d12]/12 px-4 py-2 text-xs font-bold text-[#b77f00]">Feito pra voce</span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Para corretor que quer vender mais sem trabalhar mais.
              </h2>
              <p className="mt-5 text-lg font-medium leading-relaxed text-slate-600">
                A ImobFlow vira a camada operacional entre marketing, atendimento e fechamento. Voce controla o processo e entra nas conversas com melhor chance de conversao.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {newWay.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={18} />
                    <p className="text-sm font-bold text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#fbfaf6] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
            <span className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Inteligencia de mercado</span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Adaptado para o seu mercado.
            </h2>
            <p className="mt-4 text-lg font-medium text-slate-600">
              A IA fala a lingua do seu cliente: do litoral capixaba ao interior paulista.
            </p>
            <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-3">
              {markets.map((market) => (
                <span key={market} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm">
                  {market}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <span className="rounded-full bg-[#d89d12]/12 px-4 py-2 text-xs font-bold text-[#b77f00]">Planos transparentes</span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Comece gratis. Escale quando quiser.
              </h2>
              <div className="mx-auto mt-7 inline-flex rounded-full bg-slate-100 p-1">
                <button
                  onClick={() => setBilling('annual')}
                  className={`h-9 rounded-full px-6 text-sm font-bold ${billing === 'annual' ? 'bg-emerald-950 text-white' : 'text-slate-600'}`}
                >
                  Anual
                </button>
                <button
                  onClick={() => setBilling('monthly')}
                  className={`h-9 rounded-full px-6 text-sm font-bold ${billing === 'monthly' ? 'bg-emerald-950 text-white' : 'text-slate-600'}`}
                >
                  Mensal
                </button>
              </div>
            </div>

            <div className="mx-auto mb-8 max-w-4xl rounded-3xl bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-4 text-center text-sm font-bold text-white shadow-xl shadow-orange-500/20">
              Preco promocional de lancamento: pode aumentar a qualquer momento
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative rounded-3xl border p-7 shadow-sm ${
                    plan.highlight
                      ? 'border-[#d89d12] bg-[#fffcf4] text-slate-950 shadow-2xl shadow-[#d89d12]/10'
                      : 'border-slate-200 bg-white text-slate-950'
                  }`}
                >
                  {plan.highlight ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#d89d12] px-5 py-1 text-xs font-bold text-white">
                      Mais popular
                    </span>
                  ) : null}
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">{plan.tag}</p>
                  <div className="mt-7 flex items-end gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="pb-1 text-sm font-bold text-slate-500">/mes</span>
                  </div>
                  <p className="mt-3 text-xs font-bold text-orange-600">Garanta agora: preco de fundador</p>
                  <button
                    onClick={() => scrollToSection('demo-form')}
                    className={`mt-6 h-12 w-full rounded-full text-sm font-bold transition ${
                      plan.highlight
                        ? 'bg-[#d89d12] text-white hover:bg-[#efb21a]'
                        : 'bg-emerald-950 text-white hover:bg-emerald-900'
                    }`}
                  >
                    Testar gratis 7 dias
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

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm font-bold text-slate-600">
              {['7 dias gratis para testar', 'Cancela quando quiser', 'Comeca em 5 minutos'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700" /> {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="rounded-full bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">Diagnostico</span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                O que melhora na Imobzy depois dessa virada.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
                <p className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-rose-700">Hoje, sem fluxo unico</p>
                <div className="space-y-4">
                  {oldWay.map((item) => (
                    <div key={item} className="flex gap-3">
                      <XCircle className="mt-0.5 shrink-0 text-rose-500" size={18} />
                      <p className="text-sm font-bold text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">Com ImobFlow</p>
                <div className="space-y-4">
                  {newWay.map((item) => (
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

        <section id="demo-form" className="bg-gradient-to-br from-[#123a2c] to-[#09162b] py-20 text-white sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <h2 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
                Pronto para nunca mais <span className="text-[#d89d12]">perder um lead?</span>
              </h2>
              <p className="mt-5 text-lg font-medium leading-relaxed text-white/75">
                Setup em 5 minutos. 7 dias gratis para testar. So cobramos se voce gostar.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, text: 'Diagnostico consultivo' },
                  { icon: Workflow, text: 'Fluxo comercial desenhado' },
                  { icon: CalendarCheck, text: 'Agenda de implantacao' },
                  { icon: FileText, text: 'Prioridades tecnicas claras' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/8 p-4 text-sm font-bold text-white/82">
                    <item.icon className="text-[#f2b51d]" size={18} />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-white/14 bg-white p-5 text-slate-950 shadow-2xl sm:p-8">
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
                placeholder="Qual fluxo voce quer ativar primeiro? Ex: WhatsApp IA, portais, campanhas, contratos..."
              />
              <button
                disabled={isSubmitting}
                className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#d89d12] px-8 text-base font-bold text-white transition hover:bg-[#efb21a] disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Quero executar esse plano'}
                {!isSubmitting ? <ArrowRight size={18} /> : null}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#09162b] py-14 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d89d12] text-white">
                <Building2 size={18} />
              </span>
              <span className="font-bold">ImobFlow</span>
            </div>
            <p className="mt-4 max-w-xs text-sm font-medium leading-relaxed text-white/62">
              Captacao, atendimento e fechamento imobiliario com IA.
            </p>
          </div>
          <div>
            <p className="font-bold">Produto</p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-white/62">
              <button onClick={() => scrollToSection('funcionalidades')} className="block hover:text-white">Funcionalidades</button>
              <button onClick={() => scrollToSection('whatsapp-ia')} className="block hover:text-white">WhatsApp + IA</button>
              <button onClick={() => scrollToSection('portais')} className="block hover:text-white">Portais</button>
              <button onClick={() => scrollToSection('planos')} className="block hover:text-white">Planos</button>
            </div>
          </div>
          <div>
            <p className="font-bold">Empresa</p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-white/62">
              <button onClick={() => scrollToSection('demo-form')} className="block hover:text-white">Contato</button>
              <span className="block opacity-50">Blog em breve</span>
            </div>
          </div>
          <div>
            <p className="font-bold">Legal</p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-white/62">
              <span className="block">Politica de Privacidade</span>
              <span className="block">Termos de Uso</span>
              <span className="block">Contrato</span>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-4 pt-8 text-center text-xs font-semibold text-white/45 sm:px-6">
          &copy; {new Date().getFullYear()} Imobzy. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default SystemSalesPage;
