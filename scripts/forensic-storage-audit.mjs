#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_BUCKETS = [
  process.env.MINIO_MEDIA_BUCKET ||
    process.env.S3_MEDIA_BUCKET ||
    'imobzy-media',
  process.env.MINIO_WHATSAPP_BUCKET ||
    process.env.S3_WHATSAPP_BUCKET ||
    'whatsapp-media',
  process.env.MINIO_DOCUMENTS_BUCKET ||
    process.env.S3_DOCUMENTS_BUCKET ||
    'imobzy-documents',
  process.env.MINIO_EXPORTS_BUCKET ||
    process.env.S3_EXPORTS_BUCKET ||
    'imobzy-exports',
  process.env.MINIO_BACKUPS_BUCKET ||
    process.env.S3_BACKUPS_BUCKET ||
    'imobzy-backups',
].filter(Boolean);

const args = parseArgs(process.argv.slice(2));
const buckets = args.bucket?.length
  ? args.bucket
  : [...new Set(DEFAULT_BUCKETS)];
const outDir = args.out || 'scratch/forensic-storage-audit';
const sampleLimit = Number(args.sample || 50);

main().catch((error) => {
  console.error(`[forensic-storage-audit] ${error.message}`);
  process.exit(1);
});

async function main() {
  const config = getS3Config();
  await fs.mkdir(outDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const report = {
    startedAt,
    endpoint: maskEndpoint(config.endpoint),
    buckets: [],
    totals: { objects: 0, bytes: 0 },
    duplicateCandidates: [],
  };

  for (const bucket of buckets) {
    console.log(`Auditing bucket ${bucket}...`);
    const objects = await listAllObjects(config, bucket);
    const bucketReport = summarizeBucket(bucket, objects, sampleLimit);
    report.buckets.push(bucketReport);
    report.totals.objects += bucketReport.objects;
    report.totals.bytes += bucketReport.bytes;

    await fs.writeFile(
      path.join(outDir, `${safeName(bucket)}.objects.json`),
      JSON.stringify(objects, null, 2)
    );
  }

  report.duplicateCandidates = findDuplicateCandidates(report.buckets);

  const finalPath = path.join(
    outDir,
    `forensic-storage-report-${Date.now()}.json`
  );
  await fs.writeFile(finalPath, JSON.stringify(report, null, 2));
  console.log(`Report written to ${finalPath}`);
  console.log(
    `Total: ${report.totals.objects} objects, ${formatBytes(report.totals.bytes)}`
  );
}

function summarizeBucket(bucket, objects, sampleLimit) {
  const byExtension = new Map();
  const byTopPrefix = new Map();
  const byDay = new Map();
  const etagGroups = new Map();
  const largest = [...objects]
    .sort((a, b) => b.size - a.size)
    .slice(0, sampleLimit);

  for (const object of objects) {
    addGroup(byExtension, extensionOf(object.key), object.size);
    addGroup(byTopPrefix, topPrefixOf(object.key), object.size);
    addGroup(byDay, dayOf(object.lastModified), object.size);

    if (object.etag) {
      const duplicateKey = `${object.size}:${object.etag}`;
      const group = etagGroups.get(duplicateKey) || [];
      group.push({
        bucket,
        key: object.key,
        size: object.size,
        etag: object.etag,
      });
      etagGroups.set(duplicateKey, group);
    }
  }

  return {
    bucket,
    objects: objects.length,
    bytes: sum(objects.map((object) => object.size)),
    byExtension: mapToSortedArray(byExtension),
    byTopPrefix: mapToSortedArray(byTopPrefix),
    byDay: mapToSortedArray(byDay),
    largest,
    duplicateCandidates: [...etagGroups.values()]
      .filter((group) => group.length > 1)
      .sort((a, b) => b[0].size * b.length - a[0].size * a.length)
      .slice(0, sampleLimit),
  };
}

function findDuplicateCandidates(bucketReports) {
  const groups = new Map();
  for (const bucketReport of bucketReports) {
    for (const group of bucketReport.duplicateCandidates) {
      const key = `${group[0].size}:${group[0].etag}`;
      groups.set(key, [...(groups.get(key) || []), ...group]);
    }
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .sort((a, b) => b[0].size * b.length - a[0].size * a.length)
    .slice(0, sampleLimit);
}

async function listAllObjects(config, bucket) {
  const objects = [];
  let continuationToken = '';

  do {
    const query = { 'list-type': '2', 'max-keys': '1000' };
    if (continuationToken) query['continuation-token'] = continuationToken;

    const response = await signedRequest(config, {
      method: 'GET',
      bucket,
      query,
      allowStatuses: [200, 404],
    });

    if (response.status === 404) {
      console.warn(`Bucket ${bucket} not found.`);
      return objects;
    }

    const xml = await response.text();
    const parsed = parseListBucketResult(xml);
    objects.push(...parsed.objects);
    continuationToken = parsed.isTruncated ? parsed.nextContinuationToken : '';
  } while (continuationToken);

  return objects;
}

async function signedRequest(
  config,
  {
    method,
    bucket,
    query = {},
    body = Buffer.alloc(0),
    headers = {},
    allowStatuses = [200],
  }
) {
  const url = new URL(config.endpoint);
  url.pathname = ['', bucket].filter(Boolean).join('/');
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }

  const signedHeaders = signS3Request({
    method,
    url,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
    body,
    headers,
  });

  const response = await fetch(url, {
    method,
    headers: signedHeaders,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  });

  if (!allowStatuses.includes(response.status)) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `${method} ${bucket} failed with HTTP ${response.status}: ${text.slice(0, 300)}`
    );
  }

  return response;
}

