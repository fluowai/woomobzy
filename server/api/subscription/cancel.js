import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { verifyAdmin } from '../../middleware/auth.js';
import { AsaasService } from '../../services/asaasService.js';
import { resolveAsaasApiKey } from '../../middleware/asaas.js';

const router = Router();

const cancelSchema = z.object({
  asaasSubscriptionId: z.string().optional(),
});

router.post(
  '/cancel',
  verifyAuth,
  verifyAdmin,
  resolveAsaasApiKey,
  async (req, res) => {
    try {
      const parsed = cancelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: parsed.error.flatten(), code: 'INVALID_CANCEL' });
      }

      const { asaasSubscriptionId } = parsed.data;
      const supabase = getSupabaseServer();

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, asaas_subscription_id, subscription_status, plan_id')
        .eq('id', req.orgId)
        .single();

      if (orgError || !org) {
        return res
          .status(404)
          .json({ error: 'Organizacao nao encontrada', code: 'ORG_NOT_FOUND' });
      }

      const subscriptionId = asaasSubscriptionId || org.asaas_subscription_id;
      if (!subscriptionId) {
        return res.status(400).json({
          error: 'Assinatura nao encontrada',
          code: 'SUBSCRIPTION_NOT_FOUND',
        });
      }

      let asaasResponse = null;
      try {
        asaasResponse = await AsaasService.deleteSubscription(
          subscriptionId,
          req.asaasApiKey || undefined
        );
      } catch (error) {
        logger.warn(
          '[SubscriptionCancel] Falha ao cancelar no Asaas:',
          error.message
        );
      }

      const { data: updatedOrg, error: updateError } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'canceled',
          asaas_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', org.id)
        .select('id, subscription_status, asaas_subscription_id')
        .single();

      if (updateError) {
        logger.error(
          '[SubscriptionCancel] Erro ao atualizar organizacao:',
          updateError
        );
        return res.status(500).json({
          error: 'Falha ao atualizar assinatura',
          code: 'DB_UPDATE_FAILED',
        });
      }

      return res.json({
        success: true,
        data: {
          organization: updatedOrg,
          asaas: asaasResponse,
        },
      });
    } catch (error) {
      logger.error('[SubscriptionCancel] Error:', error);
      return res
        .status(500)
        .json({ error: error.message, code: 'CANCEL_ERROR' });
    }
  }
);

export default router;
