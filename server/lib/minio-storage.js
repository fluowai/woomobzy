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

let minioRuntimeConfig = {};

export function setMinioRuntimeConfig(config = {}) {
  minioRuntimeConfig = {
    endpoint: cleanEnv(config.endpoint),
    port: cleanEnv(config.port),
    publicUrl: cleanEnv(config.publicUrl || config.publicBaseUrl),
    accessKey: cleanEnv(config.accessKey),
    secretKey: cleanEnv(config.secretKey),
    region: cleanEnv(config.region) || DEFAULT_REGION,
    useSsl: typeof config.useSsl === 'boolean' ? config.useSsl : undefined,
    bucketMode: cleanEnv(config.bucketMode),
    folderMode: cleanEnv(config.folderMode),
    singleBucket: cleanEnv(config.singleBucket),
  };
}

export function isMinioConfigured() {
  const cfg = getMinioConfig();
  return Boolean(cfg.endpoint && cfg.accessKey && cfg.secretKey);
}

export function allowSupabaseStorageFallback() {
  const provider = firstEnv([
    'MEDIA_STORAGE_PROVIDER',
    'STORAGE_PROVIDER',
  ]).toLowerCase();
  return (
    provider === 'supabase' ||
    firstEnv(['ALLOW_SUPABASE_STORAGE_FALLBACK']).toLowerCase() === 'true'
  );
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

export function resolveMinioObjectKey(logicalBucket, key) {
  const normalizedKey = String(key || '').replace(/^\/+/, '');
  if (
    minioRuntimeConfig.bucketMode !== 'single' ||
    !minioRuntimeConfig.singleBucket
  ) {
    return normalizedKey;
  }

  if (
    minioRuntimeConfig.folderMode === 'flat' ||
    minioRuntimeConfig.folderMode === 'tenant-prefix'
  ) {
    return normalizedKey;
  }

  const prefix = cleanEnv(logicalBucket || 'media');
  if (!prefix || normalizedKey.startsWith(`${prefix}/`)) return normalizedKey;
  return `${prefix}/${normalizedKey}`;
}

export async function uploadObject({
  bucket,
  key,
  body,
  contentType,
  logicalBucket,
}) {
  const cfg = getMinioConfig();
  if (!cfg.endpoint || !cfg.accessKey || !cfg.secretKey) {
    throw new Error(
      'MinIO nao configurado. Defina MINIO_ENDPOINT, MINIO_ACCESS_KEY e MINIO_SECRET_KEY.'
    );
  }

  const targetKey = logicalBucket
    ? resolveMinioObjectKey(logicalBucket, key)
    : String(key || '').replace(/^\/+/, '');
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const endpoint = trimSlash(cfg.endpoint);
  const region = cfg.region || DEFAULT_REGION;
  const encodedKey = encodePath(targetKey);
  const url = new URL(
    `${endpoint}/${encodeURIComponent(bucket)}/${encodedKey}`
  );
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

  const signature = hmacHex(
    getSigningKey(cfg.secretKey, dateStamp, region),
    stringToSign
  );
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
    throw new Error(
      `MinIO upload failed (${response.status}): ${text || response.statusText}`
    );
  }

  return {
    bucket,
    path: targetKey,
    publicUrl: buildPublicUrl(cfg.publicUrl || cfg.endpoint, bucket, targetKey),
    etag: cleanEtag(response.headers.get('etag')),
  };
}

export function getConfiguredBucketName(kind = 'whatsapp') {
  return getBucketName(kind);
}

export function getMinioPublicUrl({ bucket, key }) {
  const cfg = getMinioConfig();
  return buildPublicUrl(cfg.publicUrl || cfg.endpoint, bucket, key);
}

export async function listMinioBuckets() {
  const xml = await signedMinioRequest({ method: 'GET' });
  return parseBucketList(xml);
}

export async function listMinioObjects({
  bucket,
  prefix = '',
  continuationToken = '',
  maxKeys = 1000,
} = {}) {
  const xml = await signedMinioRequest({
    method: 'GET',
    bucket,
    query: {
      'list-type': '2',
      'max-keys': String(Math.max(1, Math.min(Number(maxKeys) || 1000, 1000))),
      ...(prefix ? { prefix } : {}),
      ...(continuationToken ? { 'continuation-token': continuationToken } : {}),
    },
  });
  return parseObjectList(xml);
}

export async function getBucketVersioning(bucket) {
  try {
    const xml = await signedMinioRequest({
      method: 'GET',
      bucket,
      query: { versioning: '' },
    });
    const status = firstXmlValue(xml, 'Status') || 'Off';
    return {
      status,
      enabled: status.toLowerCase() === 'enabled',
    };
  } catch (error) {
    if (error.statusCode === 404) return { status: 'Off', enabled: false };
    throw error;
  }
}

