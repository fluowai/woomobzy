import express from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { sendContactFormEmail } from '../services/emailService.js';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { matchLeadProperties } from '../services/leadPropertyMatcher.js';
import { verifyAdmin } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();
const supabase = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseServer();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: 'Muitas requisições de contato. Tente novamente em 1 minuto.',
  },
});

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  phone: z.string().min(8).max(20),
  message: z.string().min(5).max(2000),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  referrer_url: z.string().url().optional(),
  landing_page_url: z.string().url().optional(),
  client_id: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
});

const leadSchema = z.object({
  organization_id: z.string().uuid().optional().nullable(),
  organization_slug: z.string().max(120).optional().nullable(),
  organization_domain: z.string().max(255).optional().nullable(),
  owner_email: z.string().email().max(255).optional().nullable(),
  site_key: z.string().max(120).optional().nullable(),
  name: z.string().min(2).max(100),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  phone: z.string().min(8).max(20),
  source: z.string().max(120).optional(),
  ad_reference: z.string().max(255).optional(),
  organic_channel: z.string().max(120).optional(),
  campaign: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  budget: z
    .union([z.string().max(120), z.number()])
    .optional()
    .nullable(),
  aptitude_interest: z
    .union([z.string().max(120), z.array(z.string().max(120)).max(12)])
    .optional()
    .nullable(),
  property_id: z.string().uuid().optional().nullable(),
  status: z.enum(['Novo', 'Qualificação']).optional(),
  classification: z.string().max(120).optional(),
  lead_score: z.number().min(0).max(100).optional(),
  match_profile: z.enum(['urbano', 'rural', 'misto', 'indefinido']).optional(),
});

// Contact Form
router.post('/contact', contactLimiter, async (req, res) => {
  // ... (mantido como está)
});

/**
 * POST /api/public/leads
 * Rota pública para captura de leads (página Em Breve / Landing Pages)
 * Não exige autenticação, mas exige organization_id.
 */
router.post('/leads', contactLimiter, async (req, res) => {
  try {
    const validation = leadSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Dados invalidos', details: validation.error.errors });
    }

    const {
      name,
      email,
      phone,
      organization_id,
      organization_slug,
      organization_domain,
      owner_email,
      site_key,
      source,
      ad_reference,
      organic_channel,
      campaign,
      notes,
      budget,
      aptitude_interest,
      property_id,
      status,
      classification,
      lead_score,
      match_profile,
    } = validation.data;
    const organization = await resolvePublicLeadOrganization({
      supabase,
      organizationId: organization_id,
      slug: organization_slug,
      domain: organization_domain,
      ownerEmail: owner_email,
      siteKey: site_key,
      source,
      campaign,
      referrerUrl: req.body?.referrer_url,
      origin: req.headers.origin,
      host: req.headers.host,
    });

    if (!organization) {
      return res
        .status(404)
        .json({ error: 'Organizacao nao encontrada ou indisponivel.' });
    }

    const leadPayload = {
      organization_id: organization.id,
      name,
      email: email || null,
      phone,
      source: source || 'Public / Landing Page',
      ad_reference,
      organic_channel,
      campaign,
      notes,
      property_id,
      status: status || 'Novo',
      classification,
      lead_score,
      match_profile,
    };

    const normalizedBudget = normalizeLeadBudget(budget);
    if (normalizedBudget !== undefined) {
      leadPayload.budget = normalizedBudget;
    }

    const normalizedAptitudeInterest = normalizeTextArray(aptitude_interest);
    if (aptitude_interest !== undefined) {
      leadPayload.aptitude_interest = normalizedAptitudeInterest;
    }

    const leadData = await insertPublicLeadWithFallback({
      supabase,
      payload: leadPayload,
      fallbackPayload: buildPublicLeadFallbackPayload({
        organizationId: organization.id,
        name,
        email,
        phone,
        source,
        notes,
        metadata: {
          property_id,
          ad_reference,
          organic_channel,
          campaign,
          budget,
          aptitude_interest,
          status,
          classification,
          lead_score,
          match_profile,
        },
      }),
    });

    matchLeadProperties({
      supabase,
      lead: leadData,
      organizationId: organization.id,
    }).catch((matchError) => {
      console.warn(
        '[Public API] Erro ao gerar matches do lead:',
        matchError.message
      );
    });

    res.json({ success: true, leadId: leadData.id });
  } catch (error) {
    console.error('[Public API] Erro ao salvar lead:', error);
    res.status(500).json({ error: 'Erro ao processar cadastro' });
  }
});

