import express from 'express';
import axios from 'axios';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Envie um arquivo PDF com o ICP/persona da campanha.'));
  },
});

const publicQuizLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Aguarde um minuto e tente novamente.' },
});

const optionSchema = z.object({
  value: z.string().min(1).max(120),
  label: z.string().min(1).max(240),
  score: z.number().min(0).max(100).default(0),
  disqualify: z.boolean().optional(),
  reason: z.string().max(240).optional(),
});

const questionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/i).max(80),
  label: z.string().min(3).max(300),
  type: z.literal('single').default('single'),
  required: z.boolean().default(true),
  options: z.array(optionSchema).min(2).max(12),
});

const campaignSchema = z.object({
  title: z.string().min(3).max(160),
  slug: z.string().min(3).max(100),
  property_label: z.string().min(3).max(240),
  status: z.enum(['draft', 'active', 'paused', 'archived']).default('draft'),
  whatsapp_number: z.string().min(10).max(20),
  qualification_threshold: z.number().int().min(0).max(100).default(70),
  intro_title: z.string().min(3).max(240),
  intro_copy: z.string().min(10).max(1200),
  success_message: z.string().min(10).max(1200),
  disqualification_message: z.string().min(10).max(1200),
  questions: z.array(questionSchema).min(1).max(30),
  branding: z.record(z.any()).optional().default({}),
});

const submissionSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  phone: z.string().min(8).max(24),
  answers: z.record(z.string().max(160)),
  utm: z.record(z.string().max(500)).optional().default({}),
});

const DEFAULT_QUIZ_WHATSAPP = '5544997223030';
const DEFAULT_QUIZ_MODEL = 'llama-3.3-70b-versatile';

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncateText(value, max) {
  const clean = compactText(value);
  if (clean.length <= max) return clean;
  return clean.slice(0, Math.max(0, max - 1)).trimEnd() + '.';
}

function requiredText(value, fallback, max, min = 3) {
  const clean = truncateText(value, max);
  if (clean.length >= min) return clean;
  return truncateText(fallback, max);
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function sanitizeWhatsapp(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 20) return digits;
  if (digits.length > 20) return digits.slice(0, 20);
  return process.env.DEFAULT_QUIZ_WHATSAPP || DEFAULT_QUIZ_WHATSAPP;
}

