import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { cloneSite } from '../../services/siteCloner.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.post('/clone-site', verifyAuth, requireTenant, async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    return res.status(400).json({ error: 'URL inválida.' });
  }

  const organizationId = req.orgId || req.body.organizationId || null;

  try {
    const layout = await cloneSite(url.trim(), organizationId);
    return res.json({ layout });
  } catch (error) {
    logger.error('[CloneSite] Falha ao clonar site:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao clonar o site.',
    });
  }
});

export default router;