async function resolvePublicLeadOrganization({
  supabase,
  organizationId,
  slug,
  domain,
  ownerEmail,
  siteKey,
  source,
  campaign,
  referrerUrl,
  origin,
  host,
}) {
  if (organizationId) {
    const organization = await findOrganizationById(supabase, organizationId);
    if (organization) return organization;

    console.warn(
      '[Public API] organization_id publico invalido; tentando resolver por sinais',
      {
        organizationId,
        source,
        campaign,
      }
    );
  }

  const hostname =
    extractHostname(referrerUrl) ||
    extractHostname(origin) ||
    extractHostname(host);
  const domainSignals = uniqueNonEmpty([
    domain,
    hostname,
    hostname?.replace(/^www\./, ''),
  ]);

  for (const value of domainSignals) {
    const organization = await findOrganizationByDomain(supabase, value);
    if (organization) return organization;
  }

  const slugSignals = uniqueNonEmpty([
    slug,
    siteKey,
    ...inferPublicOrgSlugs({ source, campaign, referrerUrl, origin, host }),
  ]);

  for (const value of slugSignals) {
    const organization = await findOrganizationBySlug(supabase, value);
    if (organization) return organization;
  }

  const nameSignals = uniqueNonEmpty([
    ...inferPublicOrgNames({ source, campaign, referrerUrl, origin, host }),
  ]);

  for (const value of nameSignals) {
    const organization = await findOrganizationByName(supabase, value);
    if (organization) return organization;
  }

  const emailSignals = uniqueNonEmpty([
    ownerEmail,
    ...inferPublicOrgOwnerEmails({
      source,
      campaign,
      referrerUrl,
      origin,
      host,
    }),
  ]);

  for (const value of emailSignals) {
    const organization = await findOrganizationByOwnerEmail(supabase, value);
    if (organization) return organization;
  }

  if (
    isFazendasBrasilSignal({
      source,
      campaign,
      referrerUrl,
      origin,
      host,
      slug,
      siteKey,
      domain,
    })
  ) {
    return ensureFazendasBrasilOrganization(supabase);
  }

  return null;
}

async function findOrganizationById(supabase, id) {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn(
      '[Public API] Erro ao resolver organizacao por id:',
      error.message
    );
    return null;
  }
  return data || null;
}

async function findOrganizationBySlug(supabase, slug) {
  const normalized = normalizePublicOrgSignal(slug);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .ilike('slug', normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(
      '[Public API] Erro ao resolver organizacao por slug:',
      error.message
    );
    return null;
  }
  return data || null;
}

async function findOrganizationByDomain(supabase, domain) {
  const normalized = normalizeDomainSignal(domain);
  if (!normalized) return null;

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .ilike('custom_domain', normalized)
    .limit(1)
    .maybeSingle();

  if (!orgError && organization) return organization;
  if (orgError)
    console.warn(
      '[Public API] Erro ao resolver organizacao por dominio:',
      orgError.message
    );

  const { data: domainEntry, error: domainError } = await supabase
    .from('domains')
    .select('organization_id')
    .ilike('domain', normalized)
    .limit(1)
    .maybeSingle();

  if (domainError) {
    console.warn(
      '[Public API] Erro ao resolver dominio publico:',
      domainError.message
    );
    return null;
  }
  return domainEntry?.organization_id
    ? { id: domainEntry.organization_id }
    : null;
}

async function findOrganizationByName(supabase, name) {
  const normalized = String(name || '').trim();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .ilike('name', normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(
      '[Public API] Erro ao resolver organizacao por nome:',
      error.message
    );
    return null;
  }
  return data || null;
}

