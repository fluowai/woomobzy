import { afterEach, describe, expect, it } from 'vitest';
import { isDocumentWorkerWebhookAuthorized } from '../api/documents/index.js';
import {
  assertSignatureWebhookAuthorized,
  getIncomingSignatureWebhookSecret,
  getSignatureWebhookSecret,
} from '../api/locacao/signature.routes.js';
import { isDebugAccessAllowed } from '../routes/internal.js';

const envKeys = [
  'DOCUMENT_WEBHOOK_SECRET',
  'SIGNATURE_WEBHOOK_SECRET',
  'CLICKSIGN_WEBHOOK_SECRET',
  'ZAPSIGN_WEBHOOK_SECRET',
  'INTERNAL_AUTH_DEBUG_TOKEN',
  'NODE_ENV',
];

afterEach(() => {
  for (const key of envKeys) {
    delete process.env[key];
  }
});

describe('webhook security helpers', () => {
  it('rejects document worker callbacks without the shared secret', () => {
    process.env.DOCUMENT_WEBHOOK_SECRET = 'doc-secret';

    expect(
      isDocumentWorkerWebhookAuthorized({
        headers: {},
        query: {},
      } as never)
    ).toBe(false);

    expect(
      isDocumentWorkerWebhookAuthorized({
        headers: { 'x-document-webhook-secret': 'doc-secret' },
        query: {},
      } as never)
    ).toBe(true);
  });

  it('requires signature webhook secrets and reads provider-specific overrides', () => {
    process.env.SIGNATURE_WEBHOOK_SECRET = 'generic-secret';
    process.env.CLICKSIGN_WEBHOOK_SECRET = 'click-secret';

    expect(getSignatureWebhookSecret('clicksign')).toBe('click-secret');
    expect(getSignatureWebhookSecret('zapsign')).toBe('generic-secret');
    expect(
      getIncomingSignatureWebhookSecret({
        headers: { authorization: 'Bearer click-secret' },
        query: {},
      } as never)
    ).toBe('click-secret');

    expect(
      assertSignatureWebhookAuthorized({
        headers: { 'x-signature-webhook-secret': 'click-secret' },
        query: {},
      } as never, 'clicksign')
    ).toBeUndefined();
  });

  it('blocks debug access in production unless the debug token matches', () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_AUTH_DEBUG_TOKEN = 'debug-secret';

    expect(
      isDebugAccessAllowed(
        {
          headers: { authorization: 'Bearer wrong' },
        } as never,
        'wrong'
      )
    ).toBe(false);

    expect(
      isDebugAccessAllowed(
        {
          headers: { 'x-auth-debug-token': 'debug-secret' },
        } as never,
        ''
      )
    ).toBe(true);
  });

  it('denies debug access in production if no token is configured', () => {
    process.env.NODE_ENV = 'production';

    expect(
      isDebugAccessAllowed(
        {
          headers: {},
        } as never,
        'any-token'
      )
    ).toBe(false);
  });
});
