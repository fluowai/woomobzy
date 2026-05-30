import crypto from 'crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;

const DEFAULT_SCHEMAS = ['public', 'auth'];
const DEFAULT_BUCKETS = ['whatsapp-media', 'imobzyimg', 'imobzymsg', 'documents', 'exports'];
const TEXT_URL_COLUMNS = [
  'media_url',
  'file_url',
  'image_url',
  'avatar_url',
  'document_url',
  'attachment_url',
  'url',
];

export function getDefaultMigrationSelections() {
  return {
    schemas: DEFAULT_SCHEMAS,
    buckets: DEFAULT_BUCKETS,
    urlColumns: TEXT_URL_COLUMNS,
  };
}

export function encryptCredentials(payload) {
  const secret = getCredentialSecret();
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
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

export function decryptCredentials(value) {
  const secret = getCredentialSecret();
  const [version, ivValue, tagValue, encryptedValue] = String(value || '').split(':');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Formato de credencial criptografada inválido.');
  }

  const key = crypto.createHash('sha256').update(secret).digest();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}

export function maskCredentials(payload = {}) {
  const masked = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (/key|password|secret|token/i.test(key)) {
      masked[key] = maskSecret(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

export function sanitizePublicJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    source_supabase_url: job.source_supabase_url,
    target_supabase_url: job.target_supabase_url,
    target_minio_endpoint: job.target_minio_endpoint,
    selected_schemas: job.selected_schemas || DEFAULT_SCHEMAS,
    selected_buckets: job.selected_buckets || DEFAULT_BUCKETS,
    started_at: job.started_at,
    finished_at: job.finished_at,
    progress: job.progress || 0,
    dry_run_approved: Boolean(job.dry_run_approved),
    created_by: job.created_by,
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}

export async function testSupabaseConnection(config, label = 'Supabase') {
  validateSupabaseConfig(config, label);
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false },
  });
  const started = Date.now();
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return {
    ok: true,
    latencyMs: Date.now() - started,
    buckets: (data || []).map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
    })),
  };
}

export async function testPostgresConnection(config, label = 'Banco') {
  const client = new Client(buildPgConfig(config));
  const started = Date.now();
  try {
    await client.connect();
    const result = await client.query(`
      SELECT
        current_database() AS database_name,
        current_user AS user_name,
        version() AS version
    `);

    const [{ database_name, user_name, version }] = result.rows;
    return {
      ok: true,
      latencyMs: Date.now() - started,
      database: database_name,
      user: user_name,
      version,
    };
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  } finally {
    await closePg(client);
  }
}

export async function testMinioConnection(config) {
  validateMinioConfig(config);
  const bucket = config.bucket || config.bucketDestino || config.minioBucketDestino;
  const probeKey = `imobzy-migration-probe/${Date.now()}-${crypto.randomUUID()}.txt`;
  const body = Buffer.from('imobzy migration probe', 'utf8');

  const listBuckets = await signedMinioRequest(config, {
    method: 'GET',
  });

  let bucketCreated = false;
  if (bucket) {
    const head = await signedMinioRequest(config, {
      method: 'HEAD',
      bucket,
      allowStatuses: [200, 301, 302, 403, 404],
    });

    if (head.status === 404) {
      const create = await signedMinioRequest(config, {
        method: 'PUT',
        bucket,
        allowStatuses: [200, 409],
      });
      bucketCreated = create.status === 200;
    } else if (head.status >= 400) {
      throw new Error(`MinIO: bucket "${bucket}" não está acessível (HTTP ${head.status}).`);
    }

    await signedMinioRequest(config, {
      method: 'PUT',
      bucket,
      key: probeKey,
      body,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    });

    const read = await signedMinioRequest(config, {
      method: 'GET',
      bucket,
      key: probeKey,
    });

    const readBody = Buffer.from(await read.arrayBuffer()).toString('utf8');
    if (readBody !== body.toString('utf8')) {
      throw new Error('MinIO: arquivo de teste foi lido com conteúdo divergente.');
    }

    await signedMinioRequest(config, {
      method: 'DELETE',
      bucket,
      key: probeKey,
      allowStatuses: [200, 204, 404],
    });
  }

  return {
    ok: true,
    endpoint: buildMinioBaseUrl(config),
    bucket,
    bucketCreated,
    listBucketsStatus: listBuckets.status,
    writeReadDeleteProbe: Boolean(bucket),
  };
}

