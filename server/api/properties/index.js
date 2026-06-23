import { Router } from 'express';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { enrichPropertyWithAcp } from '../../services/acpPropertyAgent.js';
import { importXmlProperties, parseXmlProperties, fetchXmlFromUrl } from '../../services/xmlPropertyImportService.js';
import {
  applyRuralFilter,
  applyUrbanFilter,
  isRuralType,
  isUrbanType,
  normalizeNiche,
} from '../../utils/propertyNiche.js';

const router = Router();

const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

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

    const niche = normalizeNiche(org?.niche) || 'urbano';

    // 2. Montar a query com o filtro de nicho
    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('organization_id', req.orgId);

    // Se o cliente pediu um nicho específico via query string, usamos ele
    // Caso contrário, usamos o nicho da organização
    const filterNiche = normalizeNiche(req.query.niche) || niche;

    if (filterNiche === 'rural') {
      query = applyRuralFilter(query);
    } else if (filterNiche === 'urbano') {
      query = applyUrbanFilter(query);
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
    const explicitNiche = normalizeNiche(propertyData.niche);
    const inferredNiche = isRuralType(propertyData.property_type)
      ? 'rural'
      : isUrbanType(propertyData.property_type)
        ? 'urbano'
        : '';
    
    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        niche: explicitNiche || inferredNiche || propertyData.niche || null,
        organization_id: req.orgId // FORÇADO
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
 * POST /api/properties/import/xml/preview
 * Recebe { url } ou { xml } e retorna uma prévia normalizada sem gravar no banco.
 */
router.post('/import/xml/preview', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { url, xml, sourceName } = req.body || {};
    if (!url && !xml) {
      return res.status(400).json({ error: 'Informe url ou xml para pré-visualizar a importação.' });
    }

    const xmlContent = xml || await fetchXmlFromUrl(url);
    const parsed = parseXmlProperties(xmlContent, { sourceName });

    res.json({
      success: true,
      source: parsed.source,
      totalFound: parsed.totalFound,
      valid: parsed.properties.length,
      warnings: parsed.warnings,
      preview: parsed.properties.slice(0, 10),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/properties/import/xml
 * Recebe { url } ou { xml } e faz upsert no catálogo oficial de imóveis.
 */
router.post('/import/xml', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { url, xml, sourceName, dryRun = false } = req.body || {};
    if (!url && !xml) {
      return res.status(400).json({ error: 'Informe url ou xml para importar imóveis.' });
    }

    const result = await importXmlProperties({
      supabase,
      organizationId: req.orgId,
      url,
      xml,
      sourceName,
      dryRun: Boolean(dryRun),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    delete propertyData.id;

    const { data, error } = await supabase
      .from('properties')
      .update(propertyData)
      .eq('id', id)
      .eq('organization_id', req.orgId)
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
      .single();

    if (error || !data) return res.status(404).json({ error: 'Imóvel não encontrado' });
    res.json({ success: true, property: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/properties/:id/acp
 */
router.post('/:id/acp', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { data: property, error: loadError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .single();

    if (loadError || !property) {
      return res.status(404).json({ error: 'Imovel nao encontrado' });
    }

    const enriched = await enrichPropertyWithAcp({
      supabase,
      organizationId: req.orgId,
      property,
    });

    const { data, error } = await supabase
      .from('properties')
      .update({ features: enriched.features })
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, property: data, acp: data.features?.acp || null });
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
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ success: true, message: 'Imóvel excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
