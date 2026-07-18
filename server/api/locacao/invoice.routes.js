/**
 * Invoice Routes - Boletos e cobranças
 * /api/locacao/invoices
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

import { isValidUUID } from '../../lib/shared-utils.js';

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
    console.error('[InvoiceRoutes] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/invoices/generate
 * Gera boletos para uma locação
 */
router.post('/generate', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id, start_month, months = 12 } = req.body;

    if (!isValidUUID(lease_id))
      return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();

    const { data: lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', lease_id)
      .eq('organization_id', req.orgId)
      .single();

    if (!lease)
      return res.status(404).json({ error: 'Locação não encontrada' });
    if (!lease.due_day)
      return res
        .status(400)
        .json({ error: 'Dia de vencimento não configurado' });

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

      const invoiceNumber = `${lease.contract_number || lease_id}-${String(i + 1).padStart(3, '0')}`;

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
        })
        .select()
        .single();

      if (invoice) generated.push(invoice);
    }

    res
      .status(201)
      .json({ success: true, data: generated, count: generated.length });
  } catch (error) {
    console.error('[InvoiceRoutes] Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/locacao/invoices/:id/pay
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
        payment_method,
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
    console.error('[InvoiceRoutes] Pay error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
