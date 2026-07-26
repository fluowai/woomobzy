/**
 * /api/campaigns/blacklist
 * Gerenciamento de blacklist de telefones (proteção global)
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router();

const blacklistAddSchema = z.object({
  phone: z.string().min(10).max(20),
  reason: z.string().max(500).optional(),
});

const bulkBlacklistSchema = z.object({
  phones: z.array(z.string().min(10).max(20)).min(1).max(5000),
  reason: z.string().max(500).optional(),
});

// ─── GET /api/campaigns/blacklist ─── Listar blacklist
router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { phone, page = 1, limit = 50 } = req.query;
    const supabase = getSupabaseServer();

    let query = supabase
      .from('campaign_blacklist')
      .select('*', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false });

    if (phone) {
      query = query.ilike('phone', `%${phone}%`);
    }

    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ blacklist: data || [], total: count || 0 });
  } catch (err) {
    console.error('[Blacklist] Error listing:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/campaigns/blacklist ─── Adicionar à blacklist
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();

    // Accept single or bulk
    const payload = Array.isArray(req.body.phones)
      ? req.body
      : { phones: [req.body.phone], reason: req.body.reason };

    const parsed = bulkBlacklistSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }

    const rows = parsed.data.phones.map((phone) => ({
      organization_id: req.orgId,
      phone: normalizePhone(phone),
      reason: parsed.data.reason || null,
      added_by: req.user.id,
    }));

    // Upsert to avoid duplicates
    const { data, error } = await supabase
      .from('campaign_blacklist')
      .upsert(rows, { onConflict: 'organization_id,phone' })
      .select('id');

    if (error) throw error;
    res.status(201).json({ added: data?.length || 0 });
  } catch (err) {
    console.error('[Blacklist] Error adding:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/campaigns/blacklist/:id ─── Remover da blacklist
router.delete('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('campaign_blacklist')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Blacklist] Error deleting:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/campaigns/blacklist/bulk ─── Limpar toda a blacklist
router.delete('/bulk', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { count, error } = await supabase
      .from('campaign_blacklist')
      .delete({ count: 'exact' })
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ deleted: count || 0 });
  } catch (err) {
    console.error('[Blacklist] Error clearing:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return `+${digits}`;
  return `+55${digits}`;
}

export default router;
