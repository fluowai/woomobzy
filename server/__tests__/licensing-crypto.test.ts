import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  createLicenseKey,
  generateKeyPair,
  isNotExpired,
  keyFingerprint,
  LicenseCryptoError,
  parseLicenseKey,
  randomNonce,
  sha256Hex,
  signMessage,
  verifyLicenseKey,
  verifyMessage,
} from '../lib/licensing/crypto.js';
import { ReplayDetectedError, ReplayGuard } from '../lib/licensing/replay-guard.js';

describe('licensing crypto', () => {
  const keys = generateKeyPair();

  it('signa e verifica mensagem Ed25519', () => {
    const message = 'mensagem de teste';
    const signature = signMessage(keys.privateKeyPem, message);
    expect(verifyMessage(keys.publicKeyPem, message, signature)).toBe(true);
  });

  it('rejeita mensagem adulterada', () => {
    const signature = signMessage(keys.privateKeyPem, 'mensagem');
    expect(verifyMessage(keys.publicKeyPem, 'mensagem2', signature)).toBe(false);
  });

  it('gera fingerprints estáveis e distintos por chave', () => {
    const fp1 = keyFingerprint(keys.publicKeyPem);
    const fp2 = keyFingerprint(keys.publicKeyPem);
    const other = generateKeyPair();
    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(keyFingerprint(other.publicKeyPem));
    expect(fp1).toHaveLength(32);
  });

  it('canonicaliza de forma determinística', () => {
    const a = { b: 1, a: { d: 2, c: [1, 2] } };
    const b = { a: { c: [1, 2], d: 2 }, b: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it('cria e verifica chave de licença assinada', () => {
    const payload = {
      sub: 'org-123',
      dom: 'fazendasbrasil.com',
      ed: 'pro',
      fp: 'fingerprint-a',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const licenseKey = createLicenseKey(keys.privateKeyPem, payload);
    const verified = verifyLicenseKey(licenseKey, keys.publicKeyPem);
    expect(verified).toEqual(payload);
  });

  it('rejeita chave de licença adulterada', () => {
    const payload = { sub: 'org-123', exp: Math.floor(Date.now() / 1000) + 3600 };
    const licenseKey = createLicenseKey(keys.privateKeyPem, payload);
    const parts = licenseKey.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...payload, sub: 'org-maliciosa' })
    ).toString('base64url');
    const tampered = [parts[0], tamperedPayload, parts[2]].join('.');
    expect(() => verifyLicenseKey(tampered, keys.publicKeyPem)).toThrow(
      LicenseCryptoError
    );
  });

  it('rejeita chave em formato inválido', () => {
    expect(() => verifyLicenseKey('not-a-key', keys.publicKeyPem)).toThrow(
      LicenseCryptoError
    );
    expect(() => parseLicenseKey(null)).toThrow(LicenseCryptoError);
  });

  it('valida expiração com tolerância de relógio', () => {
    const nowMs = Date.now();
    expect(isNotExpired(Math.floor(nowMs / 1000) + 100, nowMs)).toBe(true);
    expect(isNotExpired(Math.floor(nowMs / 1000) - 120, nowMs)).toBe(false);
  });

  it('gera nonces únicos', () => {
    const a = randomNonce();
    const b = randomNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });

  it('sha256Hex é estável', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
    expect(sha256Hex('abc')).toHaveLength(64);
  });
});

describe('ReplayGuard', () => {
  it('aceita nonce novo e rejeita replay', () => {
    const guard = new ReplayGuard();
    const nonce = randomNonce();
    expect(guard.consume(nonce)).toBe(true);
    expect(() => guard.consume(nonce)).toThrow(ReplayDetectedError);
    expect(guard.size).toBe(1);
  });

  it('rejeita nonces curtos', () => {
    const guard = new ReplayGuard();
    expect(() => guard.consume('abc')).toThrow(ReplayDetectedError);
  });

  it('expira nonces após a janela de TTL', () => {
    const guard = new ReplayGuard();
    const nonce = randomNonce();
    const now = Date.now();
    guard.consume(nonce, { ttlMs: 1000, now });
    expect(() => guard.consume(nonce, { now: now + 500 })).toThrow(
      ReplayDetectedError
    );
    expect(guard.consume(nonce, { ttlMs: 1000, now: now + 1001 })).toBe(true);
  });

  it('limita o número de entradas', () => {
    const guard = new ReplayGuard({ maxEntries: 3 });
    guard.consume(randomNonce());
    guard.consume(randomNonce());
    guard.consume(randomNonce());
    guard.consume(randomNonce());
    expect(guard.size).toBeLessThanOrEqual(3);
  });

  it('não expõe o valor bruto do nonce', () => {
    const guard = new ReplayGuard();
    const nonce = randomNonce();
    guard.consume(nonce);
    let rawExposed = false;
    for (const hash of guard.entries.keys()) {
      if (hash === nonce) rawExposed = true;
    }
    expect(rawExposed).toBe(false);
  });
});
