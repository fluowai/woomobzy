import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Menu,
  MessageSquare,
  Users,
  X,
} from 'lucide-react';

const features = [
  [
    'Leads',
    'Capte, organize e acompanhe seus contatos em um funil claro e eficiente.',
    Users,
  ],
  [
    'Imóveis urbanos e rurais',
    'Gerencie seu portfólio completo com informações essenciais.',
    Building2,
  ],
  [
    'Atendimento',
    'Centralize o contato com clientes e mantenha o histórico das negociações.',
    MessageSquare,
  ],
  [
    'Contratos',
    'Organize documentos, prazos e etapas contratuais com segurança.',
    FileText,
  ],
  [
    'Agenda',
    'Agende visitas, reuniões e tarefas sem perder compromissos.',
    CalendarDays,
  ],
  [
    'Relatórios',
    'Acompanhe o desempenho da operação com indicadores em tempo real.',
    BarChart3,
  ],
] as const;
const cards = [
  [
    'Urbano',
    'Casa em condomínio',
    'São Paulo – SP',
    'R$ 1.250.000',
    '/templates/urban/urban_ready_move.png',
  ],
  [
    'Rural',
    'Fazenda produtiva',
    'Itapetininga – SP',
    'R$ 8.500.000',
    '/templates/urban/urban_land_sale.png',
  ],
  [
    'Urbano',
    'Apartamento',
    'Campinas – SP',
    'R$ 620.000',
    '/templates/urban/urban_apartment_center.png',
  ],
] as const;

const Brand = ({ light = false }: { light?: boolean }) => (
  <div
    className={`flex items-center gap-2.5 ${light ? 'text-white' : 'text-[#082f38]'}`}
  >
    <span className="relative flex h-10 w-10 items-center justify-center text-2xl font-black italic">
      <span className="absolute inset-0 rounded-[14px] border-[5px] border-[#ff684d] rotate-[-35deg]" />
      <span className="absolute inset-[4px] rounded-[10px] border-[5px] border-[#0b5962] rotate-[35deg]" />
      <span className="relative z-10 text-[#ff684d]">∞</span>
    </span>
    <span>
      <strong className="block text-xl font-black leading-none tracking-tight">
        WooNexo
      </strong>
      <small className="block text-[10px] font-bold leading-tight">
        por Wootech
      </small>
    </span>
  </div>
);

const SystemSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
  });
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const go = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    sessionStorage.setItem('woonexo_demo_lead', JSON.stringify(form));
    toast.success('Vamos preparar sua demonstração.');
    setTimeout(
      () =>
        navigate(
          `/consultoria/qualificacao?${new URLSearchParams(form).toString()}`
        ),
      500
    );
  };
  return (
    <div className="min-h-screen bg-[#fbfcfb] text-[#082f38] selection:bg-[#ff684d]/20">
      <header className="sticky top-0 z-40 border-b border-[#082f38]/8 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 lg:px-8">
          <a href="#inicio" aria-label="WooNexo início">
            <Brand />
          </a>
          <nav className="hidden items-center gap-9 md:flex">
            <button
              onClick={() => go('recursos')}
              className="inline-flex items-center gap-1 text-sm font-bold"
            >
              Plataforma <ChevronDown size={15} />
            </button>
            <button
              onClick={() => go('solucoes')}
              className="inline-flex items-center gap-1 text-sm font-bold"
            >
              Soluções <ChevronDown size={15} />
            </button>
          </nav>
          <div className="hidden items-center gap-5 md:flex">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-black text-[#08616a]"
            >
              Entrar no painel
            </button>
            <button
              onClick={() => go('demo')}
              className="rounded-xl bg-[#ff684d] px-5 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(255,104,77,.22)] hover:bg-[#f2563d]"
            >
              Agendar demonstração
            </button>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#082f38]/10 md:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-[#082f38]/10 bg-white p-5 md:hidden">
            <button
              onClick={() => go('recursos')}
              className="block w-full py-3 text-left font-bold"
            >
              Plataforma
            </button>
            <button
              onClick={() => go('solucoes')}
              className="block w-full py-3 text-left font-bold"
            >
              Soluções
            </button>
            <button
              onClick={() => navigate('/login')}
              className="block w-full py-3 text-left font-bold"
            >
              Entrar no painel
            </button>
            <button
              onClick={() => go('demo')}
              className="mt-2 w-full rounded-xl bg-[#ff684d] py-3 font-black text-white"
            >
              Agendar demonstração
            </button>
          </div>
        )}
      </header>
      <main id="inicio">
        <section className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-14 pt-12 lg:grid-cols-[.86fr_1.14fr] lg:px-8 lg:pb-20 lg:pt-16">
          <div>
            <p className="mb-5 text-sm font-black uppercase tracking-[.18em] text-[#ff684d]">
              Gestão imobiliária sem atrito
            </p>
            <h1 className="max-w-[600px] text-5xl font-black leading-[.98] tracking-[-.045em] sm:text-6xl">
              Conecte imóveis, pessoas e{' '}
              <span className="text-[#ff684d]">oportunidades.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-lg font-medium leading-relaxed text-[#31515a]">
              Uma central para acompanhar leads, organizar imóveis e conectar
              sua equipe.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => go('demo')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff684d] px-6 py-3.5 font-black text-white shadow-[0_10px_22px_rgba(255,104,77,.2)]"
              >
                Agendar demonstração <ArrowRight size={18} />
              </button>
              <button
                onClick={() => go('recursos')}
                className="rounded-xl border-2 border-[#0b5962] px-6 py-3 font-black text-[#0b5962]"
              >
                Explorar a plataforma
              </button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] bg-[#075861] p-3 shadow-[0_24px_55px_rgba(7,88,97,.2)]">
            <div className="grid gap-3 rounded-[20px] bg-white p-3 sm:grid-cols-[150px_1fr]">
              <aside className="hidden rounded-2xl bg-[#075861] p-4 text-white sm:block">
                <Brand light />
                <div className="mt-7 space-y-2 text-xs font-bold">
                  <p className="rounded-lg bg-[#0b747d] px-3 py-2">
                    ⌂ &nbsp;Início
                  </p>
                  <p>♧ &nbsp;Leads</p>
                  <p>⌂ &nbsp;Imóveis</p>
                  <p>♢ &nbsp;Negociações</p>
                  <p>□ &nbsp;Agenda</p>
                  <p>♙ &nbsp;Equipe</p>
                  <p>▥ &nbsp;Relatórios</p>
                </div>
              </aside>
              <div className="min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-black">Painel da operação</p>
                    <p className="text-xs font-medium text-slate-500">
                      Visão geral do negócio
                    </p>
                  </div>
                  <span className="rounded-lg border px-2 py-1 text-[10px] font-bold">
                    Últimos 30 dias
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['Leads', '28'],
                    ['Imóveis', '132'],
                    ['Negociações', '12'],
                    ['Visitas', '7'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-[#edf8f6] p-2">
                      <small className="text-[9px] font-bold">{label}</small>
                      <strong className="block text-xl">{value}</strong>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-sm font-black">Imóveis em destaque</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {cards.map(([label, title, location, price, image]) => (
                    <div
                      key={title}
                      className="overflow-hidden rounded-xl border border-slate-200"
                    >
                      <img
                        src={image}
                        alt=""
                        className="h-20 w-full object-cover"
                      />
                      <div className="p-2">
                        <span className="rounded-full bg-[#e8f5f2] px-1.5 py-0.5 text-[8px] font-black text-[#075861]">
                          {label}
                        </span>
                        <p className="mt-1 truncate text-[10px] font-black">
                          {title}
                        </p>
                        <p className="text-[9px] text-slate-500">{location}</p>
                        <p className="mt-1 text-[10px] font-black">{price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <span className="absolute bottom-0 right-0 rounded-tl-xl bg-[#ff684d] px-4 py-2 text-[10px] font-black text-white">
              Dados ilustrativos
            </span>
          </div>
        </section>
        <section id="solucoes" className="border-y border-[#082f38]/8 bg-white">
          <div className="mx-auto grid max-w-[1280px] gap-5 px-5 py-7 sm:grid-cols-3 lg:px-8">
            <div className="flex gap-3">
              <span className="rounded-xl bg-[#fff0eb] p-3 text-[#ff684d]">
                <Building2 size={22} />
              </span>
              <div>
                <p className="font-black">Gestão completa de imóveis</p>
                <p className="text-sm text-[#31515a]">
                  Controle seu portfólio urbano e rural.
                </p>
              </div>
            </div>
            <div className="flex gap-3 border-[#082f38]/10 sm:border-x sm:px-5">
              <span className="rounded-xl bg-[#fff0eb] p-3 text-[#ff684d]">
                <Users size={22} />
              </span>
              <div>
                <p className="font-black">Mais produtividade para sua equipe</p>
                <p className="text-sm text-[#31515a]">
                  Organize leads, tarefas e negociações.
                </p>
              </div>
            </div>
            <div className="flex gap-3 sm:pl-2">
              <span className="rounded-xl bg-[#fff0eb] p-3 text-[#ff684d]">
                <BarChart3 size={22} />
              </span>
              <div>
                <p className="font-black">Oportunidades que avançam</p>
                <p className="text-sm text-[#31515a]">
                  Acompanhe o funil e acelere resultados.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          id="recursos"
          className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8"
        >
          <p className="text-sm font-black uppercase tracking-[.18em] text-[#ff684d]">
            Uma plataforma completa
          </p>
          <h2 className="mt-3 max-w-[760px] text-4xl font-black tracking-[-.035em] sm:text-5xl">
            Tudo para o seu negócio imobiliário em um só lugar.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text, Icon]) => (
              <article
                key={title}
                className="rounded-2xl border border-[#082f38]/12 bg-white p-6 shadow-[0_8px_24px_rgba(8,47,56,.05)]"
              >
                <span className="inline-flex rounded-xl bg-[#fff0eb] p-3 text-[#ff684d]">
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#31515a]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="demo"
          className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8"
        >
          <div className="grid gap-10 rounded-[28px] bg-[#eaf5f2] p-7 sm:p-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[.18em] text-[#ff684d]">
                Conheça a WooNexo na prática
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em]">
                Sua próxima oportunidade começa com uma conversa.
              </h2>
              <p className="mt-4 leading-relaxed text-[#31515a]">
                Agende uma demonstração e veja como a plataforma pode
                transformar a gestão da sua imobiliária.
              </p>
              <div className="mt-6 space-y-3 text-sm font-bold">
                {[
                  'Demonstração personalizada',
                  'Sem compromisso',
                  'Equipe especializada',
                ].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <Check size={18} className="text-[#ff684d]" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <form
              onSubmit={submit}
              className="rounded-2xl bg-white p-6 shadow-[0_14px_34px_rgba(8,47,56,.08)]"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {(['name', 'email', 'phone', 'company'] as const).map(
                  (field) => (
                    <input
                      key={field}
                      required
                      type={field === 'email' ? 'email' : 'text'}
                      aria-label={field}
                      placeholder={
                        {
                          name: 'Nome completo',
                          email: 'voce@imobiliaria.com.br',
                          phone: 'WhatsApp',
                          company: 'Nome da imobiliária',
                        }[field]
                      }
                      value={form[field]}
                      onChange={(e) =>
                        setForm({ ...form, [field]: e.target.value })
                      }
                      className="h-12 rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-[#0b5962]"
                    />
                  )
                )}
              </div>
              <button
                disabled={submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff684d] py-3.5 font-black text-white hover:bg-[#f2563d] disabled:opacity-60"
              >
                {submitting ? 'Enviando...' : 'Agendar demonstração'}{' '}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#082f38]/8 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Brand />
          <div className="flex gap-5 text-sm font-bold text-[#31515a]">
            <a href="/privacy">Política de Privacidade</a>
            <a href="/terms">Termos de Uso</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default SystemSalesPage;
