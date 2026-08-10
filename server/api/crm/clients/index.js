import { Router } from 'express';
import { verifyAuth } from '../../../middleware/auth.js';
import { requireTenant } from '../../../middleware/tenant.js';
import { getSupabaseServer } from '../../../lib/supabase-server.js';

const router = Router();

router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { search, roles } = req.query;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const supabase = getSupabaseServer();
    let query = supabase
      .from('clients')
      .select(
        'id, name, email, phone, document_number, document_type, roles, address_city, address_state, address_street, address_neighborhood, address_zip, notes, created_at',
        { count: 'exact' }
      )
      .eq('organization_id', req.orgId)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `name.ilike.${term},email.ilike.${term},phone.ilike.${term}`
      );
    }

    const { data, error, count } = await query;
    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('does not exist')
      ) {
        return res.json({
          success: true,
          clients: [],
          migration_required: true,
        });
      }
      throw error;
    }

    let clients = (data || []).map((client) => ({
      id: client.id,
      name: client.name || client.email?.split('@')[0] || 'Sem nome',
      email: client.email || '',
      phone: client.phone || '',
      document_number: client.document_number || '',
      document_type: client.document_type || 'CPF',
      roles: client.roles || ['Cliente'],
      city: client.address_city || '',
      state: client.address_state || '',
      address: client.address_street || '',
      neighborhood: client.address_neighborhood || '',
      zip_code: client.address_zip || '',
      notes: client.notes || '',
      created_at: client.created_at,
    }));

    if (roles) {
      const filterRoles = roles.split(',').map((r) => r.trim().toLowerCase());
      clients = clients.filter((c) =>
        c.roles.some((r) => filterRoles.includes(r.toLowerCase()))
      );
    }

    const total = typeof count === 'number' ? count : clients.length;
    res.json({
      success: true,
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      document_number,
      document_type,
      roles,
      city,
      state,
      address,
      neighborhood,
      zip_code,
      notes,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('clients')
      .insert({
        organization_id: req.orgId,
        name,
        email,
        phone,
        document_number,
        document_type: document_type || 'CPF',
        roles: roles || ['Cliente'],
        address_city: city,
        address_state: state,
        address_street: address,
        address_neighborhood: neighborhood,
        address_zip: zip_code,
        notes,
      })
      .select()
      .single();

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('does not exist')
      ) {
        return res.status(503).json({
          error:
            'Tabela clients não existe. Execute a migration 20260728_fix_backend_errors.sql no Supabase.',
          migration_required: true,
        });
      }
      throw error;
    }
    res.status(201).json({ success: true, client: data });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { city, state, address, neighborhood, zip_code, ...restUpdates } =
      req.body;

    const dbUpdates = { ...restUpdates };
    if (city !== undefined) dbUpdates.address_city = city;
    if (state !== undefined) dbUpdates.address_state = state;
    if (address !== undefined) dbUpdates.address_street = address;
    if (neighborhood !== undefined)
      dbUpdates.address_neighborhood = neighborhood;
    if (zip_code !== undefined) dbUpdates.address_zip = zip_code;

    delete dbUpdates.id;
    delete dbUpdates.organization_id;

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('clients')
      .update(dbUpdates)
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
      .from('clients')
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
