/**
 * Token de setup de licença — embutido no link mágico de boas-vindas de
 * revendas e clientes. Nunca expõe a chave WOLK1; apenas permite que a tela
 * de setup autentique e vincule o domínio do whitelabel à licença certa.
 *
 * Formato: WOLKS1.<base64url(payload)>.<assinatura>
 * Assinado com a mesma chave do control plane (LICENSE_SIGNING_PRIVATE_KEY).
 */

import {
  canonicalize,
  randomNonce,
  signMessage,
  verifyMessage,
} from './crypto.js';

export class SetupTokenError extends Error {
  constructor(message, code = 'SETUP_TOKEN_ERROR') {
    super(message);
    this.name = 'SetupTokenError';
    this.code = code;
  }
}

const TOKEN_PREFIX = 'WOLKS1';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function resolvePrivateKey(options) {
  const privateKeyPem = options.privateKeyPem || process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (!privateKeyPem) {
    throw new SetupTokenError(
      'LICENSE_SIGNING_PRIVATE_KEY não configurada',
      'SIGNING_KEY_MISSING'
    );
  }
  return privateKeyPem;
}

function resolvePublicKey(options) {
  const publicKeyPem = options.publicKeyPem || process.env.LICENSE_SIGNING_PUBLIC_KEY;
  if (!publicKeyPem) {
    throw new SetupTokenError(
      'LICENSE_SIGNING_PUBLIC_KEY não configurada',
      'VERIFY_KEY_MISSING'
    );
  }
  return publicKeyPem;
}

/**
 * Cria um token de setup assinado.
 *
 * @param {object} payload Claims do token: licenseId, organizationId, email.
 * @param {object} [options]
 * @param {string} [options.privateKeyPem] Fallback: LICENSE_SIGNING_PRIVATE_KEY.
 * @param {number} [options.ttlMs] Validade do token (padrão: 7 dias).
 * @param {number} [options.now] Base de tempo (ms) para testes.
 * @returns {string} Token no formato WOLKS1.<payload>.<assinatura>.
 */
export function createSetupToken(payload, options = {}) {
  const privateKeyPem = resolvePrivateKey(options);
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const now = options.now ?? Date.now();

  if (!payload || typeof payload !== 'object') {
    throw new SetupTokenError('Payload do token inválido', 'INVALID_PAYLOAD');
  }

  const claims = {
    kind: 'license-setup',
    ...payload,
    jti: randomNonce(12),
    iat: now,
    exp: now + ttlMs,
  };
  const canonicalMessage = canonicalize(claims);
  const signature = signMessage(privateKeyPem, canonicalMessage);
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${TOKEN_PREFIX}.${encoded}.${signature}`;
}

/**
 * Extrai e valida a estrutura do token (sem verificar a assinatura).
 */
export function parseSetupToken(token) {
  if (typeof token !== 'string') {
    throw new SetupTokenError('Token de setup ausente', 'TOKEN_MISSING');
  }
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    throw new SetupTokenError(
      'Formato de token de setup inválido',
      'TOKEN_FORMAT'
    );
  }
  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new SetupTokenError('Payload do token inválido', 'TOKEN_PAYLOAD');
  }
  return { claims, signature: parts[2], rawPayload: parts[1] };
}

/**
 * Verifica assinatura e validade temporal do token de setup.
 *
 * @param {string} token
 * @param {object} [options]
 * @param {string} [options.publicKeyPem] Fallback: LICENSE_SIGNING_PUBLIC_KEY.
 * @param {number} [options.now] Base de tempo (ms) para testes.
 * @param {number} [options.skewMs] Tolerância de relógio.
 * @returns {object} Claims validados.
 */
export function verifySetupToken(token, options = {}) {
  const publicKeyPem = resolvePublicKey(options);
  const { claims, signature } = parseSetupToken(token);

  const canonicalMessage = canonicalize(claims);
  const valid = verifyMessage(publicKeyPem, canonicalMessage, signature);
  if (!valid) {
    throw new SetupTokenError(
      'Assinatura do token de setup inválida',
      'TOKEN_SIGNATURE'
    );
  }

  const now = options.now ?? Date.now();
  const skewMs = options.skewMs ?? 60_000;
  if (typeof claims.exp !== 'number' || claims.exp + skewMs < now) {
    throw new SetupTokenError('Token de setup expirado', 'TOKEN_EXPIRED');
  }
  if (claims.kind !== 'license-setup') {
    throw new SetupTokenError(
      'Tipo de token inválido',
      'TOKEN_KIND'
    );
  }

  return claims;
}
