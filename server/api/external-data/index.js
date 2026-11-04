import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { ExternalDataService } from '../../services/externalDataService.js';

const router = Router();

router.get('/municipio', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { city, state } = req.query;
    if (!city || !state) {
      return res.status(400).json({ error: 'city e state sao obrigatorios' });
    }

    const data = await ExternalDataService.getMunicipioData(city, state);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[ExternalData] Municipio error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/prices-cepea', verifyAuth, requireTenant, async (req, res) => {
  try {
    const data = await ExternalDataService.getCepeaPrices();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/enrich-property/:propertyId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = (await import('../../lib/supabase-server.js')).getSupabaseServer();
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', req.params.propertyId)
      .eq('organization_id', req.orgId)
      .single();

    if (!property) return res.status(404).json({ error: 'Property not found' });

    const enriched = await ExternalDataService.enrichPropertyData(property);
    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/refresh/:source', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { source } = req.params;
    const result = await ExternalDataService.forceRefresh(source);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