export async function suspendBucketVersioning(bucket) {
  const body =
    '<VersioningConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Status>Suspended</Status></VersioningConfiguration>';
  await signedMinioRequest({
    method: 'PUT',
    bucket,
    query: { versioning: '' },
    headers: { 'Content-Type': 'application/xml' },
    body,
  });
  return { bucket, status: 'Suspended' };
}

export async function getBucketLifecycle(bucket) {
  try {
    const xml = await signedMinioRequest({
      method: 'GET',
      bucket,
      query: { lifecycle: '' },
    });
    return {
      enabled: true,
      rules: parseLifecycleRules(xml),
      raw: xml,
    };
  } catch (error) {
    if (
      error.statusCode === 404 ||
      /NoSuchLifecycle/i.test(error.body || error.message || '')
    ) {
      return { enabled: false, rules: [], raw: '' };
    }
    throw error;
  }
}

export async function applyBucketLifecycle(
  bucket,
  rulesXml = defaultLifecycleXml()
) {
  await signedMinioRequest({
    method: 'PUT',
    bucket,
    query: { lifecycle: '' },
    headers: { 'Content-Type': 'application/xml' },
    body: rulesXml,
  });
  return { bucket, enabled: true };
}

export async function getBucketPolicy(bucket) {
  try {
    const policy = await signedMinioRequest({
      method: 'GET',
      bucket,
      query: { policy: '' },
    });
    return JSON.parse(policy);
  } catch (error) {
    if (
      error.statusCode === 404 ||
      /NoSuchBucketPolicy/i.test(error.body || error.message || '')
    ) {
      return null;
    }
    throw error;
  }
}

export async function applyBucketPolicy(bucket, policy) {
  await signedMinioRequest({
    method: 'PUT',
    bucket,
    query: { policy: '' },
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(policy),
  });
  return { bucket, applied: true };
}

export async function deleteMinioObjects({ bucket, keys = [] }) {
  const uniqueKeys = [
    ...new Set(keys.map((key) => String(key || '').trim()).filter(Boolean)),
  ];
  const results = [];

  for (const key of uniqueKeys) {
    await signedMinioRequest({
      method: 'DELETE',
      bucket,
      key,
    });
    results.push({ bucket, key, deleted: true });
  }

  return results;
}

