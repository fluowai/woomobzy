/**
 * Email Drip Campaign Routes
 * /api/crm/drip
 */

import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import {
  startDripCampaign,
  cancelDripCampaigns,
  getLeadDripCampaigns,
  DRIP_TEMPLATES,
} from '../../services/emailDripService.js';

const router = Router();

/**
 * GET /api/crm/drip/templates
 * List available drip campaign templates.
 */
router.get('/templates', verifyAuth, requireTenant, async (req, res) => {
  try {
    const templates = Object.entries(DRIP_TEMPLATES).map(([key, template]) => ({
      key,
      name: template.name,
      steps: template.steps.length,
      durationHours: Math.max(...template.steps.map((s) => s.delayHours)),
    }));
    res.json({ success: true, templates });
  } catch (err) {
    console.error('[Drip] Templates error:', err.message);
    res.status(500).json({ error: 'Erro ao listar templates' });
  }
});

/**
 * POST /api/crm/drip/start
 * Start a drip campaign for a lead.
 */
router.post('/start', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lead_id, template_key, lead_data } = req.body;

    if (!lead_id || !template_key) {
      return res
        .status(400)
        .json({ error: 'lead_id e template_key são obrigatórios' });
    }

    if (!DRIP_TEMPLATES[template_key]) {
      return res
        .status(400)
        .json({ error: `Template desconhecido: ${template_key}` });
    }

    const result = await startDripCampaign(
      req.orgId,
      lead_id,
      template_key,
      lead_data || {}
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Drip] Start error:', err.message);
    res.status(500).json({ error: 'Erro ao iniciar campanha' });
  }
});

/**
 * POST /api/crm/drip/cancel
 * Cancel all active drip campaigns for a lead.
 */
router.post('/cancel', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lead_id } = req.body;
    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id é obrigatório' });
    }

    const result = await cancelDripCampaigns(req.orgId, lead_id);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Drip] Cancel error:', err.message);
    res.status(500).json({ error: 'Erro ao cancelar campanha' });
  }
});

/**
 * GET /api/crm/drip/lead/:leadId
 * Get active drip campaigns for a lead.
 */
router.get('/lead/:leadId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const campaigns = await getLeadDripCampaigns(req.orgId, req.params.leadId);
    res.json({ success: true, campaigns });
  } catch (err) {
    console.error('[Drip] Lead campaigns error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar campanhas' });
  }
});

export default router;
