/**
 * /api/campaigns/:campaignId/contacts
 * Gerenciamento de contatos da campanha (CSV, manual, busca)
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router({ mergeParams: true });

const contactCreateSchema = z.object({
  phone: z.string().min(10).max(20),
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  email: z.string().email().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const bulkContactsSchema = z.object({
  contacts: z.array(contactCreateSchema).min(1).max(5000),
});

// ─── POST /api/campaigns/:campaignId/contacts ─── Adicionar contatos (manual ou bulk)
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const supabase = getSupabaseServer();

    // Verify campaign exists and belongs to org
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (!campaign)
      return res.status(404).json({ error: 'Campanha não encontrada' });
    if (!['draft', 'paused'].includes(campaign.status)) {
      return res
        .status(400)
        .json({
          error:
            'Só é possível adicionar contatos em campanhas draft ou pausadas',
        });
    }

    // Accept single or bulk
    const payload = Array.isArray(req.body.contacts)
      ? req.body
      : { contacts: [req.body] };

    const parsed = bulkContactsSchema.safeParse(payload);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }

    // Normalize phones: strip non-digits, ensure +55 prefix
    const contacts = parsed.data.contacts.map((c) => ({
      campaign_id: campaignId,
      phone: normalizePhone(c.phone),
      name: c.name || null,
      company: c.company || null,
      email: c.email || null,
      metadata: c.metadata || {},
      status: 'pending',
    }));

    // Filter out duplicates (phone already in campaign)
    const { data: existing } = await supabase
      .from('campaign_contacts')
      .select('phone')
      .eq('campaign_id', campaignId);

    const existingPhones = new Set((existing || []).map((e) => e.phone));
    const uniqueContacts = contacts.filter((c) => !existingPhones.has(c.phone));

    if (uniqueContacts.length === 0) {
      return res
        .status(409)
        .json({ error: 'Todos os contatos já existem na campanha', added: 0 });
    }

    // Batch insert (Supabase handles large inserts well up to ~1000 rows at a time)
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < uniqueContacts.length; i += BATCH_SIZE) {
      const batch = uniqueContacts.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('campaign_contacts')
        .insert(batch)
        .select('id');

      if (error) throw error;
      inserted += data?.length || 0;
    }

    res
      .status(201)
      .json({ added: inserted, skipped: contacts.length - inserted });
  } catch (err) {
    console.error('[CampaignContacts] Error adding:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/campaigns/:campaignId/contacts ─── Listar contatos
router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status, page = 1, limit = 50, search } = req.query;

    const supabase = getSupabaseServer();
    let query = supabase
      .from('campaign_contacts')
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,company.ilike.%${search}%`
      );
    }

    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ contacts: data || [], total: count || 0 });
  } catch (err) {
    console.error('[CampaignContacts] Error listing:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/campaigns/:campaignId/contacts/:contactId ─── Remover contato
router.delete('/:contactId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { campaignId, contactId } = req.params;
    const supabase = getSupabaseServer();

    // Check campaign status
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (!campaign)
      return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status === 'running') {
      return res
        .status(400)
        .json({ error: 'Pare a campanha antes de remover contatos' });
    }

    const { error } = await supabase
      .from('campaign_contacts')
      .delete()
      .eq('id', contactId)
      .eq('campaign_id', campaignId);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error('[CampaignContacts] Error deleting:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/campaigns/:campaignId/contacts/bulk ─── Remover contatos por status
router.delete('/bulk', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.body;

    if (
      !status ||
      !['pending', 'failed', 'sent', 'blacklisted'].includes(status)
    ) {
      return res
        .status(400)
        .json({
          error: 'status inválido. Use: pending, failed, sent, blacklisted',
        });
    }

    const supabase = getSupabaseServer();

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (!campaign)
      return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status === 'running') {
      return res
        .status(400)
        .json({ error: 'Pare a campanha antes de remover contatos' });
    }

    const { count, error } = await supabase
      .from('campaign_contacts')
      .delete({ count: 'exact' })
      .eq('campaign_id', campaignId)
      .eq('status', status);

    if (error) throw error;
    res.json({ deleted: count || 0 });
  } catch (err) {
    console.error('[CampaignContacts] Error bulk deleting:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/campaigns/:campaignId/contacts/import-serper ─── Importar resultados do Serper cache
router.post('/import-serper', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { cache_ids } = req.body;

    if (!Array.isArray(cache_ids) || cache_ids.length === 0) {
      return res.status(400).json({ error: 'cache_ids array obrigatório' });
    }

    const supabase = getSupabaseServer();

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (!campaign)
      return res.status(404).json({ error: 'Campanha não encontrada' });
    if (!['draft', 'paused'].includes(campaign.status)) {
      return res
        .status(400)
        .json({
          error: 'Só é possível importar em campanhas draft ou pausadas',
        });
    }

    // Fetch cached Serper results
    const { data: cached } = await supabase
      .from('campaign_serper_cache')
      .select('*')
      .in('id', cache_ids)
      .eq('organization_id', req.orgId);

    if (!cached?.length) {
      return res
        .status(404)
        .json({ error: 'Nenhum resultado cacheado encontrado' });
    }

    // Filter only those with valid phones
    const contactsWithPhone = cached.filter(
      (c) => c.phone && c.phone.length >= 10
    );

    if (contactsWithPhone.length === 0) {
      return res
        .status(400)
        .json({ error: 'Nenhum resultado possui telefone válido' });
    }

    // Check existing phones
    const { data: existing } = await supabase
      .from('campaign_contacts')
      .select('phone')
      .eq('campaign_id', campaignId);

    const existingPhones = new Set((existing || []).map((e) => e.phone));

    const newContacts = contactsWithPhone
      .filter((c) => !existingPhones.has(c.phone))
      .map((c) => ({
        campaign_id: campaignId,
        phone: normalizePhone(c.phone),
        name: c.name || null,
        company: c.company || null,
        email: null,
        metadata: {
          serper_id: c.id,
          address: c.address,
          website: c.website,
          rating: c.rating,
          reviews: c.reviews,
          category: c.category,
          source: 'serper',
        },
        status: 'pending',
      }));

    if (newContacts.length === 0) {
      return res
        .status(409)
        .json({ error: 'Todos os contatos já existem na campanha', added: 0 });
    }

    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < newContacts.length; i += BATCH_SIZE) {
      const batch = newContacts.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('campaign_contacts')
        .insert(batch)
        .select('id');

      if (error) throw error;
      inserted += data?.length || 0;
    }

    res
      .status(201)
      .json({ added: inserted, skipped: contactsWithPhone.length - inserted });
  } catch (err) {
    console.error('[CampaignContacts] Error importing serper:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return `+${digits}`;
  return `+55${digits}`;
}

export default router;
