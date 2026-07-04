import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DemoQualification,
  DemoSlot,
  demoSchedulerService,
  scoreQualification,
} from '../services/demoScheduler';

const teamOptions = [
  { value: '1-5', label: '1 a 5 corretores' },
  { value: '6-15', label: '6 a 15 corretores' },
  { value: '16-40', label: '16 a 40 corretores' },
  { value: '40+', label: 'Mais de 40 corretores' },
];

const leadOptions = [
  { value: '0-20', label: 'Até 20 leads/mês' },
  { value: '21-50', label: '21 a 50 leads/mês' },
  { value: '51-150', label: '51 a 150 leads/mês' },
  { value: '150+', label: 'Mais de 150 leads/mês' },
];

const goalOptions = [
  { value: 'organizar_atendimento', label: 'Organizar atendimento e CRM' },
  { value: 'aumentar_vendas', label: 'Aumentar vendas e conversão' },
  { value: 'automatizar_processos', label: 'Automatizar processos com IA' },
  { value: 'conhecer', label: 'Só conhecer a plataforma' },
];

const urgencyOptions = [
  { value: 'agora', label: 'Quero resolver agora' },
  { value: '30_dias', label: 'Nos próximos 30 dias' },
  { value: 'futuro', label: 'Estou pesquisando para o futuro' },
];

const formatSlot = (slot: DemoSlot) => {
  const startsAt = new Date(slot.startsAt);
  const date = startsAt.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const time = startsAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date: date.replace('.', ''), time };
};

const getInitialData = (searchParams: URLSearchParams): DemoQualification => {
  let stored: any = {};
  try {
    stored = JSON.parse(sessionStorage.getItem('imobfluow_demo_lead') || '{}');
  } catch {
    stored = {};
  }

  return {
    name: searchParams.get('name') || stored.name || '',
    email: searchParams.get('email') || stored.email || '',
    phone: searchParams.get('phone') || stored.phone || '',
    company: searchParams.get('company') || stored.company || '',
    teamSize: '',
    monthlyLeads: '',
    mainGoal: searchParams.get('goal') || stored.goal || '',
    urgency: '',
  };
};

