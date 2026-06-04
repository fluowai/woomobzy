import crypto from 'crypto';

const KEY_BYTES = 32;
const IV_BYTES = 12;

function getEncryptionKey() {
  const configured = process.env.EMAIL_ENCRYPTION_KEY;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET;
  const material = configured || fallback;

  if (!material) {
    throw new Error('EMAIL_ENCRYPTION_KEY ausente. Defina uma chave forte para criptografar contas de email.');
  }

  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('EMAIL_ENCRYPTION_KEY e obrigatoria em producao.');
  }

  if (/^[a-f0-9]{64}$/i.test(material)) {
    return Buffer.from(material, 'hex');
  }

  return crypto.createHash('sha256').update(material).digest().subarray(0, KEY_BYTES);
}

export function encryptEmailSecret(value) {
  const iv = crypto.randomBytes(IV_BYTES);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptEmailSecret(payload) {
  const [version, ivB64, tagB64, encryptedB64] = String(payload || '').split(':');
  if (version !== 'v1' || !ivB64 || !tagB64 || !encryptedB64) {
    throw new Error('Formato de credencial criptografada invalido.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function maskEmailSecret() {
  return '********';
}
