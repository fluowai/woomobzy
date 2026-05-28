import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  Heart,
  Home,
  Instagram,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plug,
  Quote,
  Send,
  ShieldCheck,
  ShoppingCart,
  Star,
  Target,
  Workflow,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../services/leads';

const menuItems = ['Plataforma', 'Solucoes', 'Recursos', 'Clientes', 'Precos', 'Conteudos'];

const heroStats = [
  { label: 'Leads', value: '1.248', delta: '+18.2%' },
  { label: 'Oportunidades', value: '312', delta: '+22.1%' },
  { label: 'Negociacoes', value: '78', delta: '+8.4%' },
  { label: 'Vendas', value: 'R$ 1,48M', delta: '+30.4%' },
];

const kanbanColumns = [
  { title: 'Novos Leads', color: 'bg-amber-400', cards: ['Joao Mendes', 'Mariana Telles', 'Carlos Andrade'] },
  { title: 'Qualificacao', color: 'bg-orange-400', cards: ['Beatriz Lima', 'Rapha Nunes'] },
  { title: 'Proposta', color: 'bg-sky-400', cards: ['Juliana Costa', 'Lucas Ferreira'] },
  { title: 'Negociacao', color: 'bg-emerald-400', cards: ['Ana Paula', 'Felipe Santos'] },
  { title: 'Fechado', color: 'bg-green-500', cards: ['Roberta Alves'] },
];

const impactStats = [
  { icon: Zap, value: '+250%', label: 'aumento medio na produtividade' },
  { icon: Clock, value: '-60%', label: 'no tempo de resposta aos leads' },
  { icon: Workflow, value: '+1.8M', label: 'de leads processados por mes' },
  { icon: ShieldCheck, value: '+20 mil', label: 'imoveis gerenciados na plataforma' },
  { icon: Heart, value: '+98%', label: 'de satisfacao dos clientes' },
  { icon: MessageSquare, value: '99,9%', label: 'de uptime e seguranca' },
];

const platformCards = [
  { icon: LayoutDashboard, title: 'CRM Comercial', text: 'Organize leads, oportunidades e negociacoes em um funil inteligente e visual.' },
  { icon: MessageSquare, title: 'Central de Atendimento', text: 'Omnichannel integrado com WhatsApp, Instagram, e-mail, site e telefone.' },
  { icon: Home, title: 'Gestao de Imoveis', text: 'Cadastro completo, documentos, multimidia, portais e controle de disponibilidade.' },
  { icon: ShoppingCart, title: 'Funil de Leads', text: 'Acompanhe cada etapa do funil e aumente sua taxa de conversao com processos claros.' },
  { icon: Zap, title: 'Automacao', text: 'Automatize tarefas, disparos, follow-ups e rotinas para ganhar tempo e vender mais.' },
  { icon: Bot, title: 'IA para Qualificacao', text: 'Inteligencia artificial que qualifica leads, identifica intencao e sugere proximos passos.' },
  { icon: CalendarCheck, title: 'Agenda e Visitas', text: 'Agendamento online, roteiros, check-in e acompanhamento de visitas.' },
  { icon: Target, title: 'Gestao 360 da Operacao', text: 'Relatorios, dashboards e KPIs em tempo real para decisoes mais estrategicas.' },
];

const flowSteps = [
  ['1. Captar', 'Atraia leads de todos os canais e centralize em um so lugar.'],
  ['2. Atender', 'Responda rapido e qualifique com IA e automacoes.'],
  ['3. Distribuir', 'Direcione para o corretor certo, no momento certo.'],
  ['4. Negociar', 'Acompanhe o funil e conduza negociacoes com inteligencia.'],
  ['5. Fechar', 'Formalize, assine e registre tudo com seguranca.'],
  ['6. Acompanhar', 'Pos-venda, recompra e fidelizacao para resultados recorrentes.'],
];

const segments = [
  { icon: Building2, title: 'Vendas', text: 'Mais organizacao e conversao' },
  { icon: Home, title: 'Locacao', text: 'Agilidade e controle de ponta a ponta' },
  { icon: LayoutGrid, title: 'Lancamentos', text: 'Gestao completa de empreendimentos' },
  { icon: Globe, title: 'Loteamentos', text: 'Controle de lotes, vendas e contratos' },
  { icon: Star, title: 'Alto Padrao', text: 'Atendimento premium e personalizado' },
  { icon: Target, title: 'Imobiliaria Rural', text: 'Especializada para o agronegocio' },
];