function includesAny(text, terms) {
  const normalized = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function detectAptitude(pdfText, fallback) {
  const cleanFallback = compactText(fallback);
  if (cleanFallback) return cleanFallback;
  if (includesAny(pdfText, ['soja', 'milho', 'grao', 'graos', 'safra'])) return 'graos';
  if (includesAny(pdfText, ['pecuaria', 'gado', 'boi', 'pastagem'])) return 'pecuaria';
  if (includesAny(pdfText, ['cana', 'sucro'])) return 'cana-de-acucar';
  if (includesAny(pdfText, ['eucalipto', 'floresta', 'madeira'])) return 'silvicultura';
  return 'atividade rural';
}

function buildBranding(defaults) {
  const isRural = defaults.niche === 'rural';
  return {
    primary: isRural ? '#16a34a' : '#f04b12',
    charcoal: '#242424',
    muted: '#6d7178',
    background: '#faf8f5',
    logo: '/logo-imobfluow.svg',
    lead_source: defaults.lead_source || (isRural ? 'Quiz Rural' : 'Quiz Urbano'),
    match_profile: isRural ? 'rural' : 'urbano',
    niche: isRural ? 'rural' : 'urbano',
    side_image: isRural ? '/templates/template_production.png' : '/templates/urban/urban_luxury_pool.png',
  };
}

function normalizeOption(option, questionId, index) {
  const label = requiredText(option?.label, `Opcao ${index + 1}`, 240, 1);
  const value = normalizeSlug(option?.value || label || `${questionId}-${index + 1}`) || `${questionId}-${index + 1}`;
  const normalized = {
    value: value.slice(0, 120),
    label,
    score: clampNumber(option?.score, 0, 100, 0),
  };
  if (option?.disqualify === true) normalized.disqualify = true;
  if (option?.reason) normalized.reason = truncateText(option.reason, 240);
  return normalized;
}

function normalizeGeneratedQuestions(questions, fallbackQuestions) {
  if (!Array.isArray(questions)) return fallbackQuestions;
  const usedIds = new Set();
  const normalized = questions
    .slice(0, 12)
    .map((question, index) => {
      let id = normalizeSlug(question?.id || question?.label || `q${index + 1}`) || `q${index + 1}`;
      id = id.slice(0, 80);
      while (usedIds.has(id)) id = `${id.slice(0, 74)}-${index + 1}`;
      usedIds.add(id);

      const options = Array.isArray(question?.options)
        ? question.options.map((option, optionIndex) => normalizeOption(option, id, optionIndex)).slice(0, 12)
        : [];

      if (options.length < 2) return null;

      return {
        id,
        label: requiredText(question?.label, `Pergunta ${index + 1}`, 300),
        type: 'single',
        required: question?.required !== false,
        options,
      };
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : fallbackQuestions;
}

function buildUrbanFallbackQuestions(defaults) {
  const city = requiredText(defaults.city, 'sua cidade', 120);
  const property = requiredText(defaults.property_label, 'este imovel', 160);
  const rentRange = requiredText(defaults.rent_range, 'a faixa informada pela imobiliaria', 120, 1);

  return [
    {
      id: 'intent',
      label: `Voce procura um imovel para morar ou investir em ${city}?`,
      type: 'single',
      required: true,
      options: [
        { value: 'moradia', label: `Sim, quero morar em ${city}`, score: 18 },
        { value: 'trabalho', label: `Estou me mudando para ${city} a trabalho`, score: 18 },
        { value: 'investimento', label: 'Busco oportunidade para investimento', score: 12 },
        { value: 'outra-cidade', label: 'Procuro em outra cidade', score: 0, disqualify: true, reason: `Busca fora de ${city}` },
      ],
    },
    {
      id: 'property_fit',
      label: `O perfil de ${property} atende o que voce procura?`,
      type: 'single',
      required: true,
      options: [
        { value: 'fit', label: 'Sim, combina com minha necessidade', score: 18 },
        { value: 'flexible', label: 'Pode combinar, quero avaliar detalhes', score: 12 },
        { value: 'different', label: 'Procuro outro tipo de imovel', score: 0, disqualify: true, reason: 'Tipo de imovel fora do perfil da campanha' },
      ],
    },
    {
      id: 'budget',
      label: `A faixa de valor ${rentRange} cabe no seu planejamento?`,
      type: 'single',
      required: true,
      options: [
        { value: 'compatible', label: 'Sim, esta dentro do meu planejamento', score: 20 },
        { value: 'above_ok', label: 'Posso avaliar se o imovel fizer sentido', score: 14 },
        { value: 'below', label: 'Nao, preciso de uma opcao mais barata', score: 0, disqualify: true, reason: 'Faixa de valor incompativel' },
      ],
    },
    {
      id: 'move_time',
      label: 'Quando pretende avancar com a locacao ou compra?',
      type: 'single',
      required: true,
      options: [
        { value: '15', label: 'Nos proximos 15 dias', score: 14 },
        { value: '30', label: 'Em ate 30 dias', score: 12 },
        { value: '60', label: 'Entre 31 e 60 dias', score: 8 },
        { value: 'later', label: 'Sem prazo definido', score: 0, reason: 'Sem urgencia de decisao' },
      ],
    },
    {
      id: 'income',
      label: 'Voce possui renda, cadastro ou garantia para seguir com a analise?',
      type: 'single',
      required: true,
      options: [
        { value: 'yes', label: 'Sim, tenho renda/cadastro compativel', score: 14 },
        { value: 'guarantee', label: 'Tenho garantia ou responsavel financeiro', score: 10 },
        { value: 'no', label: 'Ainda nao tenho como comprovar', score: 0, disqualify: true, reason: 'Sem condicao minima de cadastro' },
      ],
    },
    {
      id: 'decision',
      label: 'Voce participa diretamente da decisao?',
      type: 'single',
      required: true,
      options: [
        { value: 'decision_maker', label: 'Sim, sou decisor ou participo da decisao', score: 10 },
        { value: 'advisor', label: 'Estou ajudando outra pessoa a escolher', score: 6 },
        { value: 'no', label: 'Nao participo da decisao', score: 0, disqualify: true, reason: 'Nao participa da decisao' },
      ],
    },
    {
      id: 'visit',
      label: 'Se fizer sentido, voce quer falar com o atendimento e agendar uma visita?',
      type: 'single',
      required: true,
      options: [
        { value: 'yes', label: 'Sim, quero avancar pelo WhatsApp', score: 6 },
        { value: 'details', label: 'Quero receber mais detalhes primeiro', score: 3 },
        { value: 'no', label: 'Ainda nao quero atendimento', score: 0 },
      ],
    },
  ];
}

function buildRuralFallbackQuestions(defaults, pdfText) {
  const region = requiredText(defaults.city, 'regiao informada', 120);
  const property = requiredText(defaults.property_label, 'esta propriedade rural', 160);
  const areaRange = requiredText(defaults.rural_area_range, 'a faixa de area informada', 120, 1);
  const investmentRange = requiredText(defaults.investment_range, 'a faixa de investimento informada', 120, 1);
  const aptitude = requiredText(detectAptitude(pdfText, defaults.aptitude), 'atividade rural', 120, 1);
  const waterLabel = includesAny(pdfText, ['agua', 'irrigacao', 'rio', 'represa', 'poco'])
    ? 'Recursos hidricos e infraestrutura produtiva citados no ICP sao decisivos para voce?'
    : 'Agua, acesso e infraestrutura produtiva sao decisivos para voce?';

  return [
    {
      id: 'intent',
      label: `Qual e o seu objetivo principal com ${property}?`,
      type: 'single',
      required: true,
      options: [
        { value: 'production', label: `Producao ligada a ${aptitude}`, score: 18 },
        { value: 'investment', label: 'Investimento patrimonial ou expansao de carteira', score: 16 },
        { value: 'leisure', label: 'Lazer, moradia rural ou uso familiar', score: 8 },
        { value: 'curiosity', label: 'Estou apenas pesquisando mercado', score: 0, reason: 'Lead em fase inicial de pesquisa' },
      ],
    },
    {
      id: 'region',
      label: `A localizacao em ${region} atende sua estrategia?`,
      type: 'single',
      required: true,
      options: [
        { value: 'yes', label: 'Sim, e a regiao que procuro', score: 16 },
        { value: 'nearby', label: 'Pode ser em municipios proximos', score: 12 },
        { value: 'other', label: 'Procuro em outra regiao', score: 0, disqualify: true, reason: `Busca fora de ${region}` },
      ],
    },
    {
      id: 'area',
      label: `A area ${areaRange} faz sentido para sua operacao?`,
      type: 'single',
      required: true,
      options: [
        { value: 'compatible', label: 'Sim, esta dentro do tamanho procurado', score: 18 },
        { value: 'above', label: 'Pode ser maior se o negocio fizer sentido', score: 14 },
        { value: 'below', label: 'Preciso de area menor', score: 0, disqualify: true, reason: 'Area desejada abaixo do perfil da campanha' },
      ],
    },
    {
      id: 'budget',
      label: `O investimento ${investmentRange} esta aprovado ou em validacao?`,
      type: 'single',
      required: true,
      options: [
        { value: 'approved', label: 'Sim, tenho capacidade aprovada', score: 18 },
        { value: 'validating', label: 'Estou validando credito ou socios', score: 10 },
        { value: 'below', label: 'Meu orcamento e menor', score: 0, disqualify: true, reason: 'Orcamento abaixo do perfil da campanha' },
      ],
    },
    {
      id: 'documentation',
      label: 'Documentacao rural, CAR, matricula e due diligence sao pontos que voce quer avaliar?',
      type: 'single',
      required: true,
      options: [
        { value: 'complete', label: 'Sim, preciso avaliar tudo antes de proposta', score: 12 },
        { value: 'flexible', label: 'Aceito analisar pendencias com suporte tecnico', score: 8 },
        { value: 'unknown', label: 'Nao tenho clareza sobre documentacao rural', score: 2, reason: 'Precisa de orientacao documental' },
      ],
    },
    {
      id: 'water_infra',
      label: waterLabel,
      type: 'single',
      required: true,
      options: [
        { value: 'essential', label: 'Sim, impactam diretamente a decisao', score: 10 },
        { value: 'flexible', label: 'Sao importantes, mas posso avaliar caso a caso', score: 7 },
        { value: 'not_required', label: 'Nao sao prioridade neste momento', score: 3 },
      ],
    },
    {
      id: 'purchase_time',
      label: 'Em quanto tempo pretende avancar para proposta ou visita tecnica?',
      type: 'single',
      required: true,
      options: [
        { value: 'now', label: 'Agora, quero avancar nos proximos dias', score: 12 },
        { value: '30', label: 'Em ate 30 dias', score: 10 },
        { value: '90', label: 'Entre 30 e 90 dias', score: 6 },
        { value: 'later', label: 'Sem prazo definido', score: 0, reason: 'Sem prazo de compra definido' },
      ],
    },
    {
      id: 'decision',
      label: 'Voce participa diretamente da decisao de compra?',
      type: 'single',
      required: true,
      options: [
        { value: 'decision_maker', label: 'Sim, sou decisor ou coproprietario do investimento', score: 6 },
        { value: 'advisor', label: 'Sou consultor, familiar ou representante do comprador', score: 4 },
        { value: 'no', label: 'Nao participo da decisao', score: 0, disqualify: true, reason: 'Nao participa da decisao de compra' },
      ],
    },
  ];
}

function buildFallbackQuiz({ pdfText, defaults }) {
  const isRural = defaults.niche === 'rural';
  const propertyLabel = requiredText(defaults.property_label, isRural ? 'Fazenda rural para venda' : 'Imovel em campanha', 240);
  const title = requiredText(
    defaults.title,
    isRural ? `Campanha rural - ${propertyLabel}` : `Campanha imobiliaria - ${propertyLabel}`,
    160
  );
  const threshold = clampNumber(defaults.qualification_threshold, 0, 100, isRural ? 72 : 70);

  return campaignSchema.parse({
    title,
    slug: normalizeSlug(title) || (isRural ? 'campanha-rural-pdf' : 'campanha-imobiliaria-pdf'),
    property_label: propertyLabel,
    status: 'active',
    whatsapp_number: sanitizeWhatsapp(defaults.whatsapp_number),
    qualification_threshold: threshold,
    intro_title: isRural ? 'Esta oportunidade rural combina com sua estrategia?' : 'Este imovel combina com o seu momento?',
    intro_copy: isRural
      ? 'Responda algumas perguntas rapidas para validar regiao, area, investimento, documentacao e prazo antes do atendimento especializado.'
      : `Responda algumas perguntas rapidas para confirmar se ${propertyLabel.toLowerCase()} faz sentido antes do atendimento.`,
    success_message: isRural
      ? 'Seu perfil e compativel com esta oportunidade rural. Vamos continuar pelo WhatsApp para alinhar dados tecnicos, disponibilidade e visita.'
      : 'Seu perfil e compativel com esta oportunidade. Vamos continuar pelo WhatsApp para confirmar disponibilidade e visita.',
    disqualification_message: isRural
      ? 'Neste momento, esta oportunidade rural nao corresponde ao seu perfil. Seus dados ficaram registrados para futuras fazendas e areas compativeis.'
      : 'Neste momento, esta oportunidade nao corresponde ao seu perfil. Seus dados ficaram registrados para futuras oportunidades.',
    questions: isRural ? buildRuralFallbackQuestions(defaults, pdfText) : buildUrbanFallbackQuestions(defaults),
    branding: {
      ...buildBranding(defaults),
      generated_by: 'fallback_pdf_rules',
    },
  });
}

function normalizeGeneratedCampaign(generated, defaults, pdfText) {
  const fallback = buildFallbackQuiz({ pdfText, defaults });
  const threshold = clampNumber(generated?.qualification_threshold, 0, 100, fallback.qualification_threshold);
  const title = requiredText(generated?.title, fallback.title, 160);
  const propertyLabel = requiredText(generated?.property_label || defaults.property_label, fallback.property_label, 240);
  const branding = generated?.branding && typeof generated.branding === 'object' ? generated.branding : {};

  return campaignSchema.parse({
    ...fallback,
    ...generated,
    title,
    slug: normalizeSlug(generated?.slug || title) || fallback.slug,
    status: 'active',
    whatsapp_number: sanitizeWhatsapp(generated?.whatsapp_number || defaults.whatsapp_number || fallback.whatsapp_number),
    qualification_threshold: threshold,
    property_label: propertyLabel,
    intro_title: requiredText(generated?.intro_title, fallback.intro_title, 240),
    intro_copy: requiredText(generated?.intro_copy, fallback.intro_copy, 1200, 10),
    success_message: requiredText(generated?.success_message, fallback.success_message, 1200, 10),
    disqualification_message: requiredText(generated?.disqualification_message, fallback.disqualification_message, 1200, 10),
    questions: normalizeGeneratedQuestions(generated?.questions, fallback.questions),
    branding: {
      ...fallback.branding,
      ...branding,
      lead_source: defaults.lead_source || branding.lead_source || fallback.branding.lead_source,
      match_profile: defaults.niche === 'rural' ? 'rural' : 'urbano',
      niche: defaults.niche === 'rural' ? 'rural' : 'urbano',
    },
  });
}

function handlePdfUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'O PDF deve ter no maximo 15 MB.' });
    }

    return res.status(400).json({
      error: error.message || 'Nao foi possivel receber o PDF.',
    });
  });
}