async function findOrganizationByOwnerEmail(supabase, email) {
  const normalized = String(email || '')
    .toLowerCase()
    .trim();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .ilike('owner_email', normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(
      '[Public API] Erro ao resolver organizacao por owner_email:',
      error.message
    );
    return null;
  }
  return data || null;
}

function inferPublicOrgSlugs(signals) {
  const text = stringifySignals(signals);
  if (isFazendasBrasilText(text)) {
    return [
      'fazendasbrasil',
      'fazendas-brasil',
      'fazendasbrasil1',
      'imobiliariafazendasbrasil',
    ];
  }
  return [];
}

function inferPublicOrgOwnerEmails(signals) {
  const text = stringifySignals(signals);
  if (isFazendasBrasilText(text)) {
    return ['contato@fazendasbrasil.com.br'];
  }
  return [];
}

function inferPublicOrgNames(signals) {
  const text = stringifySignals(signals);
  if (isFazendasBrasilText(text)) {
    return ['Fazendas Brasil'];
  }
  return [];
}

async function ensureFazendasBrasilOrganization(supabase) {
  const payload = {
    name: 'Fazendas Brasil',
    slug: 'fazendasbrasil',
    custom_domain: 'fazendasbrasil.com.br',
    status: 'active',
    niche: 'rural',
    owner_name: 'Fazendas Brasil',
    owner_email: 'contato@fazendasbrasil.com.br',
    subscription_status: 'active',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('organizations')
    .insert(payload)
    .select('id')
    .single();

  if (!error && data) {
    console.warn(
      '[Public API] Organizacao Fazendas Brasil criada automaticamente para lead publico',
      {
        organizationId: data.id,
      }
    );
    return data;
  }

  if (error?.code !== '23505') {
    console.warn(
      '[Public API] Falha ao criar organizacao Fazendas Brasil:',
      error?.message || error
    );
  }

  return (
    (await findOrganizationBySlug(supabase, 'fazendasbrasil')) ||
    (await findOrganizationByOwnerEmail(
      supabase,
      'contato@fazendasbrasil.com.br'
    )) ||
    (await findOrganizationByName(supabase, 'Fazendas Brasil'))
  );
}

function isFazendasBrasilSignal(signals) {
  return isFazendasBrasilText(stringifySignals(signals));
}

function isFazendasBrasilText(text) {
  return (
    String(text || '').includes('fazendasbrasil') ||
    String(text || '').includes('fazendas brasil')
  );
}

function stringifySignals(signals) {
  return Object.values(signals || {})
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function extractHostname(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    return new URL(
      raw.includes('://') ? raw : `https://${raw}`
    ).hostname.toLowerCase();
  } catch {
    return raw.split('/')[0]?.split(':')[0]?.toLowerCase() || null;
  }
}

function normalizeDomainSignal(value) {
  return extractHostname(value)?.replace(/^www\./, '') || null;
}

function normalizePublicOrgSignal(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '-');
}

const PUBLIC_LEAD_MONEY_MULTIPLIERS = {
  mil: 1_000,
  milhao: 1_000_000,
  milhoes: 1_000_000,
  mi: 1_000_000,
  m: 1_000_000,
};

function normalizeLeadBudget(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = normalizeTextForParsing(value);
  if (!text) return null;

  if (/\b(acima|above|maior|mais de)\b/.test(text)) {
    return null;
  }

  const matches = [
    ...text.matchAll(/(\d[\d.,]*)\s*(milhoes|milhao|mi|m|mil)?/g),
  ];
  if (!matches.length) return null;

  const fallbackUnit =
    [...matches].reverse().find((match) => match[2])?.[2] || '';
  const amounts = matches
    .map((match) => parseMoneyAmount(match[1], match[2] || fallbackUnit))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  return amounts.length ? Math.max(...amounts) : null;
}