export async function collectDatabaseDiagnostics(config, schemas = DEFAULT_SCHEMAS) {
  const client = new Client(buildPgConfig(config));
  try {
    await client.connect();
    const params = [schemas];

    const [
      schemaRows,
      tableRows,
      routineRows,
      triggerRows,
      indexRows,
      policyRows,
      sequenceRows,
      extensionRows,
    ] = await Promise.all([
      client.query(
        `SELECT schema_name
           FROM information_schema.schemata
          WHERE schema_name = ANY($1)
          ORDER BY schema_name`,
        params
      ),
      client.query(
        `SELECT
           n.nspname AS schema_name,
           c.relname AS table_name,
           GREATEST(c.reltuples::bigint, 0) AS estimated_rows,
           pg_total_relation_size(c.oid) AS total_bytes
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind IN ('r', 'p')
           AND n.nspname = ANY($1)
         ORDER BY n.nspname, c.relname`,
        params
      ),
      client.query(
        `SELECT routine_schema AS schema_name, routine_name
           FROM information_schema.routines
          WHERE routine_schema = ANY($1)
          ORDER BY routine_schema, routine_name`,
        params
      ),
      client.query(
        `SELECT event_object_schema AS schema_name, trigger_name, event_object_table AS table_name
           FROM information_schema.triggers
          WHERE event_object_schema = ANY($1)
          ORDER BY event_object_schema, event_object_table, trigger_name`,
        params
      ),
      client.query(
        `SELECT schemaname AS schema_name, tablename AS table_name, indexname
           FROM pg_indexes
          WHERE schemaname = ANY($1)
          ORDER BY schemaname, tablename, indexname`,
        params
      ),
      client.query(
        `SELECT schemaname AS schema_name, tablename AS table_name, policyname
           FROM pg_policies
          WHERE schemaname = ANY($1)
          ORDER BY schemaname, tablename, policyname`,
        params
      ),
      client.query(
        `SELECT sequence_schema AS schema_name, sequence_name
           FROM information_schema.sequences
          WHERE sequence_schema = ANY($1)
          ORDER BY sequence_schema, sequence_name`,
        params
      ),
      client.query(
        `SELECT extname AS name, extversion AS version
           FROM pg_extension
          ORDER BY extname`
      ),
    ]);

    const tables = tableRows.rows.map((row) => ({
      schema: row.schema_name,
      table: row.table_name,
      estimatedRows: Number(row.estimated_rows || 0),
      totalBytes: Number(row.total_bytes || 0),
    }));

    return {
      schemas: schemaRows.rows.map((row) => row.schema_name),
      tables,
      estimatedRows: tables.reduce((sum, table) => sum + table.estimatedRows, 0),
      totalBytes: tables.reduce((sum, table) => sum + table.totalBytes, 0),
      functions: routineRows.rows.length,
      triggers: triggerRows.rows.length,
      indexes: indexRows.rows.length,
      policies: policyRows.rows.length,
      sequences: sequenceRows.rows.length,
      extensions: extensionRows.rows,
      details: {
        functions: routineRows.rows.slice(0, 200),
        triggers: triggerRows.rows.slice(0, 200),
        indexes: indexRows.rows.slice(0, 200),
        policies: policyRows.rows.slice(0, 200),
        sequences: sequenceRows.rows.slice(0, 200),
      },
    };
  } finally {
    await closePg(client);
  }
}

