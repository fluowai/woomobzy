import { describe, expect, it } from 'vitest';
import { generateKeyPair } from '../lib/licensing/crypto.js';
import {
  createSetupToken,
  parseSetupToken,
  SetupTokenError,
  verifySetupToken,
} from '../lib/licensing/setup-token.js';

describe('licensing setup token', () => {
  const keys = generateKeyPair();
  const NOW = 1_800_000_000_000;

  function makePayload(overrides = {}) {
    return {
      licenseId: 'c6f0c63c-1f66-4f91-bb25-14f50a01a5b0',
      organizationId: 'e0a89b2b-93c9-4cbe-9c7d-2f3d5c9e6a41',
      email: 'cliente@exemplo.com',
      ...overrides,
    };
  }

  it('cria token com claims preservadas e assinatura válida', () => {
    const token = createSetupToken(makePayload(), {
      privateKeyPem: keys.privateKeyPem,
      now: NOW,
    });
    const parsed = parseSetupToken(token);
    expect(parsed.claims.kind).toBe('license-setup');
    expect(parsed.claims.licenseId).toBe(makePayload().licenseId);
    expect(parsed.claims.organizationId).toBe(makePayload().organizationId);
    expect(parsed.claims.email).toBe(makePayload().email);
    expect(parsed.claims.iat).toBe(NOW);
    expect(parsed.claims.exp).toBe(NOW + 7 * 24 * 60 * 60 * 1000);

    const verified = verifySetupToken(token, {
      publicKeyPem: keys.publicKeyPem,
      now: NOW + 1000,
    });
    expect(verified).toEqual(parsed.claims);
  });

  it('respeita ttlMs customizado', () => {
    const token = createSetupToken(makePayload(), {
      privateKeyPem: keys.privateKeyPem,
      now: NOW,
      ttlMs: 60_000,
    });
    const parsed = parseSetupToken(token);
    expect(parsed.claims.exp).toBe(NOW + 60_000);
    expect(() =>
      verifySetupToken(token, {
        publicKeyPem: keys.publicKeyPem,
        now: NOW + 121_000,
      })
    ).toThrow(SetupTokenError);
  });

  it('gera tokens com jti únicos', () => {
    const a = createSetupToken(makePayload(), {
      privateKeyPem: keys.privateKeyPem,
      now: NOW,
    });
    const b = createSetupToken(makePayload(), {
      privateKeyPem: keys.privateKeyPem,
      now: NOW,
    });
    expect(parseSetupToken(a).claims.jti).not.toBe(
      parseSetupToken(b).claims.jti
    );
  });

  it('rejeita payload adulterado', () => {
    const token = createSetupToken(makePayload(), {
      privateKeyPem: keys.privateKeyPem,
      now: NOW,
    });
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify(
        makePayload({ organizationId: '00000000-0000-0000-0000-000000000000' })
      )
    ).toString('base64url');
    const tampered = [parts[0], tamperedPayload, parts[2]].join('.');
    expect(() =>
      verifySetupToken(tampered, { publicKeyPem: keys.publicKeyPem, now: NOW })
    ).toThrow(SetupTokenError);
  });

  it('rejeita token expirado com tolerância de relógio', () => {
    const token = createSetupToken(makePayload(), {
      privateKeyPem: keys.privateKeyPem,
      now: NOW,
    });
    const parsed = parseSetupToken(token);
    expect(() =>
      verifySetupToken(token, {
        publicKeyPem: keys.publicKeyPem,
        now: parsed.claims.exp + 61_000,
      })
    ).toThrow(SetupTokenError);
  });

  it('rejeita kind inesperado mesmo com assinatura válida', () => {
    const token = createSetupToken(makePayload({ kind: 'outro-tipo' }), {
      privateKeyPem: keys.privateKeyPem,
      now: NOW,
    });
    expect(() =>
      verifySetupToken(token, { publicKeyPem: keys.publicKeyPem, now: NOW })
    ).toThrow(SetupTokenError);
  });

  it('rejeita formato inválido e ausência de token', () => {
    expect(() => parseSetupToken('not-a-token')).toThrow(SetupTokenError);
    expect(() =>
      verifySetupToken('x', { publicKeyPem: keys.publicKeyPem })
    ).toThrow(SetupTokenError);
  });

  it('falha quando não há chave privada configurada', () => {
    const previous = process.env.LICENSE_SIGNING_PRIVATE_KEY;
    delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
    try {
      expect(() => createSetupToken(makePayload())).toThrow(SetupTokenError);
    } finally {
      if (previous !== undefined) {
        process.env.LICENSE_SIGNING_PRIVATE_KEY = previous;
      }
    }
  });

  it('falha na verificação sem chave pública configurada', () => {
    const token = createSetupToken(makePayload(), {
      privateKeyPem: keys.privateKeyPem,
      now: NOW,
    });
    const previous = process.env.LICENSE_SIGNING_PUBLIC_KEY;
    delete process.env.LICENSE_SIGNING_PUBLIC_KEY;
    try {
      expect(() => verifySetupToken(token)).toThrow(SetupTokenError);
    } finally {
      if (previous !== undefined) {
        process.env.LICENSE_SIGNING_PUBLIC_KEY = previous;
      }
    }
  });
});
