/**
 * Broker Performance Report Routes
 * /api/crm/reports
 */

import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getBrokerPerformance, getBrokerRanking, getPipelineSummary } from '../../services/brokerReportService.js';

const router = Router();

/**
 * GET /api/crm/reports/pipeline
 * Get pipeline summary for the organization.
 */
router.get('/pipeline', verifyAuth, requireTenant, async (req, res) => {
  try {
    const summary = await getPipelineSummary(req.orgId);
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('[Reports] Pipeline error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar pipeline' });
  }
});

/**
 * GET /api/crm/reports/ranking
 * Get broker ranking (all brokers performance comparison).
 */
router.get('/ranking', verifyAuth, requireTenant, async (req, res) => {
  try {
    const dateRange = {
      startDate: req.query.start_date || undefined,
      endDate: req.query.end_date || undefined,
    };

    const ranking = await getBrokerRanking(req.orgId, dateRange);
    res.json({ success: true, ranking });
  } catch (err) {
    console.error('[Reports] Ranking error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

/**
 * GET /api/crm/reports/broker/:brokerId
 * Get detailed performance report for a specific broker.
 */
router.get('/broker/:brokerId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const dateRange = {
      startDate: req.query.start_date || undefined,
      endDate: req.query.end_date || undefined,
    };

    const report = await getBrokerPerformance(req.orgId, req.params.brokerId, dateRange);
    res.json({ success: true, report });
  } catch (err) {
    console.error('[Reports] Broker performance error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar relatorio do corretor' });
  }
});

export default router;