function evaluateSubmission(questions, answers, threshold) {
  let earned = 0;
  let maximum = 0;
  const reasons = [];
  const answerSummary = [];

  for (const question of questions) {
    const options = Array.isArray(question.options) ? question.options : [];
    maximum += Math.max(0, ...options.map((option) => Number(option.score || 0)));

    const selectedValue = answers[question.id];
    const selected = options.find((option) => option.value === selectedValue);
    if (!selected) {
      if (question.required) reasons.push(`Pergunta não respondida: ${question.label}`);
      continue;
    }

    earned += Number(selected.score || 0);
    answerSummary.push({
      id: question.id,
      question: question.label,
      value: selected.value,
      answer: selected.label,
    });

    if (selected.disqualify) {
      reasons.push(selected.reason || `Resposta incompatível: ${selected.label}`);
    }
  }

  const score = maximum > 0 ? Math.min(100, Math.round((earned / maximum) * 100)) : 0;
  return {
    score,
    answerSummary,
    reasons: [...new Set(reasons)],
    qualified: reasons.length === 0 && score >= threshold,
  };
}

function budgetFromAnswers(answers) {
  const ranges = {
    'below-1000': 999,
    '1000-1299': 1299,
    '1300-2000': 2000,
    '2001-3000': 3000,
    'above-3000': 3001,
    below: null,
    compatible: null,
    above: null,
  };
  return ranges[answers.budget] || null;
}

