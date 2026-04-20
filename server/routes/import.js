import express from 'express';
import { verifySuperAdmin } from '../middleware/auth.js';
import { extractProperties } from '../services/siteCloner.js';
import { runScraperScrapeOnly } from '../services/scraperService.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const router = express.Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });


// Analyze site for properties (Admin)
router.post('/admin/analyze', verifySuperAdmin, async (req, res) => {
  const { url, organizationId } = req.body;
  if (!url || !organizationId) return res.status(400).json({ error: 'URL and Organization ID are required' });
  
  try {
    const properties = await extractProperties(url, organizationId);
    res.json({ success: true, properties });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze site for properties (Public / Onboarding Wizard)
router.post('/analyze', async (req, res) => {
  const { url, organizationId } = req.body;
  if (!url || !organizationId) return res.status(400).json({ error: 'URL and Organization ID are required' });
  
  try {
    const isFazendasBrasil = url.includes('fazendasbrasil.com.br');
    let properties;
    if (isFazendasBrasil) {
      properties = await runScraperScrapeOnly(url, organizationId);
    } else {
      properties = await extractProperties(url, organizationId);
    }
    res.json({ success: true, properties });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalize Import (Bulk Save) - SuperAdmin
router.post('/admin/finalize', verifySuperAdmin, async (req, res) => {
  const { properties, organizationId } = req.body;
  if (!properties || !organizationId) return res.status(400).json({ error: 'Data and Organization ID are required' });
  
  try {
    const formattedProperties = properties.map(p => ({
      organization_id: organizationId,
      title: p.title,
      description: p.description,
      price: p.price,
      property_type: (p.type === 'Rural' || p.type === 'Fazenda') ? 'Fazenda' : 'Casa',
      status: 'Disponível',
      purpose: 'Venda',
      location_city: p.city || p.location?.split(',')[0]?.trim() || 'Importado',
      location_state: p.state || p.location?.split(',')[1]?.trim() || 'BR',
      images: p.images,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('properties')
      .upsert(formattedProperties, { onConflict: 'title' })
      .select();

    if (error) throw error;
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalize Import (Bulk Save) - Public / Onboarding
router.post('/finalize', async (req, res) => {
  const { properties, organizationId } = req.body;
  if (!properties || !organizationId) return res.status(400).json({ error: 'Data and Organization ID are required' });
  
  try {
    const formattedProperties = properties.map(p => ({
      organization_id: organizationId,
      title: p.title,
      description: p.description,
      price: p.price,
      property_type: p.type === 'Rural' ? 'Fazenda' : 'Casa',
      status: 'Disponível',
      purpose: 'Venda',
      location_city: p.city || p.location?.split(',')[0]?.trim() || 'Importado',
      location_state: p.state || p.location?.split(',')[1]?.trim() || 'BR',
      images: p.images,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('properties')
      .upsert(formattedProperties, { onConflict: 'title' })
      .select();

    if (error) throw error;
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
