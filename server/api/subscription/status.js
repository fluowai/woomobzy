import { Router } from 'express';
import { logger } from '../../utils/logger.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { AsaasService } from '../../services/asaasService.js';

const router = Router();

router.get('/status', verifyAuth, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data: org, error } = await supabase
      .from('organizations')
      .select(
        'id, name, plan_id, subscription_status, trial_ends_at, selected_plan_at, asaas_customer_id, asaas_subscription_id'
      )
      .eq('id', req.orgId)
      .single();

    if (error || !org) {
      return res
        .status(404)
        .json({ error: 'Organizacao nao encontrada', code: 'ORG_NOT_FOUND' });
    }

    let asaasSubscription = null;
    if (org.asaas_subscription_id) {
      try {
        asaasSubscription = await AsaasService.getSubscription(
          org.asaas_subscription_id
        );
      } catch (error) {
        logger.warn(
          '[SubscriptionStatus] Falha ao consultar Asaas:',
          error.message
        );
      }
    }

    const isActive = org.subscription_status === 'active';
    const isTrial = org.subscription_status === 'trial';
    const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
    const trialExpired =
      isTrial && trialEndsAt && trialEndsAt.getTime() < Date.now();

    return res.json({
      success: true,
      data: {
        organization: {
          id: org.id,
          name: org.name,
          plan_id: org.plan_id,
          subscription_status: org.subscription_status,
          trial_ends_at: org.trial_ends_at,
          selected_plan_at: org.selected_plan_at,
          asaas_customer_id: org.asaas_customer_id,
          asaas_subscription_id: org.asaas_subscription_id,
        },
        access: {
          allowed: isActive || !trialExpired,
          reason: trialExpired
            ? 'TRIAL_EXPIRED'
            : org.subscription_status === 'payment_required'
              ? 'PAYMENT_REQUIRED'
              : 'OK',
        },
        asaas: asaasSubscription,
      },
    });
  } catch (error) {
    logger.error('[SubscriptionStatus] Error:', error);
    return res.status(500).json({ error: error.message, code: 'STATUS_ERROR' });
  }
});

export default router;
