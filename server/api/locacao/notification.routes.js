/**
 * Notification Worker Routes
 * /api/locacao/notifications
 */
import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { LeaseNotificationWorker } from '../../services/leaseNotificationWorker.js';

const router = Router();

/**
 * POST /api/locacao/notifications/run
 * Executa todas as verificações de notificação manualmente
 */
router.post('/run', verifyAuth, requireTenant, async (req, res) => {
  try {
    const results = await LeaseNotificationWorker.runAll(req.orgId);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[NotificationRoutes] Run error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/notifications/due-soon
 * Verifica boletos a vencer
 */
router.post('/due-soon', verifyAuth, requireTenant, async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 5;
    const results = await LeaseNotificationWorker.checkInvoicesDueSoon(req.orgId, days);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/notifications/overdue
 * Verifica boletos vencidos
 */
router.post('/overdue', verifyAuth, requireTenant, async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 1;
    const results = await LeaseNotificationWorker.checkOverdueInvoices(req.orgId, days);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/notifications/adjustments
 * Verifica reajustes próximos
 */
router.post('/adjustments', verifyAuth, requireTenant, async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 30;
    const results = await LeaseNotificationWorker.checkUpcomingAdjustments(req.orgId, days);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/notifications/expiring
 * Verifica contratos próximos do vencimento
 */
router.post('/expiring', verifyAuth, requireTenant, async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 30;
    const results = await LeaseNotificationWorker.checkContractsExpiringSoon(req.orgId, days);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locacao/notifications/cron
 * Endpoint para cron externo (cron-job.org, etc.)
 * Requer chave secreta para autenticação
 */
router.get('/cron', async (req, res) => {
  try {
    const cronKey = process.env.CRON_SECRET;
    if (cronKey && req.query.secret !== cronKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseServer();
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id');

    if (!orgs) return res.json({ success: true, data: [] });

    const allResults = [];
    for (const org of orgs) {
      const results = await LeaseNotificationWorker.runAll(org.id);
      allResults.push({ organization_id: org.id, ...results });
    }

    res.json({ success: true, data: allResults });
  } catch (error) {
    console.error('[NotificationRoutes] Cron error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
