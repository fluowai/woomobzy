import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { AsaasService } from '../../services/asaasService.js';

const router = Router();

const listSchema = z.object({
  status: z.enum(['pending', 'received', 'overdue', 'canceled', 'all']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

router.get('/invoices', verifyAuth, async (req, res) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), code: 'INVALID_QUERY' });
    }

    const { status, page, limit } = parsed.data;
    const supabase = getSupabaseServer();

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, asaas_subscription_id, asaas_customer_id')
      .eq('id', req.orgId)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organizacao nao encontrada', code: 'ORG_NOT_FOUND' });
    }

    let asaasInvoices = [];
    try {
      if (org.asaas_subscription_id) {
        asaasInvoices = await AsaasService.listSubscriptions({
          customer: org.asaas_customer_id,
          offset: (page - 1) * limit,
          limit,
        });
      } else {
        asaasInvoices = await AsaasService.listPayments({
          customer: org.asaas_customer_id,
          offset: (page - 1) * limit,
          limit,
        });
      }
    } catch (error) {
      logger.warn('[SubscriptionInvoices] Falha ao consultar Asaas:', error.message);
    }

    const supabaseQuery = supabase
      .from('subscription_invoices')
      .select('*', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .order('due_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status !== 'all') {
      supabaseQuery.eq('status', status === 'received' ? 'pago' : status === 'pending' ? 'pendente' : status === 'overdue' ? 'vencido' : status === 'canceled' ? 'cancelado' : status);
    }

    const { data: localInvoices, error: localError, count } = await supabaseQuery;

    return res.json({
      success: true,
      data: {
        local: localError ? [] : (localInvoices || []),
        asaas: asaasInvoices,
        pagination: {
          total: count || 0,
          page,
          limit,
          pages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error) {
    logger.error('[SubscriptionInvoices] Error:', error);
    return res.status(500).json({ error: error.message, code: 'INVOICES_ERROR' });
  }
});

router.get('/invoices/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseServer();

    const { data: invoice, error } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Fatura nao encontrada', code: 'INVOICE_NOT_FOUND' });
    }

    let asaasPayment = null;
    if (invoice.gateway_payment_id) {
      try {
        asaasPayment = await AsaasService.getPayment(invoice.gateway_payment_id);
      } catch (error) {
        logger.warn('[SubscriptionInvoice] Falha ao consultar Asaas:', error.message);
      }
    }

    return res.json({
      success: true,
      data: {
        ...invoice,
        asaas: asaasPayment,
      },
    });
  } catch (error) {
    logger.error('[SubscriptionInvoice] Error:', error);
    return res.status(500).json({ error: error.message, code: 'INVOICE_ERROR' });
  }
});

export default router;
