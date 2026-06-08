import { Router } from 'express';
import { verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  importBuildingTypologies,
  isOruloConfigured,
  markRemovedBuildings,
  syncActiveBuildings,
} from '../../services/oruloService.js';

const router = Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

function defaultUpdatedAfter() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} 00:00:00`;
}

function handleError(res, error) {
  console.error('[Orulo] Erro:', error);
  return res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Erro ao processar integração com a Órulo.',
  });
}

router.get('/status', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const { count: pendingCount } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', req.orgId)
      .eq('source', 'orulo')
      .eq('status', 'Pendente');

    res.json({
      success: true,
      configured: isOruloConfigured(),
      pendingCount: pendingCount || 0,
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/sync', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const updatedAfter = req.body?.updated_after || defaultUpdatedAfter();
    const maxBuildings = Math.min(Number(req.body?.max_buildings || 25), 100);
    const result = await syncActiveBuildings({
      supabase,
      organizationId: req.orgId,
      updatedAfter,
      maxBuildings,
    });

    if (req.body?.sync_removed !== false) {
      result.removed = await markRemovedBuildings({
        supabase,
        organizationId: req.orgId,
        updatedAfter,
      });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/buildings/:buildingId/import', verifyAdmin, requireTenant, async (req, res) => {
  try {
    const result = await importBuildingTypologies({
      supabase,
      organizationId: req.orgId,
      buildingId: req.params.buildingId,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
