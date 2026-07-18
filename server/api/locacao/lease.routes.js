/**
 * Lease Routes - CRUD de contratos de locação
 * /api/locacao/leases
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

import { isValidUUID } from '../../lib/shared-utils.js';

const router = Router();

const leaseCreateSchema = z.object({
  property_id: z.string().uuid().optional(),
  tenant_name: z.string().min(2).max(200),
  tenant_email: z.string().email().optional(),
  tenant_phone: z.string().min(10).max(20).optional(),
  tenant_cpf: z.string().optional(),
  tenant_type: z.enum(['PF', 'PJ']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  monthly_rent: z.number().positive().optional(),
  due_day: z.number().int().min(1).max(31).optional(),
  adjustment_index: z
    .enum(['IGPM', 'IPCA', 'INCC', 'ICV', 'POUPANCA'])
    .optional(),
  guarantee_type: z
    .enum([
      'fiador',
      'seguro_fianca',
      'deposito_caucao',
      'titulo_capitalizacao',
      'sem',
    ])
    .optional(),
  observation: z.string().optional(),
});

const leaseUpdateSchema = leaseCreateSchema.partial();

/**
 * GET /api/locacao/leases
 */
router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const {
      status,
      payment_status,
      property_id,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const supabase = getSupabaseServer();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('leases')
      .select('*', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) query = query.eq('status', status);
    if (payment_status) query = query.eq('payment_status', payment_status);
    if (property_id) query = query.eq('property_id', property_id);
    if (search) {
      query = query.or(
        `tenant_name.ilike.%${search}%,contract_number.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    });
  } catch (error) {
    console.error('[LeaseRoutes] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/leases
 */
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = leaseCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('leases')
      .insert({
        organization_id: req.orgId,
        created_by: req.userId,
        status: 'draft',
        ...validation.data,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('lease_history').insert({
      lease_id: data.id,
      organization_id: req.orgId,
      action: 'created',
      description: 'Contrato de locação criado',
      user_id: req.userId,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[LeaseRoutes] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locacao/leases/:id
 */
router.get('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('lease_overview')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !data)
      return res.status(404).json({ error: 'Contrato não encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[LeaseRoutes] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/locacao/leases/:id
 */
router.put('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const validation = leaseUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('leases')
      .update({ ...validation.data, updated_by: req.userId })
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return res.status(404).json({ error: 'Contrato não encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[LeaseRoutes] Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/locacao/leases/:id
 */
router.delete('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('leases')
      .update({ status: 'archived', updated_by: req.userId })
      .eq('id', id)
      .eq('organization_id', req.orgId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('[LeaseRoutes] Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/locacao/leases/:id/status
 */
router.patch('/:id/status', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const validStatuses = [
      'draft',
      'cadastral_analysis',
      'income_analysis',
      'pending_signatures',
      'active',
      'suspended',
      'terminated',
      'expired',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const supabase = getSupabaseServer();
    const updates = { status, updated_by: req.userId };

    if (status === 'active') updates.activated_at = new Date().toISOString();
    if (status === 'terminated')
      updates.terminated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('leases')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return res.status(404).json({ error: 'Contrato não encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[LeaseRoutes] Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
