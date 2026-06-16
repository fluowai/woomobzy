import express from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { sendContactFormEmail } from '../services/emailService.js';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { matchLeadProperties } from '../services/leadPropertyMatcher.js';
import { verifyAdmin } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Muitas requisições de contato. Tente novamente em 1 minuto.' },
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
  organization_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  phone: z.string().min(8).max(20),
  source: z.string().max(120).optional(),
  ad_reference: z.string().max(255).optional(),
  organic_channel: z.string().max(120).optional(),
  campaign: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  budget: z.union([z.string().max(80), z.number()]).optional().nullable(),
  aptitude_interest: z.string().max(120).optional(),
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
      return res.status(400).json({ error: 'Dados invalidos', details: validation.error.errors });
    }

    const {
      name,
      email,
      phone,
      organization_id,
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
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organization_id)
      .maybeSingle();

    if (orgError || !organization) {
      return res.status(404).json({ error: 'Organizacao nao encontrada ou indisponivel.' });
    }

    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([{
        organization_id,
        name,
        email,
        phone,
        source: source || 'Public / Landing Page',
        ad_reference,
        organic_channel,
        campaign,
        notes,
        budget,
        aptitude_interest,
        property_id,
        status: status || 'Novo',
        classification,
        lead_score,
        match_profile,
      }])
      .select().single();

    if (leadError) throw leadError;

    matchLeadProperties({
      supabase,
      lead: leadData,
      organizationId: organization_id,
    }).catch((matchError) => {
      console.warn('[Public API] Erro ao gerar matches do lead:', matchError.message);
    });

    res.json({ success: true, leadId: leadData.id });
  } catch (error) {
    console.error('[Public API] Erro ao salvar lead:', error);
    res.status(500).json({ error: 'Erro ao processar cadastro' });
  }
});

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
        console.warn('[Public API] site_texts indisponivel; usando textos padrao do frontend:', {
          code: error.code,
          message: error.message,
        });
        return res.json({ success: true, texts: {}, raw: [] });
      }
      throw error;
    }
    const textsMap = {};
    data?.forEach(text => { textsMap[text.key] = text.value; });
    res.json({ success: true, texts: textsMap, raw: data || [] });
  } catch (error) {
    console.error('[Public API] Erro ao buscar textos:', error);
    res.status(500).json({ error: error.message });
  }
});

function isOptionalTextsTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST205' ||
    message.includes('site_texts') ||
    message.includes("could not find the table") ||
    message.includes("could not find the column")
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
      .select().single();
    if (error) throw error;
    res.json({ success: true, text: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