const ConsultingQualificacao: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<DemoQualification>(() => getInitialData(searchParams));
  const [step, setStep] = useState<'filter' | 'schedule' | 'confirmed' | 'nurture'>('filter');
  const [slots, setSlots] = useState<DemoSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<DemoSlot | null>(null);

  const score = useMemo(() => scoreQualification(formData), [formData]);
  const isQualified = score >= 4;
  const canContinue =
    formData.name &&
    formData.email &&
    formData.phone &&
    formData.company &&
    formData.teamSize &&
    formData.monthlyLeads &&
    formData.mainGoal &&
    formData.urgency;

  useEffect(() => {
    if (step !== 'schedule') return;

    const loadSlots = async () => {
      try {
        setIsLoadingSlots(true);
        setSlots(await demoSchedulerService.listPublicSlots());
      } catch (error: any) {
        toast.error(error.message || 'Erro ao carregar horários disponíveis.');
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadSlots();
  }, [step]);

  const updateField = (field: keyof DemoQualification, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleQualification = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canContinue) {
      toast.error('Preencha todos os campos para continuar.');
      return;
    }

    if (!isQualified) {
      setStep('nurture');
      return;
    }

    setStep('schedule');
  };

  const handleBooking = async () => {
    if (!selectedSlot) {
      toast.error('Escolha um horário para a demonstração.');
      return;
    }

    try {
      setIsSubmitting(true);
      await demoSchedulerService.createBooking({
        ...formData,
        slotId: selectedSlot,
        notes: `Qualificação automática ImobFluow | Score: ${score}`,
      });
      setConfirmedSlot(slots.find((slot) => slot.id === selectedSlot) || null);
      setStep('confirmed');
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível confirmar este horário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-5 py-8 font-sans text-[#07172a]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/consultoria')} className="flex items-center gap-3">
            <img src="/logo-imobfluow.svg" alt="ImobFluow" className="h-9 w-auto" />
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm sm:flex">
            <ShieldCheck size={15} />
            Agenda própria ImobFluow
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-[24px] bg-[#07172a] p-6 text-white shadow-2xl shadow-slate-900/20 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-emerald-200">
              <Sparkles size={15} />
              Demonstração personalizada
            </div>
            <h1 className="mt-6 text-3xl font-bold leading-tight lg:text-4xl">
              Antes da agenda, entendemos se a ImobFluow faz sentido para sua operação.
            </h1>
            <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
              O filtro evita reuniões genéricas. Leads qualificados liberam uma call de 30 minutos direto na agenda interna.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                ['1', 'Qualificação rápida'],
                ['2', 'Agenda própria de 30 minutos'],
                ['3', 'Call comercial conduzida pela equipe ImobFluow'],
              ].map(([number, label]) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm font-bold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white">{number}</span>
                  {label}
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm lg:p-8">
            {step === 'filter' && (
              <form onSubmit={handleQualification} className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600">Filtro comercial</p>
                  <h2 className="mt-2 text-2xl font-bold">Conte um pouco sobre sua imobiliária.</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <input required value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Nome completo" className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                  <input required type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="E-mail profissional" className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                  <input required value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="WhatsApp" className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                  <input required value={formData.company} onChange={(e) => updateField('company', e.target.value)} placeholder="Nome da imobiliária" className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                </div>

                <OptionGroup title="Tamanho da equipe" value={formData.teamSize} options={teamOptions} onChange={(value) => updateField('teamSize', value)} />
                <OptionGroup title="Volume médio de leads" value={formData.monthlyLeads} options={leadOptions} onChange={(value) => updateField('monthlyLeads', value)} />
                <OptionGroup title="Principal objetivo" value={formData.mainGoal} options={goalOptions} onChange={(value) => updateField('mainGoal', value)} />
                <OptionGroup title="Urgência" value={formData.urgency} options={urgencyOptions} onChange={(value) => updateField('urgency', value)} />

                <button type="submit" className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-xl shadow-emerald-900/15 hover:bg-emerald-700">
                  Ver disponibilidade <ArrowRight size={18} />
                </button>
              </form>
            )}

            {step === 'schedule' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600">Agenda liberada</p>
                    <h2 className="mt-2 text-2xl font-bold">Escolha uma call de 30 minutos.</h2>
                  </div>
                  <button type="button" onClick={() => setStep('filter')} className="text-sm font-bold text-slate-500 hover:text-emerald-700">
                    Editar respostas
                  </button>
                </div>

                {isLoadingSlots ? (
                  <div className="flex h-64 items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-[20px] border border-amber-100 bg-amber-50 p-6">
                    <p className="font-bold text-amber-800">Nenhum horário aberto agora.</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-amber-700">
                      O super admin precisa abrir horários em Consultoria no painel.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {slots.map((slot) => {
                      const formatted = formatSlot(slot);
                      const isSelected = selectedSlot === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot.id)}
                          className={`rounded-[20px] border p-5 text-left transition ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-900/10' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
                        >
                          <CalendarDays size={22} className={isSelected ? 'text-emerald-700' : 'text-slate-400'} />
                          <p className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-500">{formatted.date}</p>
                          <p className="mt-1 text-2xl font-bold">{formatted.time}</p>
                          <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500"><Clock3 size={14} /> 30 minutos</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button disabled={!selectedSlot || isSubmitting} onClick={handleBooking} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-xl shadow-emerald-900/15 hover:bg-emerald-700 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <>Confirmar demonstração <ArrowRight size={18} /></>}
                </button>
              </div>
            )}

            {step === 'confirmed' && (
              <ResultState
                icon={CheckCircle2}
                title="Demonstração agendada."
                text={confirmedSlot ? `Sua call de 30 minutos está marcada para ${formatSlot(confirmedSlot).date} às ${formatSlot(confirmedSlot).time}. A equipe ImobFluow entrará em contato pelo WhatsApp informado.` : 'Sua call de 30 minutos foi confirmada.'}
              />
            )}

            {step === 'nurture' && (
              <ResultState
                icon={UserCheck}
                title="Obrigado pelas respostas."
                text="Pelo perfil informado, vamos direcionar você para um atendimento assíncrono antes da demonstração ao vivo. Isso mantém a agenda focada nas operações com implantação imediata."
              />
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

const OptionGroup: React.FC<{
  title: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ title, value, options, onChange }) => (
  <div>
    <p className="mb-3 text-sm font-bold text-slate-900">{title}</p>
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${value === option.value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

const ResultState: React.FC<{ icon: React.ElementType; title: string; text: string }> = ({ icon: Icon, title, text }) => (
  <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-50 text-emerald-700">
      <Icon size={34} />
    </div>
    <h2 className="mt-6 text-3xl font-bold">{title}</h2>
    <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-600">{text}</p>
  </div>
);

export default ConsultingQualificacao;