function parseMoneyAmount(rawNumber, rawUnit = '') {
  const normalizedNumber = String(rawNumber || '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const amount = Number(normalizedNumber);
  if (!Number.isFinite(amount)) return null;

  return amount * (PUBLIC_LEAD_MONEY_MULTIPLIERS[rawUnit] || 1);
}

function normalizeTextArray(value) {
  if (value === undefined || value === null || value === '') return [];
  const values = Array.isArray(value) ? value : [value];
  const normalized = values.flatMap((item) =>
    String(item || '').split(/[;,|]/)
  );
  return uniqueNonEmpty(normalized).slice(0, 12);
}

function normalizeTextForParsing(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function insertPublicLeadWithFallback({
  supabase,
  payload,
  fallbackPayload,
}) {
  const { data, error } = await supabase
    .from('leads')
    .insert([payload])
    .select()
    .single();

  if (!error) return data;
  if (!isRecoverablePublicLeadInsertError(error)) throw error;

  console.warn(
    '[Public API] Insert completo do lead falhou; tentando payload minimo:',
    {
      code: error.code,
      message: error.message,
    }
  );

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('leads')
    .insert([fallbackPayload])
    .select()
    .single();

  if (fallbackError) throw fallbackError;
  return fallbackData;
}

function buildPublicLeadFallbackPayload({
  organizationId,
  name,
  email,
  phone,
  source,
  notes,
  metadata,
}) {
  return {
    organization_id: organizationId,
    name,
    email: email || null,
    phone,
    status: 'Novo',
    source: source || 'Public / Landing Page',
    notes: appendPublicLeadMetadata(notes, metadata),
  };
}

function appendPublicLeadMetadata(notes, metadata = {}) {
  const lines = Object.entries(metadata)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
    .map(([key, value]) => {
      const serialized = Array.isArray(value)
        ? value.join(', ')
        : String(value);
      return `${key}: ${serialized}`;
    });

  return [
    notes,
    lines.length ? `Dados da captura publica:\n${lines.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function isRecoverablePublicLeadInsertError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '42703' ||
    error?.code === '42804' ||
    error?.code === '22P02' ||
    error?.code === '23503' ||
    error?.code === '23514' ||
    error?.code === 'PGRST204' ||
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('column') ||
    message.includes('violates foreign key') ||
    message.includes('violates check constraint') ||
    message.includes('invalid input syntax') ||
    message.includes('invalid input value')
  );
}

function uniqueNonEmpty(values) {
  return [
    ...new Set(
      values.map((value) => String(value || '').trim()).filter(Boolean)
    ),
  ];
}

// Texts management
router.get('/texts', async (req, res) => {
  try {
    const { category, section } = req.query;
    let query = supabase.from('site_texts').select('*');
    if (category) query = query.eq('category', category);
    if (section) query = query.eq('section', section);
    const { data, error } = await query.order('section', { ascending: true });
    if (error) {
      if (isOptionalTextsTableError(error)) {
        console.warn(
          '[Public API] site_texts indisponivel; usando textos padrao do frontend:',
          {
            code: error.code,
            message: error.message,
          }
        );
        return res.json({ success: true, texts: {}, raw: [] });
      }
      throw error;
    }
    const textsMap = {};
    data?.forEach((text) => {
      textsMap[text.key] = text.value;
    });
    res.json({ success: true, texts: textsMap, raw: data || [] });
  } catch (error) {
    console.warn(
      '[Public API] Erro nao critico ao buscar textos; retornando vazio:',
      error?.message || error
    );
    res.json({ success: true, texts: {}, raw: [] });
  }
});

function isOptionalTextsTableError(error) {
  if (!error) return false;
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST205' ||
    error?.code === 'PGRST116' ||
    error?.status === 404 ||
    message.includes('site_texts') ||
    message.includes('relation') ||
    message.includes('could not find the table') ||
    message.includes('could not find the column') ||
    message.includes('does not exist') ||
    message.includes('not found') ||
    message.includes('network error') ||
    message.includes('fetch failed') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  );
}

router.put('/texts/:key', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const { data, error } = await supabase
      .from('site_texts')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .eq('organization_id', req.orgId)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, text: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