function signS3Request({
  method,
  url,
  accessKey,
  secretKey,
  region,
  body,
  headers,
}) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = crypto
    .createHash('sha256')
    .update(body || '')
    .digest('hex');
  const normalizedHeaders = {
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...Object.fromEntries(
      Object.entries(headers || {}).map(([key, value]) => [
        key.toLowerCase(),
        String(value),
      ])
    ),
  };
  const sortedHeaderKeys = Object.keys(normalizedHeaders).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((key) => `${key}:${normalizedHeaders[key].trim()}\n`)
    .join('');
  const signedHeaders = sortedHeaderKeys.join(';');
  const canonicalQuery = [...url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&');
  const canonicalRequest = [
    method,
    url.pathname || '/',
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const signature = crypto
    .createHmac('sha256', signingKey(secretKey, dateStamp, region))
    .update(stringToSign)
    .digest('hex');

  return {
    ...headers,
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function signingKey(secretKey, dateStamp, region) {
  const kDate = crypto
    .createHmac('sha256', `AWS4${secretKey}`)
    .update(dateStamp)
    .digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
  return crypto.createHmac('sha256', kService).update('aws4_request').digest();
}

function parseListBucketResult(xml) {
  const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
    .map((match) => {
      const content = match[1];
      return {
        key: decodeXml(readXmlTag(content, 'Key')),
        lastModified: decodeXml(readXmlTag(content, 'LastModified')),
        etag: decodeXml(readXmlTag(content, 'ETag')).replace(/^"|"$/g, ''),
        size: Number(readXmlTag(content, 'Size') || 0),
      };
    })
    .filter((object) => object.key);

  return {
    objects,
    isTruncated: /<IsTruncated>true<\/IsTruncated>/i.test(xml),
    nextContinuationToken: decodeXml(readXmlTag(xml, 'NextContinuationToken')),
  };
}

function getS3Config() {
  const endpoint = normalizeEndpoint(
    firstEnv(['MINIO_ENDPOINT', 'S3_ENDPOINT', 'AWS_ENDPOINT_URL'])
  );
  const accessKey = firstEnv([
    'MINIO_ACCESS_KEY',
    'MINIO_ROOT_USER',
    'AWS_ACCESS_KEY_ID',
    'S3_ACCESS_KEY_ID',
  ]);
  const secretKey = firstEnv([
    'MINIO_SECRET_KEY',
    'MINIO_ROOT_PASSWORD',
    'AWS_SECRET_ACCESS_KEY',
    'S3_SECRET_ACCESS_KEY',
  ]);
  const region =
    firstEnv(['MINIO_REGION', 'AWS_REGION', 'S3_REGION']) || 'us-east-1';

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error(
      'Configure MINIO_ENDPOINT, MINIO_ACCESS_KEY and MINIO_SECRET_KEY before running this audit.'
    );
  }

  return { endpoint, accessKey, secretKey, region };
}

function parseArgs(rawArgs) {
  const parsed = { bucket: [] };
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === '--bucket') parsed.bucket.push(rawArgs[++i]);
    else if (arg === '--out') parsed.out = rawArgs[++i];
    else if (arg === '--sample') parsed.sample = rawArgs[++i];
  }
  return parsed;
}

function addGroup(map, key, bytes) {
  const current = map.get(key) || { key, objects: 0, bytes: 0 };
  current.objects += 1;
  current.bytes += Number(bytes || 0);
  map.set(key, current);
}

function mapToSortedArray(map) {
  return [...map.values()].sort((a, b) => b.bytes - a.bytes);
}

function extensionOf(key) {
  const base =
    String(key || '')
      .split('/')
      .pop() || '';
  const match = base.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '(sem-extensao)';
}

function topPrefixOf(key) {
  return (
    String(key || '')
      .split('/')
      .filter(Boolean)[0] || '(raiz)'
  );
}

function dayOf(value) {
  return String(value || '').slice(0, 10) || '(sem-data)';
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function readXmlTag(xml, tagName) {
  const match = String(xml || '').match(
    new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`)
  );
  return match?.[1] || '';
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function firstEnv(keys) {
  return keys.map((key) => clean(process.env[key])).find(Boolean) || '';
}

function clean(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function normalizeEndpoint(raw) {
  const value = clean(raw).replace(/\/+$/, '');
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `http://${value}`;
}

function maskEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '(invalid)';
  }
}

function safeName(value) {
  return String(value || 'bucket').replace(/[^a-zA-Z0-9._-]/g, '-');
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Number(bytes || 0);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}
