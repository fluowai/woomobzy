/**
 * Lease Routes - CRUD de contratos de locação
 * /api/locacao/leases
 */
import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

import { isValidUUID } from '../../lib/shared-utils.js';
import { ContractGenerationService } from '../../services/contractGenerationService.js';

const MIGRATION_MSG =
  'Execute a migration 20260730_fix_all_production_errors.sql no Supabase.';

function handleTableError(error) {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    error?.message?.includes('does not exist')
  );
}

const router = Router();

const leaseCreateSchema = z
  .object({
    property_id: z.string().uuid().optional(),
    tenant_name: z.string().min(2).max(200),
    tenant_email: z.string().email().optional(),
    tenant_phone: z.string().min(10).max(20).optional(),
    tenant_cpf: z.string().optional(),
    tenant_type: z.enum(['PF', 'PJ']).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    monthly_rent: z.number().optional(),
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
  })
  .passthrough();

const leaseUpdateSchema = leaseCreateSchema.partial();

// Campos gerenciados pelo servidor (nunca devem vir do cliente) ou calculados
// que não possuem coluna na tabela rental_contracts.
const PROTECTED_FIELDS = [
  'id',
  'organization_id',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
  'signed_at',
  'activated_at',
  'terminated_at',
  'dias_restantes',
  'meses_restantes',
];

function sanitizeLeasePayload(body) {
  const clean = { ...(body || {}) };
  for (const field of PROTECTED_FIELDS) delete clean[field];
  return clean;
}

// Drafts are auto-saved with partial data: DB nulls, empty inputs and NaN are
// dropped before validation so optional fields do not reject the whole payload.
function normalizeLeasePayload(body) {
  const clean = { ...(body || {}) };
  for (const [key, value] of Object.entries(clean)) {
    if (value === null || value === undefined) {
      delete clean[key];
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      delete clean[key];
      continue;
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      delete clean[key];
      continue;
    }
    if (key === 'due_day' && value === 0) {
      delete clean[key];
    }
  }
  return clean;
}

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
      .from('rental_contracts')
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
    logger.error('[LeaseRoutes] List error:', error);
    if (handleTableError(error)) {
      return res.status(503).json({
        error: `Tabela rental_contracts não existe. ${MIGRATION_MSG}`,
        migration_required: true,
      });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/leases
 */
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = leaseCreateSchema.safeParse(normalizeLeasePayload(req.body));
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rental_contracts')
      .insert({
        organization_id: req.orgId,
        created_by: req.userId,
        status: 'draft',
        ...sanitizeLeasePayload(validation.data),
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
    logger.error('[LeaseRoutes] Create error:', error);
    if (handleTableError(error)) {
      return res.status(503).json({
        error: `Tabela rental_contracts ou lease_history não existe. ${MIGRATION_MSG}`,
        migration_required: true,
      });
    }
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
      .from('rental_contracts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !data)
      return res.status(404).json({ error: 'Contrato não encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[LeaseRoutes] Get error:', error);
    if (handleTableError(error)) {
      return res.status(503).json({
        error: `Tabela rental_contracts não existe. ${MIGRATION_MSG}`,
        migration_required: true,
      });
    }
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

    const validation = leaseUpdateSchema.safeParse(normalizeLeasePayload(req.body));
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rental_contracts')
      .update({
        ...sanitizeLeasePayload(validation.data),
        updated_by: req.userId,
      })
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return res.status(404).json({ error: 'Contrato não encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[LeaseRoutes] Update error:', error);
    if (handleTableError(error)) {
      return res.status(503).json({
        error: `Tabela rental_contracts não existe. ${MIGRATION_MSG}`,
        migration_required: true,
      });
    }
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
      .from('rental_contracts')
      .update({ status: 'archived', updated_by: req.userId })
      .eq('id', id)
      .eq('organization_id', req.orgId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    logger.error('[LeaseRoutes] Delete error:', error);
    if (handleTableError(error)) {
      return res.status(503).json({
        error: `Tabela rental_contracts não existe. ${MIGRATION_MSG}`,
        migration_required: true,
      });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/leases/:id/generate-contract
 * Opcional: enviar { template_content } para usar um template específico
 * (ex.: Modelo Padrão do frontend). Sem ele, usa o template do contrato
 * (current_template_id) ou o default da organização.
 */
router.post('/:id/generate-contract', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const templateContent = req.body?.template_content;

    let generated;
    if (templateContent) {
      generated = await ContractGenerationService.generateFromTemplate(
        id,
        templateContent,
        req.orgId,
        req.userId
      );
    } else {
      generated = await ContractGenerationService.regenerateContract(
        id,
        req.orgId,
        req.userId
      );
    }

    res.json({ success: true, data: generated });
  } catch (error) {
    logger.error('[LeaseRoutes] Generate contract error:', error);
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
      .from('rental_contracts')
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
    logger.error('[LeaseRoutes] Status error:', error);
    if (handleTableError(error)) {
      return res.status(503).json({
        error: `Tabela rental_contracts não existe. ${MIGRATION_MSG}`,
        migration_required: true,
      });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