const integrations = [
  { icon: MessageSquare, title: 'WhatsApp', text: 'Business API' },
  { icon: Instagram, title: 'Instagram', text: 'Direct' },
  { icon: Globe, title: 'Site', text: 'Formularios' },
  { icon: Mail, title: 'E-mail', text: 'Marketing' },
  { icon: Building2, title: 'Portais', text: 'Imobiliarios' },
  { icon: Zap, title: 'Zapier', text: 'Automacao' },
  { icon: Send, title: 'RD Station', text: 'Marketing' },
  { icon: Plug, title: '+ APIs', text: 'Integracoes' },
];

const testimonials = [
  ['A IMOBZY mudou nossa operacao. Centralizamos tudo e aumentamos nossas vendas em 35%.', 'Carlos Machado', 'Diretor Comercial'],
  ['O atendimento ficou muito mais agil e nao perdemos mais nenhuma oportunidade.', 'Juliana Ribeiro', 'Gerente de Operacoes'],
  ['Os relatorios e dashboards nos dao clareza total para tomar decisoes todos os dias.', 'Rafael Nogueira', 'CEO'],
];

const SystemSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    goal: '',
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
        source: 'Pagina de Vendas - Demonstracao',
        notes: `Empresa: ${formData.company} | Objetivo: ${formData.goal || 'Nao informado'} | Interesse: Demonstracao Completa`,
      } as any);

      toast.success('Dados recebidos! Redirecionando para agendamento...');

      setTimeout(() => {
        navigate(`/consultoria/qualificacao?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&company=${encodeURIComponent(formData.company)}`);
      }, 1200);
    } catch (error) {
      toast.error('Erro ao enviar solicitacao. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('demo-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-white text-[#0c1f3f] selection:bg-emerald-100 selection:text-emerald-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1360px] items-center justify-between px-5 md:px-8">
          <img src="/logo-imobzy-360.svg" alt="IMOBZY" className="h-10 w-auto max-w-[135px] sm:h-12 sm:max-w-none" />
          <nav className="hidden items-center gap-8 lg:flex">
            {menuItems.map((item) => (
              <button key={item} className="flex items-center gap-1 text-sm font-bold text-slate-700 transition hover:text-emerald-700">
                {item}
                {['Plataforma', 'Solucoes', 'Recursos', 'Conteudos'].includes(item) && <ChevronDown size={14} />}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="hidden h-11 rounded-md border border-slate-300 px-6 text-sm font-extrabold text-slate-800 transition hover:border-emerald-500 hover:text-emerald-700 sm:block">
              Entrar
            </button>
            <button onClick={scrollToForm} className="h-10 whitespace-nowrap rounded-md bg-emerald-600 px-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700 sm:h-11 sm:px-7 sm:text-sm">
              <span className="hidden sm:inline">Agendar demonstracao</span>
              <span className="sm:hidden">Agendar demo</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid grid-cols-1 max-w-[1360px] gap-10 px-5 pb-10 pt-12 md:px-8 lg:grid-cols-[0.95fr_1.25fr] lg:items-start lg:pt-16 2xl:grid-cols-[1.05fr_1.2fr_.72fr]">
          <div className="pt-3">
            <h1 className="max-w-xl text-4xl font-black leading-[0.98] tracking-tight text-[#0a1c3b] sm:text-5xl md:text-6xl">
              A plataforma inteligente que organiza, acelera <span className="text-emerald-600">e escala</span> sua imobiliaria.
            </h1>
            <p className="mt-7 max-w-lg text-lg font-semibold leading-8 text-slate-700">
              CRM, imoveis, atendimento, automacoes e IA em um so lugar para aumentar vendas, reduzir retrabalho e entregar uma experiencia excepcional.
            </p>
            <div className="mt-7 space-y-4">
              {['Mais organizacao e previsibilidade', 'Atendimento rapido e sem perder oportunidades', 'Decisoes baseadas em dados e IA'].map((item) => (
                <div key={item} className="flex items-center gap-3 text-base font-bold text-slate-700">
                  <CheckCircle2 size={19} className="text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <button onClick={scrollToForm} className="inline-flex h-14 items-center justify-center gap-3 rounded-md bg-emerald-600 px-7 text-sm font-black text-white shadow-xl shadow-emerald-900/15 transition hover:bg-emerald-700">
                Agendar demonstracao <ArrowRight size={18} />
              </button>
              <button className="inline-flex h-14 items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-7 text-sm font-black text-slate-900 transition hover:border-emerald-500 hover:text-emerald-700">
                Ver como funciona <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/80 sm:p-4">
            <div className="grid overflow-hidden rounded-lg border border-slate-100 bg-slate-50 sm:min-h-[545px] sm:grid-cols-[132px_1fr]">
              <aside className="hidden bg-white p-4 sm:block">
                <img src="/logo-imobzy-360.svg" alt="IMOBZY" className="mb-8 h-9 w-auto" />
                {['Visao geral', 'Leads', 'Atendimentos', 'Imoveis', 'Oportunidades', 'Atividades', 'Agenda', 'Relatorios', 'Configuracoes'].map((item, index) => (
                  <div key={item} className={`mb-2 flex items-center gap-2 rounded-md px-2 py-2 text-[11px] font-bold ${index === 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
                    <span className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    {item}
                  </div>
                ))}
              </aside>
              <div className="p-4 sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Visao geral</h2>
                    <button className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-500">Este mes</button>
                  </div>
                  <button className="rounded-md bg-emerald-600 px-4 py-2 text-[11px] font-black text-white">+ Novo lead</button>
                </div>

                <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-500">{stat.label}</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{stat.value}</p>
                      <p className="mt-1 text-[11px] font-black text-emerald-600">{stat.delta}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <h3 className="mb-4 text-sm font-black text-slate-900">Funil de oportunidades</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                    {kanbanColumns.map((column) => (
                      <div key={column.title}>
                        <div className="mb-3 flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${column.color}`} />
                          <span className="text-[10px] font-black text-slate-600">{column.title}</span>
                        </div>
                        <div className="space-y-2">
                          {column.cards.map((card) => (
                            <div key={card} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                              <p className="text-[11px] font-black text-slate-700">{card}</p>
                              <p className="mt-1 text-[10px] font-semibold text-slate-400">R$ 680.000</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <h3 className="mb-4 text-sm font-black">Atendimentos recentes</h3>
                    {['Novo lead de Juliana Costa', 'Mensagem de Beatriz Lima', 'Novo formulario recebido'].map((item) => (
                      <div key={item} className="flex items-center gap-3 border-t border-slate-100 py-3 text-[11px] font-bold text-slate-600">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-black">Desempenho de vendas</h3>
                    <p className="mt-2 text-2xl font-black">R$ 1,48M</p>
                    <svg viewBox="0 0 260 90" className="mt-3 h-24 w-full">
                      <polyline points="0,70 30,55 60,62 90,36 120,48 150,28 180,43 210,18 240,35 260,8" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside id="demo-form" className="rounded-2xl bg-white p-5 shadow-2xl shadow-slate-300/70 ring-1 ring-slate-200 sm:p-8 lg:col-span-2 2xl:col-span-1">
            <h2 className="text-3xl font-black leading-tight text-[#0a1c3b]">
              Agende uma <span className="text-emerald-600">demonstracao personalizada</span>
            </h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">Veja na pratica como a IMOBZY pode transformar sua operacao comercial.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Ex.: Joao da Silva" />
              <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="seu@imobiliaria.com.br" />
              <input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="(00) 00000-0000" />
              <input required value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Nome da sua imobiliaria" />
              <select value={formData.goal} onChange={(e) => setFormData({ ...formData, goal: e.target.value })} className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                <option value="">Qual seu principal objetivo?</option>
                <option>Organizar leads e atendimento</option>
                <option>Aumentar vendas</option>
                <option>Automatizar processos</option>
                <option>Integrar WhatsApp e canais</option>
              </select>
              <button disabled={isSubmitting} className="flex h-14 w-full items-center justify-center gap-3 rounded-md bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700 disabled:opacity-60">
                {isSubmitting ? <Loader2 className="animate-spin" size={22} /> : <>Quero agendar minha demo <ChevronRight size={18} /></>}
              </button>
            </form>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-black text-slate-600">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => <img key={i} src={`https://i.pravatar.cc/80?img=${i + 10}`} alt="" className="h-8 w-8 rounded-full border-2 border-white" />)}
              </div>
              +350 imobiliarias ja confiam na IMOBZY
            </div>
          </aside>
        </section>

        <section className="mx-auto max-w-[1360px] px-5 py-6 md:px-8">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
            {impactStats.map(({ icon: Icon, value, label }) => (
              <div key={value} className="flex items-center gap-4 border-slate-100 p-3 lg:border-r last:border-r-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"><Icon size={22} /></div>
                <div><p className="text-2xl font-black text-[#0a1c3b]">{value}</p><p className="text-xs font-semibold leading-4 text-slate-500">{label}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1360px] px-5 py-10 text-center md:px-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Plataforma completa</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight md:text-4xl">Tudo o que sua imobiliaria precisa para vender mais e melhor</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {platformCards.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Icon size={24} /></div>
                <h3 className="text-base font-black text-[#0a1c3b]">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1360px] px-5 py-4 md:px-8">
          <div className="grid gap-6 rounded-2xl bg-slate-50 p-7 ring-1 ring-slate-200 lg:grid-cols-[.8fr_1.7fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Menos problemas. Mais resultados.</p>
              <h2 className="mt-3 text-3xl font-black leading-tight">Nos entendemos os desafios da sua operacao</h2>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">A IMOBZY foi criada para resolver os principais gargalos que travam o crescimento da sua imobiliaria.</p>
              <button className="mt-6 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800">Ver todas as solucoes</button>
            </div>
            <div className="grid gap-5 rounded-xl bg-white p-6 shadow-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div>
                <p className="mb-4 text-sm font-black uppercase text-slate-500">Sem IMOBZY</p>
                {['Leads perdidos e sem resposta', 'Processos manuais e repetitivos', 'Informacoes espalhadas', 'Falta de controle e previsibilidade', 'Decisoes no achismo', 'Baixa produtividade da equipe'].map((item) => (
                  <p key={item} className="mb-3 flex items-center gap-3 text-sm font-bold text-slate-600"><XCircle size={17} className="text-rose-500" />{item}</p>
                ))}
              </div>
              <div className="hidden h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-200 md:flex">
                <img src="/logo-imobzy.png" alt="IMOBZY" className="h-14 w-14 object-contain" />
              </div>
              <div>
                <p className="mb-4 text-sm font-black uppercase text-emerald-600">Com IMOBZY</p>
                {['Leads atendidos na hora certa', 'Processos automatizados e inteligentes', 'Dados centralizados e organizados', 'Visao completa e previsivel da operacao', 'Decisoes baseadas em dados e IA', 'Equipe mais produtiva e focada em vender'].map((item) => (
                  <p key={item} className="mb-3 flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 size={17} className="text-emerald-600" />{item}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1360px] px-5 py-12 text-center md:px-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Fluxo de sucesso</p>
          <h2 className="mt-3 text-3xl font-black">Como a Imobzy organiza sua operacao</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {flowSteps.map(([title, text], index) => (
              <div key={title} className="relative">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"><Check size={22} /></div>
                {index < flowSteps.length - 1 && <div className="absolute left-[58%] top-6 hidden h-px w-[84%] border-t border-dashed border-emerald-300 lg:block" />}
                <h3 className="mt-5 text-sm font-black">{title}</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1360px] px-5 py-4 md:px-8">
          <div className="grid rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-3 lg:grid-cols-6">
            {segments.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-4 border-slate-100 p-6 md:border-r">
                <Icon size={30} className="text-slate-500" />
                <div><h3 className="font-black">{title}</h3><p className="text-sm font-semibold leading-5 text-slate-500">{text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1360px] px-5 py-12 text-center md:px-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Conectada aos seus canais</p>
          <h2 className="mt-3 text-3xl font-black">Integre, automatize e potencialize resultados</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            {integrations.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="mx-auto text-emerald-600" size={25} />
                <p className="mt-3 text-sm font-black">{title}</p>
                <p className="text-xs font-semibold text-slate-500">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1fr_1fr_.8fr]">
            {testimonials.map(([text, name, role]) => (
              <div key={name} className="border-slate-100 text-left lg:border-r lg:pr-6">
                <Quote size={32} className="mb-4 text-emerald-600" />
                <p className="text-sm font-semibold leading-6 text-slate-600">{text}</p>
                <p className="mt-5 font-black">{name}</p>
                <p className="text-xs font-semibold text-slate-500">{role}</p>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-3xl font-black">4,9/5</p>
              <div className="mt-2 flex text-emerald-600">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={18} fill="currentColor" />)}</div>
              <p className="mt-3 text-sm font-bold text-slate-500">+350 imobiliarias recomendam a IMOBZY</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1360px] px-5 pt-4 md:px-8">
          <div className="grid gap-8 rounded-t-2xl bg-[#061a35] p-10 text-white md:grid-cols-[1fr_1.25fr] md:p-14">
            <div>
              <h2 className="text-4xl font-black leading-tight">Pronto para <span className="text-emerald-400">transformar</span> a sua imobiliaria?</h2>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-slate-300">Agende uma demonstracao gratuita e descubra como a IMOBZY pode levar sua operacao a outro nivel.</p>
            </div>
            <div className="flex flex-col justify-center gap-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {['Demonstracao 100% personalizada', 'Sem compromisso e sem cartao', 'Resultados reais desde o inicio'].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-black text-slate-200"><CheckCircle2 size={22} className="text-emerald-400" />{item}</div>
                ))}
              </div>
              <button onClick={scrollToForm} className="mx-auto flex h-14 w-full max-w-md items-center justify-center gap-3 rounded-md bg-emerald-500 text-sm font-black text-white shadow-xl shadow-emerald-950/30 transition hover:bg-emerald-400">
                Agendar demonstracao agora <ChevronRight size={18} />
              </button>
              <p className="text-center text-sm font-semibold text-slate-300">Ou fale com nosso time: (11) 4000-1234</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#061a35] px-5 py-10 text-white md:px-8">
        <div className="mx-auto grid max-w-[1360px] gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
          <div>
            <img src="/logo-imobzy-360.svg" alt="IMOBZY" className="h-12 w-auto rounded-lg bg-white" />
            <p className="mt-4 max-w-xs text-sm font-semibold leading-6 text-slate-300">A plataforma inteligente que organiza, acelera e escala sua imobiliaria.</p>
          </div>
          {[
            ['Plataforma', 'Recursos', 'Integracoes', 'Seguranca', 'Precos'],
            ['Solucoes', 'Vendas', 'Locacao', 'Lancamentos', 'Imobiliaria Rural'],
            ['Conteudos', 'Blog', 'Materiais', 'Webinars', 'Cases'],
          ].map(([title, ...items]) => (
            <div key={title}>
              <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</h3>
              {items.map((item) => <p key={item} className="mb-3 text-sm font-semibold text-slate-300">{item}</p>)}
            </div>
          ))}
          <div>
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Fale com a IMOBZY</h3>
            <p className="mb-3 flex items-center gap-3 text-sm font-semibold text-slate-300"><Phone size={16} />(11) 4000-1234</p>
            <p className="mb-3 flex items-center gap-3 text-sm font-semibold text-slate-300"><Mail size={16} />contato@imobzy.com.br</p>
            <p className="flex items-center gap-3 text-sm font-semibold text-slate-300"><Building2 size={16} />Sao Paulo, SP - Brasil</p>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-[1360px] flex-col gap-4 border-t border-white/10 pt-6 text-xs font-semibold text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} IMOBZY. Todos os direitos reservados.</p>
          <div className="flex flex-wrap gap-4 md:gap-8"><span>Politica de Privacidade</span><span>Termos de Uso</span><span>DPA</span><span>Status do Sistema</span></div>
        </div>
      </footer>
    </div>
  );
};

export default SystemSalesPage;
