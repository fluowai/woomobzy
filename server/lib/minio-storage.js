import crypto from 'crypto';

const DEFAULT_REGION = 'us-east-1';

const BUCKET_ENV = {
  media: ['MINIO_MEDIA_BUCKET', 'S3_MEDIA_BUCKET'],
  whatsapp: ['MINIO_WHATSAPP_BUCKET', 'S3_WHATSAPP_BUCKET'],
  documents: ['MINIO_DOCUMENTS_BUCKET', 'S3_DOCUMENTS_BUCKET'],
  backups: ['MINIO_BACKUPS_BUCKET', 'S3_BACKUPS_BUCKET'],
  exports: ['MINIO_EXPORTS_BUCKET', 'S3_EXPORTS_BUCKET'],
};

const BUCKET_FALLBACKS = {
  media: 'imobzy-media',
  whatsapp: 'whatsapp-media',
  documents: 'imobzy-documents',
  backups: 'imobzy-backups',
  exports: 'imobzy-exports',
};

export function isMinioConfigured() {
  const cfg = getMinioConfig();
  return Boolean(cfg.endpoint && cfg.accessKey && cfg.secretKey);
}

export function allowSupabaseStorageFallback() {
  const provider = firstEnv(['MEDIA_STORAGE_PROVIDER', 'STORAGE_PROVIDER']).toLowerCase();
  return provider === 'supabase' || firstEnv(['ALLOW_SUPABASE_STORAGE_FALLBACK']).toLowerCase() === 'true';
}

export function resolveMediaBucket(requestedBucket = 'imobzyimg') {
  const normalized = String(requestedBucket || '').trim();

  if (
    normalized === 'agency-assets' ||
    normalized === 'property-images' ||
    normalized === 'properties' ||
    normalized === 'imobzyimg' ||
    normalized === 'imobzy-media'
  ) {
    return getBucketName('media');
  }

  if (
    normalized === 'imobzymsg' ||
    normalized === 'whatsapp-media' ||
    normalized === 'whatsapp'
  ) {
    return getBucketName('whatsapp');
  }

  if (normalized === 'documents' || normalized === 'imobzy-documents') {
    return getBucketName('documents');
  }

  if (normalized === 'exports' || normalized === 'imobzy-exports') {
    return getBucketName('exports');
  }

  if (normalized === 'backups' || normalized === 'imobzy-backups') {
    return getBucketName('backups');
  }

  return null;
}

export async function uploadObject({ bucket, key, body, contentType }) {
  const cfg = getMinioConfig();
  if (!cfg.endpoint || !cfg.accessKey || !cfg.secretKey) {
    throw new Error('MinIO nao configurado. Defina MINIO_ENDPOINT, MINIO_ACCESS_KEY e MINIO_SECRET_KEY.');
  }

  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const endpoint = trimSlash(cfg.endpoint);
  const region = cfg.region || DEFAULT_REGION;
  const encodedKey = encodePath(key);
  const url = new URL(`${endpoint}/${encodeURIComponent(bucket)}/${encodedKey}`);
  const host = url.host;
  const payloadHash = sha256Hex(payload);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const finalContentType = contentType || 'application/octet-stream';

  const canonicalHeaders =
    `content-type:${finalContentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signature = hmacHex(getSigningKey(cfg.secretKey, dateStamp, region), stringToSign);
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Type': finalContentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
    body: payload,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`MinIO upload failed (${response.status}): ${text || response.statusText}`);
  }

  return {
    bucket,
    path: key,
    publicUrl: buildPublicUrl(cfg.publicUrl || cfg.endpoint, bucket, key),
  };
}

function getMinioConfig() {
  const endpoint = normalizeEndpoint(
    firstEnv(['MINIO_ENDPOINT', 'S3_ENDPOINT', 'AWS_ENDPOINT_URL']),
    firstEnv(['MINIO_USE_SSL', 'S3_USE_SSL'])
  );

  return {
    endpoint,
    publicUrl: normalizeEndpoint(
      firstEnv(['MINIO_PUBLIC_URL', 'MINIO_PUBLIC_ENDPOINT', 'S3_PUBLIC_URL']) || endpoint,
      firstEnv(['MINIO_PUBLIC_USE_SSL', 'MINIO_USE_SSL', 'S3_USE_SSL'])
    ),
    accessKey: firstEnv(['MINIO_ACCESS_KEY', 'MINIO_ROOT_USER', 'AWS_ACCESS_KEY_ID', 'S3_ACCESS_KEY_ID']),
    secretKey: firstEnv(['MINIO_SECRET_KEY', 'MINIO_ROOT_PASSWORD', 'AWS_SECRET_ACCESS_KEY', 'S3_SECRET_ACCESS_KEY']),
    region: firstEnv(['MINIO_REGION', 'AWS_REGION', 'S3_REGION']) || DEFAULT_REGION,
  };
}

function getBucketName(kind) {
  return firstEnv(BUCKET_ENV[kind] || []) || firstEnv(['MINIO_BUCKET', 'S3_BUCKET']) || BUCKET_FALLBACKS[kind];
}

function firstEnv(keys) {
  for (const key of keys) {
    const value = cleanEnv(process.env[key]);
    if (value) return value;
  }
  return '';
}

function cleanEnv(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}

function normalizeEndpoint(raw, useSSLRaw) {
  const value = cleanEnv(raw);
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return trimSlash(value);

  const useSSL = cleanEnv(useSSLRaw).toLowerCase() === 'true';
  return `${useSSL ? 'https' : 'http'}://${trimSlash(value)}`;
}

function trimSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function buildPublicUrl(baseUrl, bucket, key) {
  return `${trimSlash(baseUrl)}/${encodeURIComponent(bucket)}/${encodePath(key)}`;
}

function encodePath(value) {
  return String(value || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function hmacHex(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

function getSigningKey(secretKey, dateStamp, region) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}
