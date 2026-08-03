import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as nodeSign,
  timingSafeEqual,
  verify as nodeVerify,
} from 'node:crypto';

const LICENSE_KEY_PREFIX = 'WOLK1';

export class LicenseCryptoError extends Error {
  constructor(message, code = 'LICENSE_CRYPTO_ERROR') {
    super(message);
    this.name = 'LicenseCryptoError';
    this.code = code;
  }
}

/**
 * Serializa um objeto de forma canônica (chaves ordenadas recursivamente),
 * garantindo assinaturas determinísticas independentemente da ordem das chaves.
 */
export function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

export function randomNonce(bytes = 24) {
  return randomBytes(bytes).toString('base64url');
}

export function constantTimeEqual(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function toBase64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromBase64Url(input) {
  return Buffer.from(input, 'base64url');
}

function toKeyObject(key, kind) {
  if (key && typeof key === 'object' && key.type) return key;
  try {
    if (kind === 'public') return createPublicKey(key);
    return createPrivateKey(key);
  } catch (error) {
    throw new LicenseCryptoError(
      `Chave inválida (${kind}): ${error.message}`,
      'INVALID_KEY'
    );
  }
}

/**
 * Gera um par de chaves Ed25519 e retorna em formato PEM.
 */
export function generateKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey
      .export({ type: 'pkcs8', format: 'pem' })
      .toString(),
  };
}

/**
 * Assina uma mensagem com Ed25519 e retorna a assinatura em base64url.
 */
export function signMessage(privateKey, message) {
  const keyObject = toKeyObject(privateKey, 'private');
  return toBase64Url(nodeSign(null, Buffer.from(message, 'utf8'), keyObject));
}

/**
 * Verifica uma assinatura Ed25519.
 */
export function verifyMessage(publicKey, message, signatureBase64Url) {
  const keyObject = toKeyObject(publicKey, 'public');
  try {
    return nodeVerify(
      null,
      Buffer.from(message, 'utf8'),
      keyObject,
      fromBase64Url(signatureBase64Url)
    );
  } catch {
    return false;
  }
}

/**
 * Fingerprint (SHA-256) de uma chave pública — usado para identificar a chave
 * de assinatura sem expor a chave em si.
 */
export function keyFingerprint(publicKeyPem) {
  const keyObject = toKeyObject(publicKeyPem, 'public');
  const der = keyObject.export({ type: 'spki', format: 'der' });
  return sha256Hex(der).slice(0, 32);
}

/**
 * Cria uma chave de licença assinada no formato:
 *   WOLK1.<base64url(payloadJson)>.<base64url(assinatura)>
 */
export function createLicenseKey(privateKeyPem, payload) {
  const canonicalMessage = canonicalize(payload);
  const signature = signMessage(privateKeyPem, canonicalMessage);
  return `${LICENSE_KEY_PREFIX}.${toBase64Url(
    JSON.stringify(payload)
  )}.${signature}`;
}

/**
 * Extrai e valida estrutura da chave de licença.
 */
export function parseLicenseKey(licenseKey) {
  if (typeof licenseKey !== 'string') {
    throw new LicenseCryptoError('Chave de licença ausente', 'LICENSE_KEY_MISSING');
  }
  const parts = licenseKey.split('.');
  if (parts.length !== 3 || parts[0] !== LICENSE_KEY_PREFIX) {
    throw new LicenseCryptoError(
      'Formato de chave de licença inválido',
      'LICENSE_KEY_FORMAT'
    );
  }
  let payload;
  try {
    payload = JSON.parse(fromBase64Url(parts[1]).toString('utf8'));
  } catch {
    throw new LicenseCryptoError(
      'Payload da chave de licença inválido',
      'LICENSE_KEY_PAYLOAD'
    );
  }
  return { payload, signature: parts[2], rawPayload: parts[1] };
}

/**
 * Verifica a assinatura da chave de licença e retorna o payload se válida.
 */
export function verifyLicenseKey(licenseKey, publicKeyPem) {
  const { payload, signature } = parseLicenseKey(licenseKey);
  const canonicalMessage = canonicalize(payload);
  const valid = verifyMessage(publicKeyPem, canonicalMessage, signature);
  if (!valid) {
    throw new LicenseCryptoError(
      'Assinatura da chave de licença inválida',
      'LICENSE_KEY_SIGNATURE'
    );
  }
  return payload;
}

/**
 * Verifica se o campo de tempo (exp) ainda é válido, com tolerância de relógio.
 */
export function isNotExpired(expUnixSeconds, nowMs = Date.now(), skewMs = 60_000) {
  return expUnixSeconds * 1000 + skewMs > nowMs;
}
