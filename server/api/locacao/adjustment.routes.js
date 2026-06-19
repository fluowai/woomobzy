/**
 * Adjustment Routes - Reajuste de aluguel
 * /api/locacao/adjustments
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

const INDICES = {
  IGPM: { name: 'Índice Geral de Preços do Mercado', rate: 0.0465 },
  IPCA: { name: 'Índice de Preços ao Consumidor Amplo', rate: 0.0412 },
  INCC: { name: 'Índice Nacional de Custo de Construção', rate: 0.0578 },
  ICV: { name: 'Índice de Custo de Vida', rate: 0.0432 },
  POUPANCA: { name: 'Poupança', rate: 0.035 },
};

/**
 * GET /api/locacao/adjustments/:lease_id
 */
router.get('/:lease_id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id } = req.params;
    if (!isValidUUID(lease_id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rent_adjustments')
      .select('*')
      .eq('lease_id', lease_id)
      .eq('organization_id', req.orgId)
      .order('adjustment_date', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[AdjustmentRoutes] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/adjustments/calculate
 * Calcula reajuste sem aplicar
 */
router.post('/calculate', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id, index: overrideIndex } = req.body;
    if (!isValidUUID(lease_id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data: lease } = await supabase
      .from('leases')
      .select('monthly_rent, adjustment_index')
      .eq('id', lease_id)
      .eq('organization_id', req.orgId)
      .single();

    if (!lease) return res.status(404).json({ error: 'Locação não encontrada' });

    const indexKey = overrideIndex || lease.adjustment_index;
    const indexData = INDICES[indexKey];
    if (!indexData) return res.status(400).json({ error: 'Índice inválido' });

    const currentRent = lease.monthly_rent || 0;
    const newRent = Math.round(currentRent * (1 + indexData.rate) * 100) / 100;

    res.json({
      success: true,
      data: {
        current_rent: currentRent,
        new_rent: newRent,
        index: indexKey,
        index_name: indexData.name,
        rate: indexData.rate,
        rate_percent: (indexData.rate * 100).toFixed(2) + '%',
        difference: Math.round((newRent - currentRent) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('[AdjustmentRoutes] Calculate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/adjustments/apply
 * Aplica reajuste no contrato
 */
router.post('/apply', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id, new_rent, index: overrideIndex } = req.body;
    if (!isValidUUID(lease_id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data: lease } = await supabase
      .from('leases')
      .select('monthly_rent, adjustment_index')
      .eq('id', lease_id)
      .eq('organization_id', req.orgId)
      .single();

    if (!lease) return res.status(404).json({ error: 'Locação não encontrada' });

    const indexKey = overrideIndex || lease.adjustment_index;
    const indexData = INDICES[indexKey];
    const indexRate = indexData?.rate || 0;

    const finalRent = new_rent || Math.round((lease.monthly_rent || 0) * (1 + indexRate) * 100) / 100;

    const { data: adjustment } = await supabase
      .from('rent_adjustments')
      .insert({
        lease_id,
        organization_id: req.orgId,
        previous_rent: lease.monthly_rent || 0,
        new_rent: finalRent,
        adjustment_index: indexKey,
        index_rate: indexRate,
        adjustment_date: new Date().toISOString().split('T')[0],
        calculated_by: 'manual',
        approved: true,
      })
      .select()
      .single();

    if (!adjustment) throw new Error('Erro ao salvar reajuste');

    // Update lease
    const nextAdjustment = new Date();
    nextAdjustment.setFullYear(nextAdjustment.getFullYear() + 1);

    await supabase
      .from('leases')
      .update({
        monthly_rent: finalRent,
        last_rent_adjustment: new Date().toISOString().split('T')[0],
        next_rent_adjustment: nextAdjustment.toISOString().split('T')[0],
        updated_by: req.userId,
      })
      .eq('id', lease_id);

    res.json({ success: true, data: adjustment });
  } catch (error) {
    console.error('[AdjustmentRoutes] Apply error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
