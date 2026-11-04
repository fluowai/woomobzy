import crypto from 'crypto';

const KEY_BYTES = 32;
const IV_BYTES = 12;

function getEncryptionKey() {
  const material =
    process.env.ORULO_CREDENTIALS_ENCRYPTION_KEY ||
    process.env.EMAIL_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!material) {
    throw new Error(
      'Configure ORULO_CREDENTIALS_ENCRYPTION_KEY para armazenar credenciais da Órulo.'
    );
  }

  if (/^[a-f0-9]{64}$/i.test(material)) {
    return Buffer.from(material, 'hex');
  }

  return crypto
    .createHash('sha256')
    .update(material)
    .digest()
    .subarray(0, KEY_BYTES);
}

export function encryptOruloPayload(payload) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptOruloPayload(value) {
  const [version, ivValue, tagValue, encryptedValue] = String(
    value || ''
  ).split(':');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Formato de credencial Órulo criptografada inválido.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}

export function maskOruloClientId(value = '') {
  const clean = String(value).trim();
  if (!clean) return '';
  if (clean.length <= 8) return `${clean.slice(0, 2)}••••`;
  return `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
}