function campaignBranding(campaign) {
  return campaign?.branding && typeof campaign.branding === 'object' ? campaign.branding : {};
}

function leadSourceForCampaign(campaign) {
  const branding = campaignBranding(campaign);
  if (branding.lead_source) return String(branding.lead_source);
  return branding.niche === 'rural' || branding.match_profile === 'rural' ? 'Quiz Rural' : 'Quiz Urbano';
}

function matchProfileForCampaign(campaign) {
  const branding = campaignBranding(campaign);
  return branding.match_profile === 'rural' ? 'rural' : 'urbano';
}

async function getOrgAIConfig(orgId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('site_settings')
    .select('integrations')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error || !data) return null;
  return data.integrations || {};
}

async function extractPdfText(file) {
  const parser = new PDFParse({ data: file.buffer });
  try {
    const result = await parser.getText();
    return String(result?.text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 26000);
  } finally {
    await parser.destroy().catch(() => {});
  }
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('A IA nao retornou um JSON valido.');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function generateQuizWithGroq({ orgId, pdfText, defaults }) {
  const config = await getOrgAIConfig(orgId);
  const groqKey = (config?.groq?.apiKey || process.env.GROQ_API_KEY || '').trim();
  if (!groqKey) {
    console.warn('[Quiz] Groq nao configurado. Gerando campanha por fallback local.');
    return buildFallbackQuiz({ pdfText, defaults });
  }

  const isRural = defaults.niche === 'rural';
  const prompt = `
Voce e especialista em qualificacao de leads imobiliarios ${isRural ? 'rurais e agroimobiliarios' : 'urbanos'}.
Crie uma campanha de quiz para filtrar leads de um imovel especifico com base no ICP/persona abaixo.

Regras:
- Responda somente JSON valido.
- Nao invente termos genericos como conservador/moderado/agressivo.
- As perguntas devem qualificar aderencia real: ${isRural ? 'regiao, area em hectares, orcamento, aptidao produtiva, documentacao rural, agua/infraestrutura, prazo, papel na decisao e visita tecnica' : 'cidade, tipo de imovel, quartos, faixa de valor, prazo, renda/cadastro, objetivo e urgencia'}.
- Leads fora do perfil devem ter opcoes com disqualify=true e reason claro.
- Use de 6 a 9 perguntas, todas type="single".
- Cada pergunta precisa de 2 a 5 opcoes.
- A soma relativa das melhores respostas deve permitir score 0-100 no backend.
- O texto deve ser consultivo, direto e sem exagero.

Defaults informados pela equipe:
${JSON.stringify(defaults, null, 2)}

Documento ICP/persona:
${pdfText}

Formato exato:
{
  "title": "Campanha ...",
  "slug": "campanha-imovel",
  "property_label": "Nome do imovel/oferta",
  "whatsapp_number": "5544999999999",
  "qualification_threshold": 70,
  "intro_title": "Titulo curto",
  "intro_copy": "Texto de ate 500 caracteres",
  "success_message": "Mensagem para lead qualificado",
  "disqualification_message": "Mensagem para lead fora do perfil",
  "questions": [
    {
      "id": "cidade",
      "label": "Pergunta",
      "type": "single",
      "required": true,
      "options": [
        { "value": "sim", "label": "Resposta", "score": 20 },
        { "value": "nao", "label": "Resposta", "score": 0, "disqualify": true, "reason": "Motivo" }
      ]
    }
  ],
  "branding": {
    "primary": "${isRural ? '#16a34a' : '#f04b12'}",
    "charcoal": "#242424",
    "muted": "#6d7178",
    "background": "#faf8f5",
    "logo": "/logo-imobfluow.svg",
    "lead_source": "${defaults.lead_source || (isRural ? 'Quiz Rural' : 'Quiz Urbano')}",
    "match_profile": "${isRural ? 'rural' : 'urbano'}",
    "niche": "${isRural ? 'rural' : 'urbano'}",
    "side_image": "${isRural ? '/templates/template_production.png' : '/templates/urban/urban_luxury_pool.png'}"
  }
}`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: config?.groq?.model || process.env.GROQ_QUIZ_MODEL || DEFAULT_QUIZ_MODEL,
        messages: [
          { role: 'system', content: 'Voce gera JSON estruturado para campanhas de quiz imobiliario.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.25,
        response_format: { type: 'json_object' },
      },
      { headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' }, timeout: 45000 }
    );

    const text = response.data.choices?.[0]?.message?.content || '';
    const generated = extractJsonObject(text);
    return normalizeGeneratedCampaign(generated, defaults, pdfText);
  } catch (error) {
    console.warn('[Quiz] Groq indisponivel ou resposta invalida. Usando fallback local:', error.response?.data?.error?.message || error.message);
    return buildFallbackQuiz({ pdfText, defaults });
  }
}

router.get('/campaigns', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_campaigns')
      .select('*, quiz_submissions(count)')
      .eq('organization_id', req.orgId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, campaigns: data || [] });
  } catch (error) {
    console.error('[Quiz] Erro ao listar campanhas:', error.message);
    res.status(500).json({ error: 'Não foi possível carregar as campanhas.' });
  }
});