export async function collectSupabaseStorageDiagnostics(config, buckets = DEFAULT_BUCKETS) {
  validateSupabaseConfig(config, 'Supabase origem');
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: allBuckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Storage origem: ${error.message}`);

  const bucketSet = new Set((allBuckets || []).map((bucket) => bucket.name));
  const selected = buckets.map((bucket) => ({
    name: bucket,
    exists: bucketSet.has(bucket),
    filesSampled: 0,
    sampleBytes: 0,
    inaccessible: false,
    samples: [],
  }));

  for (const bucket of selected) {
    if (!bucket.exists) continue;
    try {
      const scanned = await listSupabaseObjectsSample(supabase, bucket.name);
      bucket.filesSampled = scanned.files.length;
      bucket.sampleBytes = scanned.files.reduce((sum, file) => sum + Number(file.size || 0), 0);
      bucket.samples = scanned.files.slice(0, 20);
    } catch (scanError) {
      bucket.inaccessible = true;
      bucket.error = scanError.message;
    }
  }

  return {
    buckets: selected,
    availableBuckets: (allBuckets || []).map((bucket) => ({
      name: bucket.name,
      public: bucket.public,
    })),
  };
}

export async function buildDryRunReport({ source, target, minio, schemas, buckets }) {
  const [sourceDb, targetDb, sourceStorage] = await Promise.all([
    collectDatabaseDiagnostics(source, schemas),
    collectDatabaseDiagnostics(target, schemas),
    collectSupabaseStorageDiagnostics(source, buckets),
  ]);

  const warnings = [];
  const blockers = [];
  const sourceTables = new Set(sourceDb.tables.map((table) => `${table.schema}.${table.table}`));
  const targetTables = new Set(targetDb.tables.map((table) => `${table.schema}.${table.table}`));
  const conflictingTables = [...sourceTables].filter((table) => targetTables.has(table));

  if (conflictingTables.length) {
    warnings.push({
      code: 'TARGET_TABLES_EXIST',
      message: 'O destino já possui tabelas com os mesmos nomes. A migração real precisa de estratégia explícita.',
      count: conflictingTables.length,
      sample: conflictingTables.slice(0, 20),
    });
  }

  const missingBuckets = sourceStorage.buckets.filter((bucket) => !bucket.exists);
  if (missingBuckets.length) {
    warnings.push({
      code: 'SOURCE_BUCKETS_MISSING',
      message: 'Alguns buckets selecionados não existem na origem.',
      buckets: missingBuckets.map((bucket) => bucket.name),
    });
  }

  try {
    await testMinioConnection(minio);
  } catch (error) {
    blockers.push({
      code: 'MINIO_NOT_READY',
      message: error.message,
    });
  }

  return {
    status: blockers.length ? 'corrections_required' : 'ready',
    ready: blockers.length === 0,
    sourceDatabase: sourceDb,
    targetDatabase: targetDb,
    sourceStorage,
    conflicts: {
      tables: conflictingTables,
    },
    estimates: {
      tables: sourceDb.tables.length,
      estimatedRows: sourceDb.estimatedRows,
      databaseBytes: sourceDb.totalBytes,
      buckets: sourceStorage.buckets.filter((bucket) => bucket.exists).length,
      sampledFiles: sourceStorage.buckets.reduce((sum, bucket) => sum + bucket.filesSampled, 0),
      sampledStorageBytes: sourceStorage.buckets.reduce((sum, bucket) => sum + bucket.sampleBytes, 0),
    },
    warnings,
    blockers,
  };
}

async function listSupabaseObjectsSample(supabase, bucket, prefix = '', depth = 0, limit = 250) {
  if (depth > 4 || limit <= 0) return { files: [] };

  const { data, error } = await supabase.storage.from(bucket).list(prefix || undefined, {
    limit: Math.min(limit, 1000),
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw error;

  const files = [];
  for (const item of data || []) {
    if (files.length >= limit) break;
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id || item.metadata) {
      files.push({
        path: itemPath,
        size: Number(item.metadata?.size || 0),
        contentType: item.metadata?.mimetype || item.metadata?.contentType || null,
        updatedAt: item.updated_at || item.created_at || null,
      });
    } else {
      const nested = await listSupabaseObjectsSample(
        supabase,
        bucket,
        itemPath,
        depth + 1,
        limit - files.length
      );
      files.push(...nested.files);
    }
  }

  return { files };
}

function getCredentialSecret() {
  const secret = [
    process.env.MIGRATION_CREDENTIALS_SECRET,
    process.env.SUPABASE_JWT_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]
    .map((value) => String(value || '').trim().replace(/^["']|["']$/g, ''))
    .find((value) => value.length >= 24);

  if (!secret || secret.length < 24) {
    throw new Error(
      'Configure MIGRATION_CREDENTIALS_SECRET com pelo menos 24 caracteres antes de salvar credenciais de migração.'
    );
  }

  return secret;
}

function maskSecret(value) {
  if (!value) return '';
  const clean = String(value);
  if (clean.length <= 8) return '********';
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

function validateSupabaseConfig(config, label) {
  if (!config?.supabaseUrl || !config?.serviceRoleKey) {
    throw new Error(`${label}: URL e service role key são obrigatórios.`);
  }
}

function validateMinioConfig(config) {
  if (!config?.endpoint || !config?.accessKey || !config?.secretKey) {
    throw new Error('MinIO: endpoint, access key e secret key são obrigatórios.');
  }
}

function buildPgConfig(config) {
  const sslMode = String(config?.sslMode || '').toLowerCase();
  return {
    host: config?.dbHost,
    port: Number(config?.dbPort || 5432),
    database: config?.dbName || 'postgres',
    user: config?.dbUser,
    password: config?.dbPassword,
    ssl: sslMode === 'disable' || sslMode === 'false'
      ? false
      : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    statement_timeout: 60000,
  };
}

async function closePg(client) {
  try {
    await client.end();
  } catch {
    // Ignore close failures.
  }
}

function buildMinioBaseUrl(config) {
  const endpoint = String(config.endpoint || '').trim().replace(/\/+$/, '');
  const hasProtocol = /^https?:\/\//i.test(endpoint);
  const protocol = config.useSsl === false || config.useSSL === false ? 'http' : 'https';
  const base = hasProtocol ? endpoint : `${protocol}://${endpoint}`;
  const url = new URL(base);
  const port = config.port || config.minioPort;
  if (port && !url.port) url.port = String(port);
  return url.toString().replace(/\/+$/, '');
}

