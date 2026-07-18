/**
 * Termination Routes - Rescisão de contrato
 * /api/locacao/terminations
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

import { isValidUUID } from '../../lib/shared-utils.js';

const router = Router();

const terminationSchema = z.object({
  lease_id: z.string().uuid(),
  termination_type: z.enum([
    'acordo',
    'unilateral_locatario',
    'unilateral_locador',
    'quebra_contratual',
  ]),
  termination_date: z.string(),
  reason: z.string().optional(),
  fine_amount: z.number().optional(),
  days_notice: z.number().optional(),
  notice_date: z.string().optional(),
  key_return_date: z.string().optional(),
});

/**
 * GET /api/locacao/terminations/:lease_id
 */
router.get('/:lease_id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id } = req.params;
    if (!isValidUUID(lease_id))
      return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('lease_terminations')
      .select('*')
      .eq('lease_id', lease_id)
      .eq('organization_id', req.orgId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ success: true, data: data || null });
  } catch (error) {
    console.error('[TerminationRoutes] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/terminations
 */
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = terminationSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('lease_terminations')
      .insert({
        organization_id: req.orgId,
        ...validation.data,
      })
      .select()
      .single();

    if (error) throw error;

    // Update lease status
    await supabase
      .from('leases')
      .update({
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        updated_by: req.userId,
      })
      .eq('id', validation.data.lease_id)
      .eq('organization_id', req.orgId);

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[TerminationRoutes] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
