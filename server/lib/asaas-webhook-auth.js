import crypto from 'crypto';

export function isAsaasWebhookAuthorized(req) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!expectedToken) {
    return process.env.NODE_ENV !== 'production';
  }

  const incoming = String(req.headers['asaas-access-token'] || '').trim();
  if (!incoming) return false;

  const expected = Buffer.from(expectedToken);
  const actual = Buffer.from(incoming);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
