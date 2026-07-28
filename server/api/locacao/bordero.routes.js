/**
 * Bordero Routes - Gestão de Repasses (Locação)
 * /api/locacao/bordero
 */
import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

import { isValidUUID } from '../../lib/shared-utils.js';

const router = Router();

/**
 * GET /api/locacao/bordero
 * Gera o espelho do borderô para um determinado mês e contrato
 */
router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id, year, month } = req.query;

    if (!lease_id || !year || !month) {
      return res
        .status(400)
        .json({
          error: 'Faltam parâmetros obrigatórios (lease_id, year, month)',
        });
    }

    if (!isValidUUID(lease_id)) {
      return res.status(400).json({ error: 'ID do contrato inválido' });
    }

    const supabase = getSupabaseServer();

    // Buscar contrato e proprietário
    const { data: lease, error: leaseError } = await supabase
      .from('rental_contracts')
      .select(
        `
        *,
        property:property_id(title, owner_id)
      `
      )
      .eq('id', lease_id)
      .eq('organization_id', req.orgId)
      .single();

    if (leaseError || !lease) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Buscar faturas recebidas (pagas) no mês de referência
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('lease_id', lease_id)
      .eq('organization_id', req.orgId)
      .eq('status', 'pago') // Borderô só fecha quando pago
      .gte('reference_month', `${year}-${String(month).padStart(2, '0')}-01`)
      .lte('reference_month', `${year}-${String(month).padStart(2, '0')}-31`);

    if (invError) throw invError;

    // Calcula os valores do repasse (Split logic display)
    let totalPaid = 0;
    let totalAdministrationFee = 0;
    let totalToRepass = 0;

    const items = (invoices || []).map((inv) => {
      const amount = inv.paid_amount || inv.amount;
      const adminFeePerc = lease.administration_fee_percentage || 10;

      const adminFee = amount * (adminFeePerc / 100);
      // Aqui pode-se adicionar IPTU e Condomínio caso sejam repassados integralmente
      const repassValue = amount - adminFee;

      totalPaid += amount;
      totalAdministrationFee += adminFee;
      totalToRepass += repassValue;

      return {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        payment_date: inv.payment_date,
        amount_paid: amount,
        admin_fee: adminFee,
        repass_value: repassValue,
      };
    });

    const bordero = {
      lease_id: lease.id,
      tenant_name: lease.tenant_name,
      property_title: lease.property?.title || '',
      reference: `${String(month).padStart(2, '0')}/${year}`,
      total_paid: totalPaid,
      total_administration_fee: totalAdministrationFee,
      total_to_repass: totalToRepass,
      items,
      // Se usar o Asaas, o repasse já foi pro ownerWalletId, este borderô serve como extrato
      split_status: lease.property?.owner_id
        ? 'AUTOMATICO_ASAAS'
        : 'REPASSE_MANUAL',
    };

    res.json({ success: true, data: bordero });
  } catch (error) {
    console.error('[BorderoRoutes] Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
