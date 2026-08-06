import { describe, expect, it } from 'vitest';
import {
  createValidationEnvelope,
  envelopeUsability,
  LicenseEnvelopeError,
  verifyValidationEnvelope,
} from '../lib/licensing/envelope.js';
import { generateKeyPair } from '../lib/licensing/crypto.js';

describe('validation envelope (cache offline assinado)', () => {
  const keys = generateKeyPair();

  it('cria e verifica envelope', () => {
    const payload = {
      status: 'valid',
      org: 'org-1',
      validUntil: Date.now() + 3600_000,
    };
    const envelope = createValidationEnvelope(keys.privateKeyPem, payload);
    expect(verifyValidationEnvelope(keys.publicKeyPem, envelope)).toEqual(
      payload
    );
  });

  it('rejeita envelope adulterado', () => {
    const envelope = createValidationEnvelope(keys.privateKeyPem, {
      status: 'valid',
    });
    const tampered = {
      payload: { status: 'blocked' },
      signature: envelope.signature,
    };
    expect(() => verifyValidationEnvelope(keys.publicKeyPem, tampered)).toThrow(
      LicenseEnvelopeError
    );
  });

  it('rejeita envelope malformado', () => {
    expect(() => verifyValidationEnvelope(keys.publicKeyPem, null)).toThrow(
      LicenseEnvelopeError
    );
    expect(() =>
      verifyValidationEnvelope(keys.publicKeyPem, { payload: {} })
    ).toThrow(LicenseEnvelopeError);
  });

  it('classifica usabilidade fresh, stale e expired', () => {
    const now = Date.now();
    const fresh = envelopeUsability({ validUntil: now + 60_000 }, { now });
    expect(fresh.usable).toBe(true);
    expect(fresh.state).toBe('fresh');

    const stale = envelopeUsability(
      { validUntil: now - 1000 },
      { now, staleAllowanceMs: 60_000 }
    );
    expect(stale.usable).toBe(true);
    expect(stale.state).toBe('stale');

    const expired = envelopeUsability(
      { validUntil: now - 120_000 },
      { now, staleAllowanceMs: 60_000 }
    );
    expect(expired.usable).toBe(false);
    expect(expired.state).toBe('expired');
  });

  it('sem validUntil é inutilizável', () => {
    const result = envelopeUsability({ status: 'valid' }, { now: Date.now() });
    expect(result.usable).toBe(false);
  });
});
