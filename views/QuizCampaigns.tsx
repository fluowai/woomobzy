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
  UploadCloud,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  buildRentalQuestions,
  buildRuralQuestions,
  quizService,
  type QuizCampaign,
  type QuizSubmission,
} from '../services/quiz';

const urbanInitialForm = {
  title: 'Campanha locacao - apartamento',
  propertyLabel: 'Apartamento para locacao',
  city: 'Colorado/PR',
  bedrooms: 3,
  minRent: 1300,
  maxRent: 3000,
  minArea: 100,
  maxArea: 500,
  minBudget: 1500000,
  maxBudget: 6000000,
  aptitude: 'Pecuaria',
  whatsapp: '5544997223030',
  threshold: 70,
};

const ruralInitialForm = {
  title: 'Campanha fazenda produtiva',
  propertyLabel: 'Fazenda rural para venda',
  city: 'Mato Grosso',
  bedrooms: 3,
  minRent: 1300,
  maxRent: 3000,
  minArea: 100,
  maxArea: 500,
  minBudget: 1500000,
  maxBudget: 6000000,
  aptitude: 'Pecuaria',
  whatsapp: '5544997223030',
  threshold: 72,
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
  const { pathname } = useLocation();
  const isRural = pathname.startsWith('/rural');
  const initialForm = isRural ? ruralInitialForm : urbanInitialForm;
  const publicQuizBaseUrl = `${window.location.origin}/quiz`;
  const sourceLabel = isRural ? 'Quiz Rural' : 'Quiz Urbano';
  const matchProfile = isRural ? 'rural' : 'urbano';

  const [campaigns, setCampaigns] = useState<QuizCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selected, setSelected] = useState<QuizCampaign | null>(null);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<Omit<QuizCampaign, 'id' | 'created_at' | 'quiz_submissions'> | null>(null);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setCampaigns(await quizService.listCampaigns());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel carregar as campanhas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm(initialForm);
    setGeneratedCampaign(null);
    setPdfFile(null);
  }, [pathname]);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const totalSubmissions = useMemo(
    () => campaigns.reduce((total, campaign) => total + Number(campaign.quiz_submissions?.[0]?.count || 0), 0),
    [campaigns]
  );

  const manualCampaign = (): Omit<QuizCampaign, 'id' | 'created_at' | 'quiz_submissions'> => ({
    title: form.title,
    slug: slugify(form.title),
    property_label: form.propertyLabel,
    status: 'active',
    whatsapp_number: form.whatsapp,
    qualification_threshold: form.threshold,
    intro_title: isRural ? 'Esta oportunidade rural combina com sua estrategia?' : 'Este imovel combina com o seu momento?',
    intro_copy: isRural
      ? 'Responda algumas perguntas rapidas para confirmar aderencia de area, regiao, orcamento, documentacao e aptidao produtiva antes do atendimento.'
      : `Responda algumas perguntas rapidas. A imobiliaria usa suas respostas para confirmar se ${form.propertyLabel.toLowerCase()} faz sentido antes do atendimento.`,
    success_message: isRural
      ? 'Seu perfil e compativel com esta oportunidade rural. Vamos continuar pelo WhatsApp para alinhar dados tecnicos, disponibilidade e visita.'
      : 'Seu perfil e compativel com esta oportunidade. Vamos continuar pelo WhatsApp para confirmar disponibilidade e visita.',
    disqualification_message: isRural
      ? 'Neste momento, esta oportunidade rural nao corresponde ao seu perfil. Seus dados ficaram registrados para futuras fazendas e areas compativeis.'
      : 'Neste momento, nao temos um imovel disponivel que corresponda ao seu perfil. Seus dados ficaram registrados para futuras oportunidades.',
    questions: isRural ? buildRuralQuestions(form) : buildRentalQuestions(form),
    branding: {
      primary: isRural ? '#16a34a' : '#f04b12',
      charcoal: '#242424',
      muted: '#6d7178',
      background: '#faf8f5',
      logo: '/logo-imobfluow.svg',
      side_image: isRural ? '/templates/template_production.png' : '/templates/urban/urban_luxury_pool.png',
      footer_text: isRural ? 'Atendimento especializado em propriedades rurais' : 'Atendimento imobiliario especializado',
      qualification_label: isRural ? 'Pre-qualificacao rural' : 'Pre-qualificacao imobiliaria',
      lead_source: sourceLabel,
      match_profile: matchProfile,
      niche: matchProfile,
    },
  });

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = generatedCampaign
        ? {
            ...generatedCampaign,
            title: form.title,
            slug: slugify(generatedCampaign.slug || form.title),
            property_label: form.propertyLabel,
            status: 'active' as const,
            whatsapp_number: form.whatsapp,
            qualification_threshold: form.threshold,
            branding: {
              ...(generatedCampaign.branding || {}),
              lead_source: sourceLabel,
              match_profile: matchProfile,
              niche: matchProfile,
            },
          }
        : manualCampaign();

      await quizService.createCampaign(payload);
      toast.success('Campanha criada e publicada.');
      setShowCreate(false);
      setForm(initialForm);
      setPdfFile(null);
      setGeneratedCampaign(null);
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel criar a campanha.');
    } finally {
      setSaving(false);
    }
  };

  const generateCampaignFromPdf = async () => {
    if (!pdfFile) {
      toast.error('Selecione um PDF com o ICP/persona antes de gerar.');
      return;
    }

    try {
      setGenerating(true);
      const campaign = await quizService.generateFromPdf(pdfFile, {
        title: form.title,
        property_label: form.propertyLabel,
        whatsapp_number: form.whatsapp,
        city: form.city,
        rent_range: `R$ ${form.minRent} a R$ ${form.maxRent}`,
        rural_area_range: `${form.minArea} a ${form.maxArea} ha`,
        investment_range: `R$ ${form.minBudget} a R$ ${form.maxBudget}`,
        aptitude: form.aptitude,
        niche: matchProfile,
        lead_source: sourceLabel,
        qualification_threshold: form.threshold,
      });
      setGeneratedCampaign(campaign);
      setForm({
        ...form,
        title: campaign.title,
        propertyLabel: campaign.property_label,
        whatsapp: campaign.whatsapp_number,
        threshold: campaign.qualification_threshold,
      });
      toast.success(`IA criou ${campaign.questions.length} perguntas de qualificacao.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel gerar pelo PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleCampaign = async (campaign: QuizCampaign) => {
    const status = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await quizService.updateCampaign(campaign.id, { status });
      setCampaigns((current) => current.map((item) => item.id === campaign.id ? { ...item, status } : item));
      toast.success(status === 'active' ? 'Campanha ativada.' : 'Campanha pausada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar a campanha.');
    }
  };

  const openResults = async (campaign: QuizCampaign) => {
    setSelected(campaign);
    setLoadingSubmissions(true);
    try {
      setSubmissions(await quizService.listSubmissions(campaign.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel carregar as respostas.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const copyLink = async (campaign: QuizCampaign) => {
    await navigator.clipboard.writeText(`${publicQuizBaseUrl}/${campaign.slug}`);
    toast.success('Link do quiz copiado.');
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className={`mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${isRural ? 'text-emerald-700' : 'text-orange-600'}`}>
            <FileQuestion size={16} /> Qualificacao de leads
          </div>
          <h1 className="text-3xl font-bold text-slate-950">Quiz de campanhas</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            {isRural
              ? 'Crie uma URL por fazenda ou area, qualifique por criterios tecnicos rurais e envie ao Kanban apenas leads aderentes.'
              : 'Crie uma URL por imovel, qualifique pelo ICP e encaminhe ao atendimento somente quem tiver aderencia comercial.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold text-white shadow-lg transition ${isRural ? 'bg-emerald-700 shadow-emerald-700/20 hover:bg-emerald-800' : 'bg-orange-600 shadow-orange-600/20 hover:bg-orange-700'}`}
        >
          <Plus size={18} /> Nova campanha
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={FileQuestion} label="Campanhas" value={campaigns.length} tone={isRural ? 'rural' : 'urban'} />
        <Metric icon={Users} label="Respostas captadas" value={totalSubmissions} tone={isRural ? 'rural' : 'urban'} />
        <Metric icon={CheckCircle2} label="Campanhas ativas" value={campaigns.filter((item) => item.status === 'active').length} tone={isRural ? 'rural' : 'urban'} />
      </section>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : campaigns.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FileQuestion className={`mx-auto ${isRural ? 'text-emerald-600' : 'text-orange-500'}`} size={34} />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Crie a primeira campanha</h2>
          <p className="mt-2 text-sm text-slate-500">A campanha gera um quiz publico e registra cada resposta no CRM.</p>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {campaigns.map((campaign) => {
            const count = Number(campaign.quiz_submissions?.[0]?.count || 0);
            const url = `${publicQuizBaseUrl}/${campaign.slug}`;
            return (
              <article key={campaign.id} className="border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${campaign.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {campaign.status === 'active' ? 'Publicada' : 'Pausada'}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-950">{campaign.title}</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">{campaign.property_label}</p>
                    {campaign.branding?.lead_source && (
                      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">{campaign.branding.lead_source}</p>
                    )}
                  </div>
                  <div className={`${isRural ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'} px-3 py-2 text-center`}>
                    <strong className="block text-xl font-bold">{campaign.qualification_threshold}</strong>
                    <span className="text-[10px] font-bold uppercase">nota de corte</span>
                  </div>
                </div>

                <div className="mt-5 flex min-w-0 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Link2 size={15} className={`shrink-0 ${isRural ? 'text-emerald-700' : 'text-orange-600'}`} />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-600">{url}</span>
                  <button type="button" onClick={() => copyLink(campaign)} title="Copiar link" className={`p-1.5 text-slate-400 ${isRural ? 'hover:text-emerald-700' : 'hover:text-orange-600'}`}><ClipboardCopy size={16} /></button>
                  <a href={url} target="_blank" rel="noreferrer" title="Abrir quiz" className={`p-1.5 text-slate-400 ${isRural ? 'hover:text-emerald-700' : 'hover:text-orange-600'}`}><ExternalLink size={16} /></a>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => openResults(campaign)} className={`inline-flex items-center gap-2 text-sm font-bold text-slate-700 ${isRural ? 'hover:text-emerald-700' : 'hover:text-orange-600'}`}>
                    <BarChart3 size={17} /> {count} resposta{count === 1 ? '' : 's'}
                  </button>
                  <button type="button" onClick={() => toggleCampaign(campaign)} className={`inline-flex h-9 items-center gap-2 border border-slate-200 px-3 text-xs font-bold text-slate-600 ${isRural ? 'hover:border-emerald-300 hover:text-emerald-700' : 'hover:border-orange-300 hover:text-orange-600'}`}>
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
                <h2 className="text-2xl font-bold text-slate-950">Nova campanha de quiz</h2>
                <p className="mt-1 text-sm text-slate-500">Suba o PDF do ICP/persona para a IA montar as perguntas, ou preencha manualmente.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="p-2 text-slate-400 hover:text-slate-900"><X size={22} /></button>
            </div>

            <div className={`${isRural ? 'bg-emerald-50/50' : 'bg-orange-50/50'} border-b border-slate-200 p-6`}>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  <span className="inline-flex items-center gap-2"><UploadCloud size={17} className={isRural ? 'text-emerald-700' : 'text-orange-600'} /> PDF do ICP/persona</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      setPdfFile(event.target.files?.[0] || null);
                      setGeneratedCampaign(null);
                    }}
                    className={`block w-full border bg-white px-3 py-2 text-sm font-semibold text-slate-700 file:mr-4 file:border-0 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white ${isRural ? 'border-emerald-200 file:bg-emerald-700' : 'border-orange-200 file:bg-orange-600'}`}
                  />
                </label>
                <button
                  type="button"
                  disabled={generating || !pdfFile}
                  onClick={generateCampaignFromPdf}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? <Loader2 className="animate-spin" size={17} /> : <Wand2 size={17} />} Gerar pelo PDF
                </button>
              </div>
              {generatedCampaign && (
                <div className="mt-4 border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-800">
                  Campanha gerada com {generatedCampaign.questions.length} perguntas. Confira os dados abaixo e publique quando estiver pronto.
                </div>
              )}
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Nome da campanha" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
              <Field label="Nome do imovel/oferta" value={form.propertyLabel} onChange={(value) => setForm({ ...form, propertyLabel: value })} />
              <Field label={isRural ? 'Regiao/UF' : 'Cidade/UF'} value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
              <Field label="WhatsApp do atendimento" value={form.whatsapp} onChange={(value) => setForm({ ...form, whatsapp: value })} />
              {isRural ? (
                <>
                  <NumberField label="Area minima (ha)" value={form.minArea} onChange={(value) => setForm({ ...form, minArea: value })} />
                  <NumberField label="Area maxima (ha)" value={form.maxArea} onChange={(value) => setForm({ ...form, maxArea: value })} />
                  <NumberField label="Investimento minimo" value={form.minBudget} onChange={(value) => setForm({ ...form, minBudget: value })} />
                  <NumberField label="Investimento maximo" value={form.maxBudget} onChange={(value) => setForm({ ...form, maxBudget: value })} />
                  <Field label="Aptidao principal" value={form.aptitude} onChange={(value) => setForm({ ...form, aptitude: value })} />
                </>
              ) : (
                <>
                  <NumberField label="Quantidade de quartos" value={form.bedrooms} onChange={(value) => setForm({ ...form, bedrooms: value })} />
                  <NumberField label="Aluguel minimo" value={form.minRent} onChange={(value) => setForm({ ...form, minRent: value })} />
                  <NumberField label="Aluguel maximo" value={form.maxRent} onChange={(value) => setForm({ ...form, maxRent: value })} />
                </>
              )}
              <NumberField label="Nota minima (0 a 100)" value={form.threshold} onChange={(value) => setForm({ ...form, threshold: value })} />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-bold text-slate-500">
                A campanha sera publicada em <span className={isRural ? 'text-emerald-700' : 'text-orange-600'}>{publicQuizBaseUrl}/{slugify(form.title) || 'nome-da-campanha'}</span>
              </p>
              <button disabled={saving} type="submit" className={`inline-flex h-11 items-center gap-2 px-5 text-sm font-bold text-white disabled:opacity-60 ${isRural ? 'bg-emerald-700' : 'bg-orange-600'}`}>
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
              <div>
                <h2 className="text-xl font-bold text-slate-950">Respostas da campanha</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.title}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-2 text-slate-400 hover:text-slate-900"><X size={22} /></button>
            </div>
            {loadingSubmissions ? (
              <div className="flex min-h-64 items-center justify-center"><Loader2 className={`animate-spin ${isRural ? 'text-emerald-700' : 'text-orange-600'}`} /></div>
            ) : submissions.length === 0 ? (
              <div className="p-14 text-center text-sm font-medium text-slate-500">Nenhuma resposta recebida ainda.</div>
            ) : (
              <div className="overflow-x-auto p-6">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-3">Lead</th>
                      <th className="pb-3">Contato</th>
                      <th className="pb-3">Score</th>
                      <th className="pb-3">Resultado</th>
                      <th className="pb-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 text-sm">
                        <td className="py-4 font-bold text-slate-900">{item.name}</td>
                        <td className="py-4 text-slate-600">{item.phone}<br /><span className="text-xs text-slate-400">{item.email || 'Sem e-mail'}</span></td>
                        <td className="py-4 font-bold text-slate-900">{item.score}/100</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 text-xs font-bold ${item.qualification_status === 'qualified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {item.qualification_status === 'qualified' ? 'Qualificado' : 'Oportunidade futura'}
                          </span>
                        </td>
                        <td className="py-4 text-slate-500">{new Date(item.created_at).toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Metric = ({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: 'rural' | 'urban' }) => (
  <div className="flex items-center gap-4 border border-slate-200 bg-white p-4 shadow-sm">
    <div className={`flex h-11 w-11 items-center justify-center ${tone === 'rural' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}><Icon size={21} /></div>
    <div>
      <strong className="block text-2xl font-bold text-slate-950">{value}</strong>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  </div>
);

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="space-y-2 text-sm font-bold text-slate-700">
    <span>{label}</span>
    <input required value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
  </label>
);

const NumberField = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <label className="space-y-2 text-sm font-bold text-slate-700">
    <span>{label}</span>
    <input required type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-11 w-full border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
  </label>
);

export default QuizCampaigns;
