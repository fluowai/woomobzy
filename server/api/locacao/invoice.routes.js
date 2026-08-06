/**
 * Invoice Routes - Boletos e cobranças
 * /api/locacao/invoices
 */
import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { isValidUUID } from '../../lib/shared-utils.js';
import { AsaasService } from '../../services/asaasService.js';

const router = Router();

/**
 * GET /api/locacao/invoices/:lease_id
 */
router.get('/:lease_id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id } = req.params;
    const { status, year, month } = req.query;

    if (!isValidUUID(lease_id))
      return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('lease_id', lease_id)
      .eq('organization_id', req.orgId)
      .order('due_date', { ascending: false });

    if (status) query = query.eq('status', status);
    if (year)
      query = query
        .gte('due_date', `${year}-01-01`)
        .lte('due_date', `${year}-12-31`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    logger.error('[InvoiceRoutes] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/invoices/generate
 * Gera boletos para uma locação e cria no Asaas com Split
 */
router.post('/generate', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id, start_month, months = 12 } = req.body;

    if (!isValidUUID(lease_id))
      return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();

    // Busca o Lease e os dados do proprietário
    const { data: lease } = await supabase
      .from('rental_contracts')
      .select(
        `
        *,
        property:property_id (
          title,
          owner_id
        )
      `
      )
      .eq('id', lease_id)
      .eq('organization_id', req.orgId)
      .single();

    if (!lease)
      return res.status(404).json({ error: 'Locação não encontrada' });
    if (!lease.due_day)
      return res
        .status(400)
        .json({ error: 'Dia de vencimento não configurado' });

    // Busca o Owner Wallet (para o split de pagamentos)
    let ownerWalletId = null;
    let imobzyFeePercentage = lease.administration_fee_percentage || 10;

    if (lease.property?.owner_id) {
      const { data: owner } = await supabase
        .from('contacts') // Assumindo que proprietários ficam em contacts
        .select('asaas_wallet_id')
        .eq('id', lease.property.owner_id)
        .single();

      if (owner?.asaas_wallet_id) {
        ownerWalletId = owner.asaas_wallet_id;
      }
    }

    // Cria/Busca o Locatário no Asaas
    let asaasCustomerId = lease.asaas_customer_id;
    if (!asaasCustomerId) {
      try {
        asaasCustomerId = await AsaasService.getOrCreateCustomer({
          tenant_name: lease.tenant_name,
          tenant_cpf: lease.tenant_cpf,
          tenant_email: lease.tenant_email,
          tenant_phone: lease.tenant_phone,
        });

        // Salva o Customer ID no contrato para não criar duplicado
        if (asaasCustomerId) {
          await supabase
            .from('rental_contracts')
            .update({ asaas_customer_id: asaasCustomerId })
            .eq('id', lease.id);
        }
      } catch (err) {
        logger.warn(
          '[InvoiceRoutes] Falha ao criar cliente Asaas, faturas serão locais:',
          err.message
        );
      }
    }

    const startDate = start_month ? new Date(start_month) : new Date();
    const generated = [];

    for (let i = 0; i < months; i++) {
      const dueDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        lease.due_day
      );
      const refMonth = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        1
      );

      const total =
        (lease.monthly_rent || 0) +
        (lease.condominium_fee || 0) +
        (lease.iptu_amount || 0);

      const invoiceNumber = `${lease.contract_number || lease_id.substring(0, 8)}-${String(i + 1).padStart(3, '0')}`;
      const description = `Aluguel Ref: ${String(refMonth.getMonth() + 1).padStart(2, '0')}/${refMonth.getFullYear()} - Imóvel: ${lease.property?.title || 'Não informado'}`;

      let asaasCharge = null;
      if (asaasCustomerId && process.env.ASAAS_API_KEY) {
        try {
          // Cria no Asaas com Split!
          asaasCharge = await AsaasService.createChargeWithSplit({
            customer: asaasCustomerId,
            value: total,
            dueDate: dueDate.toISOString().split('T')[0],
            description,
            ownerWalletId,
            imobzyFeePercentage,
          });
        } catch (err) {
          logger.error(
            '[InvoiceRoutes] Erro ao criar fatura no Asaas:',
            err.message
          );
        }
      }

      const { data: invoice } = await supabase
        .from('invoices')
        .insert({
          lease_id,
          organization_id: req.orgId,
          invoice_number: invoiceNumber,
          due_date: dueDate.toISOString().split('T')[0],
          reference_month: refMonth.toISOString().split('T')[0],
          amount: total,
          rent_amount: lease.monthly_rent || 0,
          condominium_amount: lease.condominium_fee || 0,
          iptu_amount: lease.iptu_amount || 0,
          total,
          status: 'pendente',
          // Campos do Asaas
          gateway_id: asaasCharge?.id || null,
          invoice_url: asaasCharge?.invoiceUrl || null,
          bank_slip_url: asaasCharge?.bankSlipUrl || null,
          pix_copy_paste: asaasCharge?.pixCopyPaste || null,
        })
        .select()
        .single();

      if (invoice) generated.push(invoice);
    }

    res
      .status(201)
      .json({ success: true, data: generated, count: generated.length });
  } catch (error) {
    logger.error('[InvoiceRoutes] Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/locacao/invoices/:id/pay
 * Pagamento Manual (Caso não venha pelo Webhook)
 */
router.put('/:id/pay', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, payment_method, paid_amount, payment_proof_url } =
      req.body;

    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'pago',
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment_method || 'manual',
        paid_amount: paid_amount,
        payment_proof_url,
      })
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Boleto não encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[InvoiceRoutes] Pay error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/invoices/webhook/asaas
 * Recebe notificações do Asaas e da baixa automática nas faturas
 */
router.post('/webhook/asaas', async (req, res) => {
  try {
    // Validação de token de segurança opcional
    // const { 'asaas-access-token': asaasToken } = req.headers;

    const payload = req.body;
    const updateData = await AsaasService.handleWebhook(payload);

    if (updateData && updateData.status && updateData.asaasChargeId) {
      const supabase = getSupabaseServer();

      const updates = { status: updateData.status };
      if (updateData.status === 'pago') {
        updates.payment_date = updateData.paymentDate;
        updates.paid_amount = updateData.paidAmount;
        updates.payment_method = 'asaas';
      }

      await supabase
        .from('invoices')
        .update(updates)
        .eq('gateway_id', updateData.asaasChargeId);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('[InvoiceRoutes] Webhook Asaas Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
