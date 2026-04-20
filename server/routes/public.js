import express from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { sendContactFormEmail } from '../services/emailService.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

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
    const { name, email, phone, organization_id, source } = req.body;

    if (!organization_id || !name || !phone) {
      return res.status(400).json({ error: 'Dados insuficientes (nome, telefone e org_id são obrigatórios)' });
    }

    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([{
        organization_id,
        name,
        email,
        phone,
        source: source || 'Public / Landing Page',
        status: 'Novo'
      }])
      .select().single();

    if (leadError) throw leadError;

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
    if (error) throw error;
    const textsMap = {};
    data?.forEach(text => { textsMap[text.key] = text.value; });
    res.json({ success: true, texts: textsMap });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/texts/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const { data, error } = await supabase
      .from('site_texts')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select().single();
    if (error) throw error;
    res.json({ success: true, text: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