router.post('/campaigns', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = campaignSchema.safeParse({
      ...req.body,
      slug: normalizeSlug(req.body?.slug || req.body?.title),
    });
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados da campanha inválidos.', details: validation.error.errors });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_campaigns')
      .insert({
        ...validation.data,
        organization_id: req.orgId,
        created_by: req.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, campaign: data });
  } catch (error) {
    console.error('[Quiz] Erro ao criar campanha:', error.message);
    const status = error.code === '23505' ? 409 : 500;
    res.status(status).json({ error: status === 409 ? 'Já existe uma campanha com este endereço.' : 'Não foi possível criar a campanha.' });
  }
});

router.patch('/campaigns/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const allowed = campaignSchema.partial().safeParse({
      ...req.body,
      ...(req.body.slug ? { slug: normalizeSlug(req.body.slug) } : {}),
    });
    if (!allowed.success) {
      return res.status(400).json({ error: 'Alterações inválidas.', details: allowed.error.errors });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_campaigns')
      .update({ ...allowed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, campaign: data });
  } catch (error) {
    console.error('[Quiz] Erro ao atualizar campanha:', error.message);
    res.status(500).json({ error: 'Não foi possível atualizar a campanha.' });
  }
});

router.get('/campaigns/:id/submissions', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('campaign_id', req.params.id)
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json({ success: true, submissions: data || [] });
  } catch (error) {
    console.error('[Quiz] Erro ao listar respostas:', error.message);
    res.status(500).json({ error: 'Não foi possível carregar as respostas.' });
  }
});

