import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { sendContactFormEmail } from '../services/emailService.js';

const router = express.Router();
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ [PublicRoutes] Supabase credentials missing.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

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
  const validation = contactSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: validation.error.errors });
  }
  
  const { 
    name, email, phone, message,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    referrer_url, landing_page_url, client_id, fbp, fbc
  } = validation.data;
  
  try {
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('contact_email')
      .single();
    
    const contactEmail = settingsData?.contact_email || 'contato@consultio.com.br';
    
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([{
        name, email, phone, source: utm_source || 'Fale Conosco',
        status: 'Novo', notes: message,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        referrer_url, landing_page_url, client_id, fbp, fbc,
      }])
      .select().single();
    
    if (leadError) throw leadError;
    
    await sendContactFormEmail({ name, email, phone, message }, contactEmail);
    res.json({ success: true, leadId: leadData.id });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar contato' });
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
