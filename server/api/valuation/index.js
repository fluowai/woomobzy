import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { ValuationService } from '../../services/valuationService.js';

import { isValidUUID } from '../../lib/shared-utils.js';

const router = Router();

router.post(
  '/estimate/:propertyId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { propertyId } = req.params;
      if (!isValidUUID(propertyId)) {
        return res.status(400).json({ error: 'ID de propriedade invalido' });
      }

      const valuation = await ValuationService.estimateValue(
        propertyId,
        req.orgId,
        req.user.id
      );
      res.json({ success: true, valuation });
    } catch (error) {
      console.error('[Valuation] Estimate error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/history/:propertyId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { propertyId } = req.params;
      if (!isValidUUID(propertyId)) {
        return res.status(400).json({ error: 'ID de propriedade invalido' });
      }

      const history = await ValuationService.getValuationHistory(
        propertyId,
        req.orgId
      );
      res.json({ success: true, history });
    } catch (error) {
      console.error('[Valuation] History error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/comparables/:propertyId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { propertyId } = req.params;
      if (!isValidUUID(propertyId)) {
        return res.status(400).json({ error: 'ID de propriedade invalido' });
      }

      const comparables = await ValuationService.getComparables(
        propertyId,
        req.orgId
      );
      res.json({ success: true, comparables });
    } catch (error) {
      console.error('[Valuation] Comparables error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/rules', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data: rules } = await supabase
      .from('valuation_rules')
      .select('*')
      .is('is_active', true)
      .or(`organization_id.is.null,organization_id.eq.${req.orgId}`)
      .order('priority', { ascending: false });

    res.json({ success: true, rules: rules || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
