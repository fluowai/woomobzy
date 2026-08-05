import { Router } from 'express';
import { woosignService } from '../../services/woosign.js';
import { verifyDocumensoWebhookSignature } from '../../services/woosign-webhook.js';

const router = Router();

router.get('/envelopes', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const items = await woosignService.listEnvelopes(status);
    res.json({ ok: true, data: items });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to list envelopes' });
  }
});

router.get('/envelopes/:id', async (req, res) => {
  try {
    const item = await woosignService.getEnvelope(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, error: 'Envelope not found' });
    }
    res.json({ ok: true, data: item });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to fetch envelope' });
  }
});

router.post('/envelopes', async (req, res) => {
  try {
    const item = await woosignService.createEnvelope(req.body);
    res.status(201).json({ ok: true, data: item });
  } catch (error) {
    res.status(400).json({ ok: false, error: 'Failed to create envelope' });
  }
});

router.post('/envelopes/:id/send', async (req, res) => {
  try {
    const item = await woosignService.sendEnvelope(req.params.id);
    res.json({ ok: true, data: item });
  } catch (error) {
    res.status(400).json({ ok: false, error: 'Failed to send envelope' });
  }
});

router.post('/envelopes/:id/cancel', async (req, res) => {
  try {
    const item = await woosignService.cancelEnvelope(req.params.id);
    res.json({ ok: true, data: item });
  } catch (error) {
    res.status(400).json({ ok: false, error: 'Failed to cancel envelope' });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const items = await woosignService.listTemplates();
    res.json({ ok: true, data: items });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to list templates' });
  }
});

router.get('/wallets', async (req, res) => {
  try {
    const items = await woosignService.listWallets();
    res.json({ ok: true, data: items });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to list wallets' });
  }
});

router.post('/webhook/woosign', async (req, res) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = String(req.headers['x-woosign-signature'] || req.headers['x-documenso-signature'] || '').trim();
    const secret = process.env.DOCUMENSO_WEBHOOK_SECRET || process.env.WOOSIGN_WEBHOOK_SECRET || '';

    if (!secret) {
      logger.warn('WooSign webhook received but secret is not configured');
    } else if (signature && !verifyDocumensoWebhookSignature(rawBody, signature, secret)) {
      return res.status(401).json({ ok: false, error: 'Invalid webhook signature' });
    }

    await woosignService.handleDocumensoWebhook(req.body);
    res.json({ ok: true, received: true });
  } catch (error) {
    logger.error('[WooSignWebhook] Error:', error);
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

export default router;