router.post('/campaigns/generate-from-pdf', verifyAuth, requireTenant, handlePdfUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Envie um PDF com o ICP/persona da campanha.' });
    }

    let pdfText = '';
    try {
      pdfText = await extractPdfText(req.file);
    } catch (pdfError) {
      console.warn('[Quiz] Erro ao extrair texto do PDF:', pdfError.message);
      return res.status(422).json({ error: 'Nao foi possivel ler o texto deste PDF. Tente exportar o documento como PDF pesquisavel e envie novamente.' });
    }

    if (pdfText.length < 300) {
      return res.status(400).json({ error: 'Nao foi possivel extrair texto suficiente do PDF.' });
    }

    const defaults = {
      title: req.body.title || '',
      property_label: req.body.property_label || '',
      whatsapp_number: req.body.whatsapp_number || '',
      city: req.body.city || '',
      rent_range: req.body.rent_range || '',
      rural_area_range: req.body.rural_area_range || '',
      investment_range: req.body.investment_range || '',
      aptitude: req.body.aptitude || '',
      niche: req.body.niche === 'rural' ? 'rural' : 'urbano',
      lead_source: req.body.lead_source || '',
      qualification_threshold: req.body.qualification_threshold || req.body.threshold || '',
    };
    const campaign = await generateQuizWithGroq({ orgId: req.orgId, pdfText, defaults });
    res.json({ success: true, campaign });
  } catch (error) {
    console.error('[Quiz] Erro ao gerar campanha por PDF:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Nao foi possivel gerar a campanha pelo PDF.' });
  }
});

