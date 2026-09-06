import express from 'express';
import asaasGateway from '../services/asaasGateway.js';
import { logger } from '../utils/logger.js';
import { isAsaasWebhookAuthorized } from '../lib/asaas-webhook-auth.js';

const router = express.Router();

router.post('/asaas', async (req, res) => {
  try {
    if (!isAsaasWebhookAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }

    const payload = req.body;

    const result = await asaasGateway.handleWebhook(payload);

    res.status(200).json({ received: true, result });
  } catch (error) {
    logger.error('[Webhook] Asaas processing error', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