async function signedMinioRequest(config, options) {
  const {
    method,
    bucket,
    key,
    body = Buffer.alloc(0),
    headers = {},
    allowStatuses = [200, 204],
  } = options;
  const baseUrl = buildMinioBaseUrl(config);
  const url = new URL(baseUrl);

  const encodedPath = [bucket, key]
    .filter(Boolean)
    .map((part) => String(part).split('/').map(encodeURIComponent).join('/'))
    .join('/');
  url.pathname = encodedPath ? `/${encodedPath}` : '/';

  const requestHeaders = signS3Request({
    method,
    url,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    body,
    headers,
  });

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: ['GET', 'HEAD'].includes(method) ? undefined : body,
  });

  if (!allowStatuses.includes(response.status)) {
    const text = await response.text().catch(() => '');
    throw new Error(`MinIO ${method} ${url.pathname}: HTTP ${response.status} ${text.slice(0, 240)}`);
  }

  return response;
}

function signS3Request({ method, url, accessKey, secretKey, body, headers }) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'us-east-1';
  const service = 's3';
  const payloadHash = crypto.createHash('sha256').update(body || '').digest('hex');
  const host = url.host;

  const normalizedHeaders = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...Object.fromEntries(
      Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), String(value)])
    ),
  };

  const sortedHeaderKeys = Object.keys(normalizedHeaders).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((key) => `${key}:${String(normalizedHeaders[key]).trim()}\n`)
    .join('');
  const signedHeaders = sortedHeaderKeys.join(';');
  const canonicalQuery = [...url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const canonicalUri = url.pathname
    .split('/')
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join('/');
  const canonicalRequest = [
    method,
    canonicalUri || '/',
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    ...headers,
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
  return crypto.createHmac('sha256', kService).update('aws4_request').digest();
}
