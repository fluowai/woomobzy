import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { verifyAdmin } from '../../middleware/auth.js';
import { AsaasService } from '../../services/asaasService.js';
import { resolveAsaasApiKey } from '../../middleware/asaas.js';

const router = Router();

const checkoutSchema = z.object({
  planId: z.string().uuid(),
  billingType: z
    .enum(['UNDEFINED', 'BOLETO', 'PIX', 'CREDIT_CARD'])
    .default('UNDEFINED'),
  coupon: z.string().optional(),
});





router.post('/checkout', verifyAuth, verifyAdmin, resolveAsaasApiKey, async (req, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.flatten(), code: 'INVALID_CHECKOUT' });
    }

    const { planId, billingType } = parsed.data;
    const supabase = getSupabaseServer();

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(
        'id, name, owner_email, owner_name, plan_id, asaas_customer_id'
      )
      .eq('id', req.orgId)
      .single();

    if (orgError || !organization) {
      return res
        .status(404)
        .json({ error: 'Organizacao nao encontrada', code: 'ORG_NOT_FOUND' });
    }

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select(
        'id, name, price_monthly, interval, interval_count, asaas_price_id, slug'
      )
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();

    if (planError || !plan) {
      return res
        .status(404)
        .json({ error: 'Plano nao encontrado', code: 'PLAN_NOT_FOUND' });
    }

    if (
      plan.price_monthly === null ||
      plan.price_monthly === undefined ||
      Number(plan.price_monthly) <= 0
    ) {
      return res.status(400).json({
        error: 'Plano sem preco configurado',
        code: 'PLAN_WITHOUT_PRICE',
      });
    }

    let customer = null;
    let asaasCustomerId = organization.asaas_customer_id;

    if (!asaasCustomerId) {
      const ownerEmail =
        organization.owner_email || (req.user && req.user.email);
      const ownerName =
        organization.owner_name ||
        organization.name ||
        (req.user && req.user.user_metadata?.name);

      customer = await AsaasService.getOrCreateCustomer({
        name: ownerName || organization.name || 'Cliente',
        cpfCnpj: undefined,
        email: ownerEmail,
        mobilePhone: undefined,
        externalReference: organization.id,
      }, req.asaasApiKey || undefined);

      asaasCustomerId = customer.id;

      await supabase
        .from('organizations')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', organization.id);
    }

    const value = Number(plan.price_monthly);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const description = `Assinatura ${plan.name} - ${organization.name}`;

    const createSubscriptionPayload = {
      customer: asaasCustomerId,
      billingType,
      value,
      nextDueDate: dueDate.toISOString().split('T')[0],
      description,
      cycle: plan.interval === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
      maxPayments: plan.interval_count || 1,
      externalReference: organization.id,
    };

    if (plan.asaas_price_id) {
      createSubscriptionPayload.priceId = plan.asaas_price_id;
    }

    let subscription = null;
    let payment = null;

    try {
      subscription = await AsaasService.createSubscription(
        createSubscriptionPayload,
        req.asaasApiKey || undefined
      );

      if (subscription?.id) {
        await supabase
          .from('organizations')
          .update({
            asaas_subscription_id: subscription.id,
            subscription_status: 'payment_required',
            selected_plan_at: new Date().toISOString(),
            plan_id: plan.id,
          })
          .eq('id', organization.id);
      }
    } catch (error) {
      logger.warn(
        '[SubscriptionCheckout] Falha ao criar assinatura Asaas, criando cobranca avulsa:',
        error.message
      );

      payment = await AsaasService.createPayment({
        customer: asaasCustomerId,
        billingType: billingType === 'UNDEFINED' ? 'PIX' : billingType,
        value,
        dueDate: dueDate.toISOString().split('T')[0],
        description,
        externalReference: organization.id,
      }, req.asaasApiKey || undefined);
    }

    const result = {
      subscription,
      payment,
      customer: asaasCustomerId,
      plan: { id: plan.id, name: plan.name, price_monthly: plan.price_monthly },
      organization: { id: organization.id, name: organization.name },
    };

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('[SubscriptionCheckout] Error:', error);
    return res
      .status(500)
      .json({ error: error.message, code: 'CHECKOUT_ERROR' });
  }
});

router.post('/webhook/asaas', async (req, res) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = String(req.headers['x-asaas-signature'] || '');

    if (!AsaasService.verifyWebhookSignature(rawBody, signature)) {
      logger.warn('[SubscriptionWebhook] Assinatura invalida ou ausente');
      return res
        .status(401)
        .json({ error: 'Assinatura invalida', code: 'INVALID_SIGNATURE' });
    }

    const payload = req.body;
    const event = payload.event || payload.action || '';
    const asaasObject =
      payload.payment || payload.subscription || payload.object || {};
    const asaasId = asaasObject.id;

    if (!asaasId) {
      return res.status(200).json({ received: true, ignored: true });
    }

    logger.info('[SubscriptionWebhook] Evento recebido', { event, asaasId });

    const supabase = getSupabaseServer();
    const normalizedEvent = String(event).toUpperCase();

    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(normalizedEvent)) {
      const paymentId = asaasId;
      const { data: payment } = await supabase
        .from('subscription_invoices')
        .select('id, organization_id, status')
        .eq('gateway_payment_id', paymentId)
        .maybeSingle();

      if (payment) {
        await supabase
          .from('subscription_invoices')
          .update({
            status: 'pago',
            payment_date:
              asaasObject.clientPaymentDate ||
              asaasObject.paymentDate ||
              new Date().toISOString().split('T')[0],
            paid_amount: asaasObject.netValue || asaasObject.value,
            payment_method: 'asaas',
            gateway_response: asaasObject,
          })
          .eq('id', payment.id);

        const { data: org } = await supabase
          .from('organizations')
          .select('id, subscription_status, plan_id')
          .eq('id', payment.organization_id)
          .maybeSingle();

        if (org && org.subscription_status !== 'active') {
          await supabase
            .from('organizations')
            .update({ subscription_status: 'active' })
            .eq('id', payment.organization_id);
        }
      }
    } else if (normalizedEvent === 'PAYMENT_OVERDUE') {
      const { data: payment } = await supabase
        .from('subscription_invoices')
        .select('id')
        .eq('gateway_payment_id', asaasId)
        .maybeSingle();

      if (payment) {
        await supabase
          .from('subscription_invoices')
          .update({ status: 'vencido', gateway_response: asaasObject })
          .eq('id', payment.id);
      }
    } else if (
      ['PAYMENT_DELETED', 'PAYMENT_REFUNDED'].includes(normalizedEvent)
    ) {
      const { data: payment } = await supabase
        .from('subscription_invoices')
        .select('id')
        .eq('gateway_payment_id', asaasId)
        .maybeSingle();

      if (payment) {
        await supabase
          .from('subscription_invoices')
          .update({ status: 'cancelado', gateway_response: asaasObject })
          .eq('id', payment.id);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('[SubscriptionWebhook] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
