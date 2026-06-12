import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileQuestion,
  Link2,
  Loader2,
  Pause,
  Play,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildRentalQuestions, quizService, type QuizCampaign, type QuizSubmission } from '../services/quiz';

const OKA_QUIZ_BASE_URL = 'https://okaimoveis.com.br/quiz';

const initialForm = {
  title: 'Campanha locação - apartamento',
  propertyLabel: 'Apartamento para locação',
  city: 'Colorado/PR',
  bedrooms: 3,
  minRent: 1300,
  maxRent: 3000,
  whatsapp: '5544997223030',
  threshold: 70,
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

const QuizCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<QuizCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selected, setSelected] = useState<QuizCampaign | null>(null);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setCampaigns(await quizService.listCampaigns());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar as campanhas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const totalSubmissions = useMemo(
    () => campaigns.reduce((total, campaign) => total + Number(campaign.quiz_submissions?.[0]?.count || 0), 0),
    [campaigns]
  );

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const slug = slugify(form.title);
      await quizService.createCampaign({
        title: form.title,
        slug,
        property_label: form.propertyLabel,
        status: 'active',
        whatsapp_number: form.whatsapp,
        qualification_threshold: form.threshold,
        intro_title: `Este imóvel combina com o seu momento?`,
        intro_copy: `Responda algumas perguntas rápidas. A OKA usa suas respostas para confirmar se ${form.propertyLabel.toLowerCase()} faz sentido antes de encaminhar você ao atendimento.`,
        success_message: 'Seu perfil é compatível com esta oportunidade. Vamos continuar pelo WhatsApp para confirmar disponibilidade e visita.',
        disqualification_message: 'Neste momento, não temos um imóvel disponível que corresponda ao seu perfil. Seus dados ficaram registrados para futuras oportunidades da OKA.',
        questions: buildRentalQuestions(form),
        branding: {
          primary: '#f04b12',
          charcoal: '#242424',
          muted: '#6d7178',
          background: '#faf8f5',
          logo: '/clients/oka/logo.jpeg',
        },
      });
      toast.success('Campanha criada e publicada.');
      setShowCreate(false);
      setForm(initialForm);
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a campanha.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (campaign: QuizCampaign) => {
    const status = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await quizService.updateCampaign(campaign.id, { status });
      setCampaigns((current) => current.map((item) => item.id === campaign.id ? { ...item, status } : item));
      toast.success(status === 'active' ? 'Campanha ativada.' : 'Campanha pausada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a campanha.');
    }
  };

  const openResults = async (campaign: QuizCampaign) => {
    setSelected(campaign);
    setLoadingSubmissions(true);
    try {
      setSubmissions(await quizService.listSubmissions(campaign.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar as respostas.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const copyLink = async (campaign: QuizCampaign) => {
    const url = `${OKA_QUIZ_BASE_URL}/${campaign.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link do quiz copiado.');
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-orange-600">
            <FileQuestion size={16} /> Qualificação de leads
          </div>
          <h1 className="text-3xl font-black text-slate-950">Quiz de campanhas</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Crie uma URL por imóvel, qualifique pelo ICP e encaminhe ao WhatsApp somente quem tiver aderência comercial.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-orange-600 px-5 text-sm font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
        >
          <Plus size={18} /> Nova campanha
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={FileQuestion} label="Campanhas" value={campaigns.length} />
        <Metric icon={Users} label="Respostas captadas" value={totalSubmissions} />
        <Metric icon={CheckCircle2} label="Campanhas ativas" value={campaigns.filter((item) => item.status === 'active').length} />
      </section>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : campaigns.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FileQuestion className="mx-auto text-orange-500" size={34} />
          <h2 className="mt-4 text-lg font-black text-slate-900">Crie a primeira campanha</h2>
          <p className="mt-2 text-sm text-slate-500">A campanha gera um quiz público e registra cada resposta no CRM.</p>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {campaigns.map((campaign) => {
            const count = Number(campaign.quiz_submissions?.[0]?.count || 0);
            const url = `${OKA_QUIZ_BASE_URL}/${campaign.slug}`;
            return (
              <article key={campaign.id} className="border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${campaign.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                        {campaign.status === 'active' ? 'Publicada' : 'Pausada'}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-950">{campaign.title}</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">{campaign.property_label}</p>
                  </div>
                  <div className="bg-orange-50 px-3 py-2 text-center text-orange-700">
                    <strong className="block text-xl font-black">{campaign.qualification_threshold}</strong>
                    <span className="text-[10px] font-black uppercase">nota de corte</span>
                  </div>
                </div>

                <div className="mt-5 flex min-w-0 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Link2 size={15} className="shrink-0 text-orange-600" />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-600">{url}</span>
                  <button type="button" onClick={() => copyLink(campaign)} title="Copiar link" className="p-1.5 text-slate-400 hover:text-orange-600"><ClipboardCopy size={16} /></button>
                  <a href={url} target="_blank" rel="noreferrer" title="Abrir quiz" className="p-1.5 text-slate-400 hover:text-orange-600"><ExternalLink size={16} /></a>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => openResults(campaign)} className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:text-orange-600">
                    <BarChart3 size={17} /> {count} resposta{count === 1 ? '' : 's'}
                  </button>
                  <button type="button" onClick={() => toggleCampaign(campaign)} className="inline-flex h-9 items-center gap-2 border border-slate-200 px-3 text-xs font-black text-slate-600 hover:border-orange-300 hover:text-orange-600">
                    {campaign.status === 'active' ? <><Pause size={15} /> Pausar</> : <><Play size={15} /> Ativar</>}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <form onSubmit={createCampaign} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Nova campanha de quiz</h2>
                <p className="mt-1 text-sm text-slate-500">As perguntas ACP serão adaptadas ao imóvel informado.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="p-2 text-slate-400 hover:text-slate-900"><X size={22} /></button>
            </div>
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Nome da campanha" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
              <Field label="Nome do imóvel/oferta" value={form.propertyLabel} onChange={(value) => setForm({ ...form, propertyLabel: value })} />
              <Field label="Cidade/UF" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
              <Field label="WhatsApp do atendimento" value={form.whatsapp} onChange={(value) => setForm({ ...form, whatsapp: value })} />
              <NumberField label="Quantidade de quartos" value={form.bedrooms} onChange={(value) => setForm({ ...form, bedrooms: value })} />
              <NumberField label="Nota mínima (0 a 100)" value={form.threshold} onChange={(value) => setForm({ ...form, threshold: value })} />
              <NumberField label="Aluguel mínimo" value={form.minRent} onChange={(value) => setForm({ ...form, minRent: value })} />
              <NumberField label="Aluguel máximo" value={form.maxRent} onChange={(value) => setForm({ ...form, maxRent: value })} />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-bold text-slate-500">A campanha será publicada em <span className="text-orange-600">{OKA_QUIZ_BASE_URL}/{slugify(form.title) || 'nome-da-campanha'}</span></p>
              <button disabled={saving} type="submit" className="inline-flex h-11 items-center gap-2 bg-orange-600 px-5 text-sm font-black text-white disabled:opacity-60">
                {saving ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />} Criar e publicar
              </button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div><h2 className="text-xl font-black text-slate-950">Respostas da campanha</h2><p className="mt-1 text-sm text-slate-500">{selected.title}</p></div>
              <button type="button" onClick={() => setSelected(null)} className="p-2 text-slate-400 hover:text-slate-900"><X size={22} /></button>
            </div>
            {loadingSubmissions ? (
              <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>
            ) : submissions.length === 0 ? (
              <div className="p-14 text-center text-sm font-medium text-slate-500">Nenhuma resposta recebida ainda.</div>
            ) : (
              <div className="overflow-x-auto p-6">
                <table className="w-full min-w-[720px] text-left">
                  <thead><tr className="border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-400"><th className="pb-3">Lead</th><th className="pb-3">Contato</th><th className="pb-3">Score</th><th className="pb-3">Resultado</th><th className="pb-3">Data</th></tr></thead>
                  <tbody>{submissions.map((item) => <tr key={item.id} className="border-b border-slate-100 text-sm"><td className="py-4 font-black text-slate-900">{item.name}</td><td className="py-4 text-slate-600">{item.phone}<br /><span className="text-xs text-slate-400">{item.email || 'Sem e-mail'}</span></td><td className="py-4 font-black text-slate-900">{item.score}/100</td><td className="py-4"><span className={`px-2.5 py-1 text-xs font-black ${item.qualification_status === 'qualified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.qualification_status === 'qualified' ? 'Qualificado' : 'Oportunidade futura'}</span></td><td className="py-4 text-slate-500">{new Date(item.created_at).toLocaleString('pt-BR')}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Metric = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) => (
  <div className="flex items-center gap-4 border border-slate-200 bg-white p-4 shadow-sm"><div className="flex h-11 w-11 items-center justify-center bg-orange-50 text-orange-600"><Icon size={21} /></div><div><strong className="block text-2xl font-black text-slate-950">{value}</strong><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span></div></div>
);

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="space-y-2 text-sm font-black text-slate-700"><span>{label}</span><input required value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></label>
);

const NumberField = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <label className="space-y-2 text-sm font-black text-slate-700"><span>{label}</span><input required type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-11 w-full border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></label>
);

export default QuizCampaigns;
