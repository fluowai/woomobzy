import { canonicalize, signMessage, verifyMessage } from './crypto.js';

export class LicenseEnvelopeError extends Error {
  constructor(message, code = 'LICENSE_ENVELOPE_ERROR') {
    super(message);
    this.name = 'LicenseEnvelopeError';
    this.code = code;
  }
}

/**
 * Envelope offline assinado: o control plane assina o resultado da validação
 * para que a instalação possa operar offline com tolerância controlada.
 * O payload carrega `issuedAt` (ms) e `validUntil` (ms).
 */
export function createValidationEnvelope(privateKeyPem, payload) {
  return {
    payload,
    signature: signMessage(privateKeyPem, canonicalize(payload)),
  };
}

export function verifyValidationEnvelope(publicKeyPem, envelope) {
  if (
    !envelope ||
    typeof envelope !== 'object' ||
    !envelope.payload ||
    typeof envelope.payload !== 'object' ||
    !envelope.signature
  ) {
    throw new LicenseEnvelopeError(
      'Envelope de validação inválido',
      'ENVELOPE_FORMAT'
    );
  }
  const valid = verifyMessage(
    publicKeyPem,
    canonicalize(envelope.payload),
    envelope.signature
  );
  if (!valid) {
    throw new LicenseEnvelopeError(
      'Assinatura do envelope de validação inválida',
      'ENVELOPE_SIGNATURE'
    );
  }
  return envelope.payload;
}

/**
 * Estado do envelope offline em relação ao momento atual.
 * - fresh: dentro do período normal (validUntil ainda vigente).
 * - stale: vencido, mas dentro da margem de tolerância (grace offline).
 * - expired: além da margem — exigirá nova validação online.
 */
export function envelopeUsability(
  payload,
  { now = Date.now(), staleAllowanceMs = 24 * 60 * 60 * 1000 } = {}
) {
  const validUntil = Number(payload?.validUntil || 0);
  const issuedAt = Number(payload?.issuedAt || 0);
  if (!validUntil) {
    return { usable: false, state: 'invalid', reason: 'sem validUntil' };
  }
  if (now <= validUntil) {
    return { usable: true, state: 'fresh', remainingMs: validUntil - now };
  }
  const withinGrace = now <= validUntil + staleAllowanceMs;
  return {
    usable: withinGrace,
    state: withinGrace ? 'stale' : 'expired',
    remainingMs: withinGrace ? validUntil + staleAllowanceMs - now : 0,
    issuedAt,
  };
}