export function createPresignedGetUrl({ bucket, key, expiresInSeconds = 300 }) {
  const cfg = getMinioConfig();
  if (!cfg.endpoint || !cfg.accessKey || !cfg.secretKey) {
    throw new Error(
      'MinIO nao configurado. Defina MINIO_ENDPOINT, MINIO_ACCESS_KEY e MINIO_SECRET_KEY.'
    );
  }

  const endpoint = trimSlash(cfg.publicUrl || cfg.endpoint);
  const region = cfg.region || DEFAULT_REGION;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const url = new URL(
    `${endpoint}/${encodeURIComponent(bucket)}/${encodePath(key)}`
  );
  const expires = Math.max(60, Math.min(Number(expiresInSeconds) || 300, 3600));

  url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  url.searchParams.set(
    'X-Amz-Credential',
    `${cfg.accessKey}/${credentialScope}`
  );
  url.searchParams.set('X-Amz-Date', amzDate);
  url.searchParams.set('X-Amz-Expires', String(expires));
  url.searchParams.set('X-Amz-SignedHeaders', 'host');

  const canonicalQuery = canonicalizeSearchParams(url.searchParams);
  const canonicalRequest = [
    'GET',
    url.pathname,
    canonicalQuery,
    `host:${url.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = hmacHex(
    getSigningKey(cfg.secretKey, dateStamp, region),
    stringToSign
  );
  url.searchParams.set('X-Amz-Signature', signature);

  return url.toString();
}

export function getMinioConfig() {
  const useSSLRaw =
    typeof minioRuntimeConfig.useSsl === 'boolean'
      ? String(minioRuntimeConfig.useSsl)
      : firstEnv(['MINIO_USE_SSL', 'S3_USE_SSL']);
  const endpoint = normalizeEndpoint(
    withPort(
      minioRuntimeConfig.endpoint ||
        firstEnv(['MINIO_ENDPOINT', 'S3_ENDPOINT', 'AWS_ENDPOINT_URL']),
      minioRuntimeConfig.port
    ),
    useSSLRaw
  );
  const publicUrl = normalizeEndpoint(
    minioRuntimeConfig.publicUrl ||
      firstEnv([
        'MINIO_PUBLIC_URL',
        'MINIO_PUBLIC_ENDPOINT',
        'S3_PUBLIC_URL',
      ]) ||
      endpoint,
    typeof minioRuntimeConfig.useSsl === 'boolean'
      ? String(minioRuntimeConfig.useSsl)
      : firstEnv(['MINIO_PUBLIC_USE_SSL', 'MINIO_USE_SSL', 'S3_USE_SSL'])
  );

  return {
    endpoint,
    publicUrl: safePublicStorageUrl(publicUrl),
    accessKey:
      minioRuntimeConfig.accessKey ||
      firstEnv([
        'MINIO_ACCESS_KEY',
        'MINIO_ROOT_USER',
        'AWS_ACCESS_KEY_ID',
        'S3_ACCESS_KEY_ID',
      ]),
    secretKey:
      minioRuntimeConfig.secretKey ||
      firstEnv([
        'MINIO_SECRET_KEY',
        'MINIO_ROOT_PASSWORD',
        'AWS_SECRET_ACCESS_KEY',
        'S3_SECRET_ACCESS_KEY',
      ]),
    region:
      minioRuntimeConfig.region ||
      firstEnv(['MINIO_REGION', 'AWS_REGION', 'S3_REGION']) ||
      DEFAULT_REGION,
  };
}

function getBucketName(kind) {
  if (
    minioRuntimeConfig.bucketMode === 'single' &&
    minioRuntimeConfig.singleBucket
  ) {
    return minioRuntimeConfig.singleBucket;
  }
  return (
    firstEnv(BUCKET_ENV[kind] || []) ||
    firstEnv(['MINIO_BUCKET', 'S3_BUCKET']) ||
    BUCKET_FALLBACKS[kind]
  );
}

async function signedMinioRequest({
  method = 'GET',
  bucket = '',
  key = '',
  query = {},
  headers = {},
  body = '',
} = {}) {
  const cfg = getMinioConfig();
  if (!cfg.endpoint || !cfg.accessKey || !cfg.secretKey) {
    throw new Error(
      'MinIO nao configurado. Defina MINIO_ENDPOINT, MINIO_ACCESS_KEY e MINIO_SECRET_KEY.'
    );
  }

  const endpoint = trimSlash(cfg.endpoint);
  const region = cfg.region || DEFAULT_REGION;
  const bucketPath = bucket ? `/${encodeURIComponent(bucket)}` : '/';
  const objectPath = key ? `/${encodePath(key)}` : '';
  const url = new URL(`${endpoint}${bucketPath}${objectPath}`);

  for (const [queryKey, value] of Object.entries(query || {})) {
    url.searchParams.set(queryKey, value == null ? '' : String(value));
  }

  const payload = body == null ? '' : body;
  const payloadBuffer = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(String(payload));
  const payloadHash = sha256Hex(payloadBuffer);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const normalizedHeaders = normalizeSignedHeaders({
    ...headers,
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  });
  const signedHeaderNames = Object.keys(normalizedHeaders).sort();
  const canonicalHeaders = signedHeaderNames
    .map((headerName) => `${headerName}:${normalizedHeaders[headerName]}\n`)
    .join('');
  const signedHeaders = signedHeaderNames.join(';');
  const canonicalRequest = [
    method.toUpperCase(),
    url.pathname,
    canonicalizeSearchParams(url.searchParams),
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
  const signature = hmacHex(
    getSigningKey(cfg.secretKey, dateStamp, region),
    stringToSign
  );
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method,
    headers: {
      ...headers,
      Authorization: authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
    body: ['GET', 'HEAD'].includes(method.toUpperCase())
      ? undefined
      : payloadBuffer,
  });

  const text = await response.text().catch(() => '');
  if (!response.ok) {
    const error = new Error(
      `MinIO request failed (${response.status}): ${text || response.statusText}`
    );
    error.statusCode = response.status;
    error.body = text;
    throw error;
  }

  return text;
}

function firstEnv(keys) {
  for (const key of keys) {
    const value = cleanEnv(process.env[key]);
    if (value) return value;
  }
  return '';
}

function cleanEnv(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function normalizeSignedHeaders(headers) {
  return Object.entries(headers || {}).reduce((acc, [key, value]) => {
    acc[String(key).toLowerCase()] = String(value).replace(/\s+/g, ' ').trim();
    return acc;
  }, {});
}

function normalizeEndpoint(raw, useSSLRaw) {
  const value = cleanEnv(raw);
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return trimSlash(value);

  const useSSL = cleanEnv(useSSLRaw).toLowerCase() === 'true';
  return `${useSSL ? 'https' : 'http'}://${trimSlash(value)}`;
}

function safePublicStorageUrl(value) {
  if (!isLegacyStorageHost(value)) return value;

  for (const key of [
    'NEW_MINIO_PUBLIC_URL',
    'MINIO_PUBLIC_URL',
    'MINIO_PUBLIC_ENDPOINT',
    'S3_PUBLIC_URL',
  ]) {
    const candidate = normalizeEndpoint(
      process.env[key],
      process.env.MINIO_PUBLIC_USE_SSL ||
        process.env.MINIO_USE_SSL ||
        process.env.S3_USE_SSL
    );
    if (candidate && !isLegacyStorageHost(candidate)) return candidate;
  }

  return 'https://nb.consultio.com.br';
}

function isLegacyStorageHost(value) {
  const raw = cleanEnv(value);
  if (!raw) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.toLowerCase() === 'n.woopanel.com.br';
  } catch {
    return raw.toLowerCase().includes('n.woopanel.com.br');
  }
}

function trimSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function withPort(raw, port) {
  const value = cleanEnv(raw);
  const normalizedPort = cleanEnv(port);
  if (!value || !normalizedPort) return value;
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `http://${value}`
    );
    if (!url.port) url.port = normalizedPort;
    const output = /^https?:\/\//i.test(value)
      ? url.toString()
      : `${url.host}${url.pathname}`;
    return trimSlash(output);
  } catch {
    return /:\d+$/.test(value) ? value : `${value}:${normalizedPort}`;
  }
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

function canonicalizeSearchParams(params) {
  return [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${awsEncode(key)}=${awsEncode(value)}`)
    .join('&');
}

function awsEncode(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function cleanEtag(value) {
  return String(value || '').replace(/^"|"$/g, '');
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function firstXmlValue(xml, tag) {
  const match = String(xml || '').match(
    new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')
  );
  return match ? decodeXml(match[1]) : '';
}

function xmlBlocks(xml, tag) {
  return [
    ...String(xml || '').matchAll(
      new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi')
    ),
  ].map((match) => match[1]);
}

function parseBucketList(xml) {
  return xmlBlocks(xml, 'Bucket')
    .map((block) => ({
      name: firstXmlValue(block, 'Name'),
      creationDate: firstXmlValue(block, 'CreationDate'),
    }))
    .filter((bucket) => bucket.name);
}

function parseObjectList(xml) {
  const objects = xmlBlocks(xml, 'Contents')
    .map((block) => ({
      key: firstXmlValue(block, 'Key'),
      lastModified: firstXmlValue(block, 'LastModified'),
      etag: cleanEtag(firstXmlValue(block, 'ETag')),
      size: Number(firstXmlValue(block, 'Size') || 0),
      storageClass: firstXmlValue(block, 'StorageClass'),
    }))
    .filter((object) => object.key);

  return {
    objects,
    isTruncated: firstXmlValue(xml, 'IsTruncated').toLowerCase() === 'true',
    nextContinuationToken: firstXmlValue(xml, 'NextContinuationToken'),
  };
}

function parseLifecycleRules(xml) {
  return xmlBlocks(xml, 'Rule').map((block) => ({
    id: firstXmlValue(block, 'ID'),
    status: firstXmlValue(block, 'Status'),
    prefix: firstXmlValue(block, 'Prefix'),
    expirationDays: Number(
      firstXmlValue(firstXmlValue(block, 'Expiration') ? block : '', 'Days') ||
        0
    ),
  }));
}

function defaultLifecycleXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<LifecycleConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Rule>
    <ID>expire-old-versions</ID>
    <Status>Enabled</Status>
    <Filter><Prefix></Prefix></Filter>
    <NoncurrentVersionExpiration><NoncurrentDays>1</NoncurrentDays></NoncurrentVersionExpiration>
    <AbortIncompleteMultipartUpload><DaysAfterInitiation>1</DaysAfterInitiation></AbortIncompleteMultipartUpload>
  </Rule>
  <Rule>
    <ID>expire-temporary-media</ID>
    <Status>Enabled</Status>
    <Filter><Prefix>temp/</Prefix></Filter>
    <Expiration><Days>3</Days></Expiration>
  </Rule>
  <Rule>
    <ID>expire-whatsapp-audio</ID>
    <Status>Enabled</Status>
    <Filter><Prefix>whatsapp/media/audio/</Prefix></Filter>
    <Expiration><Days>15</Days></Expiration>
  </Rule>
  <Rule>
    <ID>expire-whatsapp-video</ID>
    <Status>Enabled</Status>
    <Filter><Prefix>whatsapp/media/video/</Prefix></Filter>
    <Expiration><Days>15</Days></Expiration>
  </Rule>
</LifecycleConfiguration>`;
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
