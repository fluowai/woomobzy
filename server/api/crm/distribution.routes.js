/**
 * Lead Distribution API Routes
 * POST /api/crm/distribute - Distribute a single lead
 * POST /api/crm/bulk-distribute - Distribute multiple leads
 */

import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import {
  distributeLead,
  bulkDistributeLeads,
  DISTRIBUTION_STRATEGIES,
} from '../../services/leadDistributionService.js';

const router = Router();

/**
 * POST /api/crm/distribute
 * Distribute a single lead to a broker using the specified strategy.
 */
router.post('/distribute', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lead_id, strategy } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id é obrigatório' });
    }

    const validStrategy = Object.values(DISTRIBUTION_STRATEGIES).includes(
      strategy
    )
      ? strategy
      : DISTRIBUTION_STRATEGIES.BALANCED;

    const broker = await distributeLead(req.orgId, lead_id, validStrategy);

    if (!broker) {
      return res
        .status(404)
        .json({ error: 'Nenhum corretor disponível para distribuição' });
    }

    res.json({ success: true, broker, strategy: validStrategy });
  } catch (err) {
    console.error('[Distribution] Single distribute error:', err.message);
    res.status(500).json({ error: 'Erro ao distribuir lead' });
  }
});

/**
 * POST /api/crm/bulk-distribute
 * Distribute multiple leads using the specified strategy.
 */
router.post('/bulk-distribute', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lead_ids, strategy } = req.body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res
        .status(400)
        .json({ error: 'lead_ids deve ser um array não vazio' });
    }

    const validStrategy = Object.values(DISTRIBUTION_STRATEGIES).includes(
      strategy
    )
      ? strategy
      : DISTRIBUTION_STRATEGIES.BALANCED;

    const results = await bulkDistributeLeads(
      req.orgId,
      lead_ids,
      validStrategy
    );

    res.json({
      success: true,
      results,
      strategy: validStrategy,
      distributed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (err) {
    console.error('[Distribution] Bulk distribute error:', err.message);
    res.status(500).json({ error: 'Erro ao distribuir leads em massa' });
  }
});

/**
 * GET /api/crm/distribution-strategies
 * List available distribution strategies.
 */
router.get(
  '/distribution-strategies',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    res.json({
      success: true,
      strategies: Object.entries(DISTRIBUTION_STRATEGIES).map(
        ([key, value]) => ({
          key,
          value,
          label: {
            ROUND_ROBIN: 'Rodízio Sequencial',
            BALANCED: 'Balanceado (menos leads)',
            GEOGRAPHIC: 'Geográfico',
            PERFORMANCE: 'Por Performance',
          }[key],
        })
      ),
    });
  }
);

export default router;
