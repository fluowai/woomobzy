/**
 * Inspection Routes - Vistorias
 * /api/locacao/inspections
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router();

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

const inspectionSchema = z.object({
  lease_id: z.string().uuid(),
  inspection_type: z.enum(['entrada', 'saida', 'periodica']),
  inspection_date: z.string(),
  inspector_name: z.string().optional(),
  tenant_present: z.boolean().optional(),
  owner_present: z.boolean().optional(),
  items: z.array(z.object({
    room: z.string(),
    item: z.string(),
    condition: z.enum(['otimo', 'bom', 'regular', 'ruim', 'inexistente']),
    observation: z.string().optional(),
    photo_urls: z.array(z.string()).optional(),
  })).optional(),
  meter_readings: z.object({
    water_meter: z.string().optional(),
    energy_meter: z.string().optional(),
    gas_meter: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/locacao/inspections/:lease_id
 */
router.get('/:lease_id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id } = req.params;
    if (!isValidUUID(lease_id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('lease_id', lease_id)
      .eq('organization_id', req.orgId)
      .order('inspection_date', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[InspectionRoutes] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/inspections
 */
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = inspectionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('inspections')
      .insert({
        organization_id: req.orgId,
        ...validation.data,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[InspectionRoutes] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/locacao/inspections/:id
 */
router.put('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const validation = inspectionSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('inspections')
      .update(validation.data)
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Vistoria não encontrada' });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[InspectionRoutes] Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
