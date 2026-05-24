import { Router } from 'express';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requireEnvironment } from '../../middleware/environment.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();

const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

router.use(verifyAuth, requireTenant, requireEnvironment);

/**
 * GET /api/properties
 */
router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // 1. Buscar o nicho da organização para saber o que filtrar
    const { data: org } = await supabase
      .from('organizations')
      .select('niche')
      .eq('id', req.orgId)
      .single();

    const niche = org?.niche || 'traditional';

    // 2. Definir as listas de tipos permitidos (SQL Separation)
    const URBAN_TYPES = [
      'Apartamento', 'Casa', 'Sobrado', 'Terreno Urbano', 
      'Sala Comercial', 'Galpão Industrial', 'Loft', 'Studio', 'Cobertura'
    ];
    
    const RURAL_TYPES = [
      'Fazenda', 'Sítio', 'Chácara', 'Estância', 'Haras', 'Granja', 
      'Agropecuária', 'Terreno Rural', 'Gleba', 'Lote Rural', 'Área Produtiva'
    ];

    // 3. Montar a query com o filtro de nicho
    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .eq('environment_id', req.environment.id);

    // Se o cliente pediu um nicho específico via query string, usamos ele
    // Caso contrário, usamos o nicho da organização
    const filterNiche = req.query.niche || (req.environment.type === 'rural' ? 'rural' : 'urbano') || niche;

    if (filterNiche === 'rural') {
      // Tenta filtrar pela coluna 'niche' ou pelos tipos rurais como fallback
      query = query.or(`niche.eq.rural,property_type.in.(${RURAL_TYPES.map(t => `"${t}"`).join(',')})`);
    } else if (filterNiche === 'urbano') {
      query = query.or(`niche.eq.urbano,property_type.in.(${URBAN_TYPES.map(t => `"${t}"`).join(',')})`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ 
      success: true, 
      properties: data,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/properties
 */
router.post('/', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const propertyData = req.body;
    delete propertyData.organization_id;
    delete propertyData.environment_id;

    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        organization_id: req.orgId,
        environment_id: req.environment.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, property: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/properties/:id
 */
router.put('/:id', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const propertyData = req.body;

    delete propertyData.organization_id;
    delete propertyData.environment_id;
    delete propertyData.id;

    const { data, error } = await supabase
      .from('properties')
      .update(propertyData)
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .eq('environment_id', req.environment.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Imóvel não encontrado' });

    res.json({ success: true, property: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/properties/:id
 */
router.get('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .eq('environment_id', req.environment.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Imóvel não encontrado' });
    res.json({ success: true, property: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/properties/:id
 */
router.delete('/:id', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .eq('environment_id', req.environment.id);

    if (error) throw error;
    res.json({ success: true, message: 'Imóvel excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
