import { Router } from 'express';
import { woosignService } from '../../services/woosign';
import { getDocumensoWebhookSecret, verifyDocumensoWebhookSignature } from '../../services/woosign';

const router = Router();

router.post('/webhooks/documenso', (req, res) => {
  try {
    const signature = req.headers['x-documenso-signature'];
    const payload = JSON.stringify(req.body);

    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const secret = getDocumensoWebhookSecret();
    if (!secret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const isValid = verifyDocumensoWebhookSignature(payload, String(signature), secret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    woosignService.handleDocumensoWebhook(req.body);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Documenso webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
