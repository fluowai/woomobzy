import { logger } from '../utils/logger.js';

export function verifyDocumensoWebhookSignature(payload, signature, secret) {
  if (!secret) {
    logger.warn('Documenso webhook secret not configured');
    return true;
  }

  try {
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return signature === expected;
  } catch (error) {
    logger.error('Failed to verify Documenso webhook signature', error);
    return false;
  }
}

export function getDocumensoWebhookSecret() {
  return String(process.env.DOCUMENSO_WEBHOOK_SECRET || '').trim();
}
