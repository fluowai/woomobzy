import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { quizService, type QuizCampaign } from '../services/quiz';
import BreuBrancoLandingPage from './BreuBrancoLandingPage';

type QuizResult = {
  qualified: boolean;
  score: number;
  message: string;
  whatsapp_url?: string | null;
};

const PublicQuiz: React.FC = () => {
  const { slug = '' } = useParams();
  const isBreuBrancoLanding = ['fazenda-breu-branco', 'breu-branco'].includes(slug);
  const [searchParams] = useSearchParams();
  const [campaign, setCampaign] = useState<QuizCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    if (isBreuBrancoLanding) return;
    quizService
      .getPublicCampaign(slug)
      .then(setCampaign)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Quiz indisponivel.'))
      .finally(() => setLoading(false));
  }, [slug, isBreuBrancoLanding]);

  useEffect(() => {
    if (!result?.qualified || !result.whatsapp_url) return;
    const timer = window.setTimeout(() => window.location.assign(result.whatsapp_url!), 1800);
    return () => window.clearTimeout(timer);
  }, [result]);

  const questions = campaign?.questions || [];
  const currentQuestion = step >= 0 ? questions[step] : null;
  const totalSteps = questions.length + 1;
  const progress = result ? 100 : Math.max(5, ((step + 2) / totalSteps) * 100);
  const canContinueContact = contact.name.trim().length >= 2 && contact.phone.replace(/\D/g, '').length >= 10;
  const canContinueQuestion = currentQuestion ? Boolean(answers[currentQuestion.id]) : false;

  const utm = useMemo(() => {
    const values: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
      const value = searchParams.get(key);
      if (value) values[key] = value;
    });
    return values;
  }, [searchParams]);

  const branding = campaign?.branding || {};
  const primary = (branding.primary as string) || '#f04b12';
  const logo = (branding.logo as string) || '/logo-imobfluow.svg';
  const sideImage = (branding.side_image as string) || '/templates/urban/urban_luxury_pool.png';
  const footerText = (branding.footer_text as string) || 'Atendimento imobiliario especializado';
  const qualificationLabel = (branding.qualification_label as string) || 'Pre-qualificacao imobiliaria';
  const selectionLabel = (branding.selection_label as string) || campaign?.property_label || 'Imovel selecionado';

  if (isBreuBrancoLanding) {
    return <BreuBrancoLandingPage organizationId="ee2eafa9-929a-460e-a38a-2e13d259e7cb" />;
  }

  const next = () => {
    if (step === -1 && canContinueContact) setStep(0);
    else if (step >= 0 && step < questions.length - 1 && canContinueQuestion) setStep((value) => value + 1);
  };

  const submit = async () => {
    if (!campaign || !canContinueQuestion) return;
    try {
      setSubmitting(true);
      setError('');
      const response = await quizService.submitPublic(campaign.slug, {
        ...contact,
        phone: contact.phone.replace(/\D/g, ''),
        answers,
        utm,
      });
      setResult(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nao foi possivel concluir o quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#faf8f5]" style={{ color: primary }}><Loader2 className="animate-spin" size={32} /></div>;
  }

  if (!campaign || (error && !currentQuestion && step === -1)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f5] p-6">
        <div className="max-w-lg text-center">
          <img src="/logo-imobfluow.svg" alt="ImobFluow" className="mx-auto h-20 w-auto object-contain" />
          <h1 className="mt-7 text-2xl font-black text-[#242424]">Quiz indisponivel</h1>
          <p className="mt-3 text-sm leading-6 text-[#6d7178]">{error || 'Esta campanha nao esta disponivel neste momento.'}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f1ee] text-[#242424]">
      <div className="grid min-h-screen lg:grid-cols-[42%_58%]">
        <aside className="relative hidden overflow-hidden lg:block">
          <img src={sideImage} alt={selectionLabel} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
            <p className="text-xs font-black uppercase tracking-[0.28em]" style={{ color: primary }}>{selectionLabel}</p>
            <h2 className="mt-4 max-w-lg font-serif text-4xl leading-tight">{campaign.property_label}</h2>
            <p className="mt-5 max-w-md text-sm font-medium leading-6 text-white/75">Qualificacao rapida, atendimento objetivo e mais seguranca para sua decisao.</p>
          </div>
        </aside>

        <section className="flex min-h-screen flex-col bg-white">
          <header className="flex items-center justify-between border-b border-[#e9e2dc] px-5 py-4 sm:px-8 lg:px-12">
            <img src={logo} alt="ImobFluow" className="h-14 w-40 object-contain object-left" />
            <div className="hidden items-center gap-2 text-xs font-black uppercase tracking-wider text-[#6d7178] sm:flex"><ShieldCheck size={17} style={{ color: primary }} /> Seus dados protegidos</div>
          </header>

          <div className="h-1 bg-[#eee9e4]"><div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: primary }} /></div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-14">
            <div className="w-full max-w-2xl">
              {result ? (
                <div className="text-center">
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${result.qualified ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                    {result.qualified ? <CheckCircle2 size={34} /> : <ShieldCheck size={34} />}
                  </div>
                  <p className="mt-6 text-xs font-black uppercase tracking-[0.24em]" style={{ color: primary }}>Resultado da analise</p>
                  <h1 className="mt-3 font-serif text-4xl leading-tight text-[#242424]">
                    {result.qualified ? 'Seu perfil e compativel.' : 'Vamos manter seu perfil em nossa base.'}
                  </h1>
                  <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-7 text-[#6d7178]">{result.message}</p>
                  {result.qualified && result.whatsapp_url ? (
                    <div className="mt-8">
                      <a href={result.whatsapp_url} className="inline-flex h-12 items-center justify-center gap-2 px-6 text-sm font-black text-white shadow-lg shadow-orange-600/20" style={{ backgroundColor: primary }}>
                        <MessageCircle size={19} /> Continuar no WhatsApp
                      </a>
                      <p className="mt-3 text-xs font-bold text-[#8a8d92]">Abrindo o atendimento automaticamente...</p>
                    </div>
                  ) : (
                    <a href="/" className="mt-8 inline-flex h-12 items-center justify-center gap-2 border border-[#dcd5ce] px-6 text-sm font-black text-[#242424]">Voltar ao site</a>
                  )}
                </div>
              ) : step === -1 ? (
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: primary }}>{qualificationLabel}</p>
                  <h1 className="mt-4 max-w-xl font-serif text-4xl leading-tight sm:text-5xl">{campaign.intro_title}</h1>
                  <p className="mt-5 max-w-xl text-base font-medium leading-7 text-[#6d7178]">{campaign.intro_copy}</p>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <Input label="Seu nome" value={contact.name} onChange={(value) => setContact({ ...contact, name: value })} placeholder="Nome completo" />
                    <Input label="WhatsApp" value={contact.phone} onChange={(value) => setContact({ ...contact, phone: value })} placeholder="(44) 99999-9999" />
                    <div className="sm:col-span-2"><Input label="E-mail (opcional)" value={contact.email} onChange={(value) => setContact({ ...contact, email: value })} placeholder="voce@email.com" type="email" /></div>
                  </div>
                  <button type="button" disabled={!canContinueContact} onClick={next} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-sm font-black text-white shadow-lg shadow-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto" style={{ backgroundColor: primary }}>
                    Comecar agora <ArrowRight size={18} />
                  </button>
                  <p className="mt-4 text-xs leading-5 text-[#8a8d92]">Ao continuar, voce autoriza o uso destes dados para avaliar esta e futuras oportunidades imobiliarias.</p>
                </div>
              ) : currentQuestion ? (
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: primary }}>Pergunta {step + 1} de {questions.length}</p>
                  <h1 className="mt-4 max-w-xl font-serif text-3xl leading-tight sm:text-4xl">{currentQuestion.label}</h1>
                  <div className="mt-7 grid gap-3">
                    {currentQuestion.options.map((option) => {
                      const active = answers[currentQuestion.id] === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: option.value }))}
                          className={`flex min-h-14 items-center justify-between gap-4 border px-4 py-3 text-left text-sm font-bold transition ${active ? 'bg-orange-50' : 'border-[#ddd7d1] bg-white text-[#343434] hover:border-orange-300'}`}
                          style={active ? { borderColor: primary, color: primary } : undefined}
                        >
                          <span>{option.label}</span>
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? 'text-white' : 'border-[#cfc8c1] text-transparent'}`} style={active ? { borderColor: primary, backgroundColor: primary } : undefined}><Check size={14} /></span>
                        </button>
                      );
                    })}
                  </div>
                  {error && <p className="mt-4 text-sm font-bold text-red-600">{error}</p>}
                  <div className="mt-7 flex items-center justify-between gap-4">
                    <button type="button" onClick={() => setStep((value) => value - 1)} className="inline-flex h-11 items-center gap-2 px-1 text-sm font-black text-[#6d7178] hover:text-[#242424]"><ArrowLeft size={18} /> Voltar</button>
                    {step === questions.length - 1 ? (
                      <button type="button" disabled={!canContinueQuestion || submitting} onClick={submit} className="inline-flex h-12 items-center justify-center gap-2 px-6 text-sm font-black text-white disabled:opacity-40" style={{ backgroundColor: primary }}>
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Verificar meu perfil
                      </button>
                    ) : (
                      <button type="button" disabled={!canContinueQuestion} onClick={next} className="inline-flex h-12 items-center justify-center gap-2 bg-[#242424] px-6 text-sm font-black text-white disabled:opacity-40">Continuar <ArrowRight size={18} /></button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <footer className="border-t border-[#e9e2dc] px-5 py-4 text-center text-xs font-medium text-[#8a8d92] sm:px-8">{footerText}</footer>
        </section>
      </div>
    </main>
  );
};

const Input = ({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) => (
  <label className="block text-sm font-black text-[#343434]">
    <span className="mb-2 block">{label}</span>
    <input required={label !== 'E-mail (opcional)'} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full border border-[#dcd5ce] bg-white px-4 text-base font-semibold outline-none transition placeholder:text-[#b0aba6] focus:border-[#f04b12] focus:ring-2 focus:ring-orange-100" />
  </label>
);

export default PublicQuiz;
