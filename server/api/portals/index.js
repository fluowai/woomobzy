import { Router } from 'express';
import { verifyAdmin, verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  publishToPortal,
  unpublishFromPortal,
  getPortalPublishStatus,
  listPortalNames,
  isPortalConfigured,
  getPortalService,
} from '../../services/portalService.js';

const router = Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const portals = listPortalNames();
    const { data: configs } = await supabase
      .from('portal_integrations')
      .select('*')
      .eq('organization_id', req.orgId);

    const configMap = {};
    for (const c of configs || []) {
      configMap[c.portal] = { enabled: c.enabled, configured: isPortalConfigured(c.config) };
    }

    const result = portals.map((name) => ({
      name,
      label: getPortalLabel(name),
      enabled: configMap[name]?.enabled || false,
      configured: configMap[name]?.configured || false,
    }));

    res.json({ success: true, portals: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:portal/config', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { data } = await supabase
      .from('portal_integrations')
      .select('*')
      .eq('organization_id', req.orgId)
      .eq('portal', req.params.portal)
      .maybeSingle();

    res.json({
      success: true,
      config: data ? { enabled: data.enabled, ...maskSensitive(data.config) } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:portal/config', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { enabled, ...config } = req.body;

    const existing = await supabase
      .from('portal_integrations')
      .select('id')
      .eq('organization_id', req.orgId)
      .eq('portal', req.params.portal)
      .maybeSingle();

    const payload = {
      organization_id: req.orgId,
      portal: req.params.portal,
      enabled: enabled !== false,
      config,
    };

    if (existing.data?.id) {
      await supabase
        .from('portal_integrations')
        .update(payload)
        .eq('id', existing.data.id);
    } else {
      await supabase
        .from('portal_integrations')
        .insert(payload);
    }

    res.json({ success: true, message: `Configuração do portal ${req.params.portal} salva.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:portal/publish/:propertyId', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { portal, propertyId } = req.params;
    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !property) {
      return res.status(404).json({ error: 'Imóvel não encontrado.' });
    }

    const result = await publishToPortal({
      supabase,
      organizationId: req.orgId,
      property,
      portal,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/:portal/unpublish/:propertyId', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const result = await unpublishFromPortal({
      supabase,
      organizationId: req.orgId,
      propertyId: req.params.propertyId,
      portal: req.params.portal,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/:portal/status/:propertyId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const status = await getPortalPublishStatus({
      supabase,
      organizationId: req.orgId,
      propertyId: req.params.propertyId,
      portal: req.params.portal,
    });

    res.json({ success: true, status });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

function getPortalLabel(name) {
  const labels = {
    vivareal: 'VivaReal',
    zap: 'Zap Imóveis',
    quintoandar: 'QuintoAndar',
    imovelweb: 'ImovelWeb',
  };
  return labels[name] || name;
}

function maskSensitive(config) {
  const masked = { ...config };
  if (masked.apiKey) masked.apiKey = maskValue(masked.apiKey);
  if (masked.secret) masked.secret = maskValue(masked.secret);
  if (masked.clientSecret) masked.clientSecret = maskValue(masked.clientSecret);
  return masked;
}

function maskValue(val) {
  if (!val || val.length < 8) return '••••••••';
  return val.slice(0, 4) + '••••' + val.slice(-4);
}

export default router;
