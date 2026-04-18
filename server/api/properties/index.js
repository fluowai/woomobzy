import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/properties
 */
router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ 
      success: true, 
      properties: data,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/properties
 */
router.post('/', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const propertyData = req.body;
    
    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        organization_id: req.orgId // FORÇADO
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, property: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/properties/:id
 */
router.get('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Imóvel não encontrado' });
    res.json({ success: true, property: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/properties/:id
 */
router.delete('/:id', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ success: true, message: 'Imóvel excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
