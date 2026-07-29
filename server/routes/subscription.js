import express from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { verifyAdmin } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();

const selectPlanSchema = z.object({
  planId: z.string().uuid(),
});

export const buildPendingPlanSelection = (planId, selectedAt) => ({
  plan_id: planId,
  subscription_status: 'payment_required',
  selected_plan_at: selectedAt,
});

router.post('/select-plan', verifyAdmin, requireTenant, async (req, res) => {
  const parsed = selectPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Plano inválido.',
      code: 'INVALID_PLAN_SELECTION',
    });
  }

  const supabase = getSupabaseServer();
  const { planId } = parsed.data;

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, name, slug, is_active')
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle();

  if (planError || !plan) {
    return res.status(404).json({
      error: 'Plano ativo não encontrado.',
      code: 'PLAN_NOT_FOUND',
    });
  }

  if (String(plan.slug || '').toLowerCase() === 'free') {
    return res.status(400).json({
      error: 'O plano gratuito não exige ativação.',
      code: 'FREE_PLAN_NOT_SELECTABLE',
    });
  }

  const selectedAt = new Date().toISOString();
  const update = buildPendingPlanSelection(plan.id, selectedAt);
  const { data: organization, error: updateError } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', req.orgId)
    .select('id, plan_id, subscription_status, selected_plan_at')
    .single();

  if (updateError) {
    console.error('[Subscription] Falha ao registrar seleção de plano', {
      organizationId: req.orgId,
      userId: req.user?.id,
      error: updateError.message,
    });
    return res.status(500).json({
      error: 'Não foi possível registrar a seleção do plano.',
      code: 'PLAN_SELECTION_FAILED',
    });
  }

  console.info('[Subscription] Plano aguardando confirmação de pagamento', {
    organizationId: req.orgId,
    userId: req.user?.id,
    planId: plan.id,
  });

  return res.status(202).json({
    success: true,
    requiresPayment: true,
    plan: { id: plan.id, name: plan.name },
    organization,
  });
});

export default router;