router.get('/public/:slug', async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('quiz_campaigns')
      .select('id,title,slug,property_label,intro_title,intro_copy,success_message,disqualification_message,questions,branding')
      .eq('slug', normalizeSlug(req.params.slug))
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Quiz não encontrado ou indisponível.' });
    const publicQuestions = (Array.isArray(data.questions) ? data.questions : []).map((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      options: (Array.isArray(question.options) ? question.options : []).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    }));
    res.json({ success: true, campaign: { ...data, questions: publicQuestions } });
  } catch (error) {
    console.error('[Quiz] Erro ao abrir quiz público:', error.message);
    res.status(500).json({ error: 'Não foi possível abrir este quiz.' });
  }
});

router.post('/public/:slug/submissions', publicQuizLimiter, async (req, res) => {
  try {
    const validation = submissionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Preencha seus dados e responda todas as perguntas.' });
    }

    const supabase = getSupabaseServer();
    const { data: campaign, error: campaignError } = await supabase
      .from('quiz_campaigns')
      .select('*')
      .eq('slug', normalizeSlug(req.params.slug))
      .eq('status', 'active')
      .maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign) return res.status(404).json({ error: 'Quiz não encontrado ou indisponível.' });

    const result = evaluateSubmission(
      Array.isArray(campaign.questions) ? campaign.questions : [],
      validation.data.answers,
      Number(campaign.qualification_threshold || 70)
    );
    const classification = result.qualified ? 'qualified' : 'nurture';
    const leadSource = leadSourceForCampaign(campaign);
    const matchProfile = matchProfileForCampaign(campaign);
    const notes = [
      `Quiz: ${campaign.title}`,
      `Resultado: ${result.qualified ? 'Qualificado' : 'Nutrição futura'} (${result.score}/100)`,
      ...result.answerSummary.map((item) => `${item.question}: ${item.answer}`),
      ...(result.reasons.length ? [`Motivos: ${result.reasons.join('; ')}`] : []),
    ].join('\n');

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: campaign.organization_id,
        name: validation.data.name,
        email: validation.data.email || null,
        phone: validation.data.phone,
        status: result.qualified ? 'Novo' : 'Nutrição Quiz',
        source: leadSource,
        campaign: campaign.title,
        notes,
        budget: budgetFromAnswers(validation.data.answers),
        classification,
        lead_score: result.score,
        match_profile: matchProfile,
        ai_profile: {
          quiz_campaign_id: campaign.id,
          quiz_slug: campaign.slug,
          lead_source: leadSource,
          match_profile: matchProfile,
          qualification_status: classification,
          answers: result.answerSummary,
          reasons: result.reasons,
        },
      })
      .select('id')
      .single();
    if (leadError) throw leadError;

    const { error: submissionError } = await supabase.from('quiz_submissions').insert({
      organization_id: campaign.organization_id,
      campaign_id: campaign.id,
      lead_id: lead.id,
      name: validation.data.name,
      email: validation.data.email || null,
      phone: validation.data.phone,
      answers: validation.data.answers,
      score: result.score,
      qualification_status: classification,
      disqualification_reasons: result.reasons,
      utm: validation.data.utm,
    });
    if (submissionError) throw submissionError;

    let whatsappUrl = null;
    if (result.qualified) {
      const message = [
        `Olá! Sou ${validation.data.name}.`,
        `Fui pre-qualificado pelo ${leadSource} para: ${campaign.property_label}.`,
        `Pontuação: ${result.score}/100.`,
        matchProfile === 'rural'
          ? 'Quero confirmar os dados tecnicos, disponibilidade e visita.'
          : 'Quero confirmar a disponibilidade e agendar uma visita.',
      ].join('\n');
      whatsappUrl = `https://wa.me/${String(campaign.whatsapp_number).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    }

    res.status(201).json({
      success: true,
      qualified: result.qualified,
      score: result.score,
      message: result.qualified ? campaign.success_message : campaign.disqualification_message,
      whatsapp_url: whatsappUrl,
    });
  } catch (error) {
    console.error('[Quiz] Erro ao processar resposta:', error.message);
    res.status(500).json({ error: 'Não foi possível concluir o quiz. Tente novamente.' });
  }
});

export default router;
