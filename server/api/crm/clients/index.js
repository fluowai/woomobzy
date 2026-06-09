import { Router } from 'express';
import { verifyAuth } from '../../../middleware/auth.js';
import { requireTenant } from '../../../middleware/tenant.js';
import { getSupabaseServer } from '../../../lib/supabase-server.js';

const router = Router();

router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { search, roles } = req.query;
    const supabase = getSupabaseServer();
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', req.orgId)
      .order('name', { ascending: true });

    if (search) {
      const term = `%${search}%`;
      query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let clients = (data || []).map((profile) => ({
      id: profile.id,
      name: profile.name || profile.email?.split('@')[0] || 'Sem nome',
      email: profile.email || '',
      phone: profile.phone || '',
      document_number: profile.document_number || '',
      document_type: profile.document_type || 'CPF',
      roles: profile.roles || ['Cliente'],
      city: profile.city || '',
      state: profile.state || '',
      address: profile.address || '',
      neighborhood: profile.neighborhood || '',
      zip_code: profile.zip_code || '',
      notes: profile.notes || '',
      created_at: profile.created_at,
    }));

    if (roles) {
      const filterRoles = roles.split(',').map((r) => r.trim().toLowerCase());
      clients = clients.filter((c) =>
        c.roles.some((r) => filterRoles.includes(r.toLowerCase()))
      );
    }

    res.json({ success: true, clients });
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { name, email, phone, document_number, document_type, roles, city, state, address, neighborhood, zip_code, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        organization_id: req.orgId,
        name,
        email,
        phone,
        document_number,
        document_type: document_type || 'CPF',
        roles: roles || ['Cliente'],
        city,
        state,
        address,
        neighborhood,
        zip_code,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, client: data });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.id;
    delete updates.organization_id;

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json({ success: true, client: data });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ success: true, message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
