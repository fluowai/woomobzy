import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { AgroIntelligenceService } from '../../services/AgroIntelligence.js';

const router = Router();

router.get('/market/prices', verifyAuth, async (req, res) => {
  try {
    const data = await AgroIntelligenceService.getLatestPrices();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
