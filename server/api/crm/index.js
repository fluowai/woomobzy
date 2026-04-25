import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/crm/leads
 * Lista leads da organização do usuário logado.
 */
router.get('/leads', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('leads')
      .select('*, properties(title, price, images)', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ 
      success: true, 
      leads: data,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/leads
 * Cria um lead garantindo que pertença ao tenant correto.
 */
router.post('/leads', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { name, phone, email, property_id, source } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: req.orgId, 
        name,
        phone,
        email,
        property_id,
        source: source || 'CRM / Manual',
        ad_reference: req.body.ad_reference,
        organic_channel: req.body.organic_channel,
        campaign: req.body.campaign,
        notes: req.body.notes,
        status: 'Novo'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, lead: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/crm/leads/:id/status
 */
router.patch('/leads/:id/status', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Verificar ownership
    const { data: lead, error: findError } = await supabase
      .from('leads')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (findError || lead.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, lead: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
