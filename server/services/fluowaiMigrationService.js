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
    mode: 'storage_only_s3',
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

export async function testS3StorageConnection(config, label = 'Storage S3') {
  validateS3Config(config, label);
  const started = Date.now();
  const listBuckets = await signedMinioRequest(config, {
    method: 'GET',
    allowStatuses: [200],
  });
  const xml = await listBuckets.text();
  const buckets = [...xml.matchAll(/<Bucket>[\s\S]*?<Name>([\s\S]*?)<\/Name>[\s\S]*?<\/Bucket>/g)]
    .map((match) => decodeXml(match[1]));

  return {
    ok: true,
    endpoint: buildMinioBaseUrl(config),
    region: config.region || 'us-east-1',
    latencyMs: Date.now() - started,
    buckets,
  };
}

export async function collectS3StorageDiagnostics(config, buckets = DEFAULT_BUCKETS) {
  validateS3Config(config, 'Storage origem S3');
  const selected = [];

  for (const bucketName of buckets) {
    const bucket = {
      name: bucketName,
      exists: false,
      files: 0,
      totalBytes: 0,
      largestFiles: [],
      contentTypes: {},
      samples: [],
      inaccessible: false,
    };

    try {
      const head = await signedMinioRequest(config, {
        method: 'HEAD',
        bucket: bucketName,
        allowStatuses: [200, 301, 302, 403, 404],
      });

      if (head.status === 404) {
        selected.push(bucket);
        continue;
      }

      if (head.status >= 400) {
        bucket.inaccessible = true;
        bucket.error = `Bucket inacessível via S3 (HTTP ${head.status}).`;
        selected.push(bucket);
        continue;
      }

      bucket.exists = true;
      const objects = await listAllS3Objects(config, bucketName);
      bucket.files = objects.length;
      bucket.totalBytes = objects.reduce((sum, object) => sum + object.size, 0);
      bucket.largestFiles = [...objects]
        .sort((a, b) => b.size - a.size)
        .slice(0, 10);
      bucket.samples = objects.slice(0, 20);
      for (const object of objects) {
        const extension = object.key.includes('.') ? object.key.split('.').pop()?.toLowerCase() : 'sem-extensao';
        const group = extension || 'sem-extensao';
        bucket.contentTypes[group] = (bucket.contentTypes[group] || 0) + 1;
      }
    } catch (error) {
      bucket.inaccessible = true;
      bucket.error = error.message;
    }

    selected.push(bucket);
  }

  return {
    mode: 'storage_only_s3',
    buckets: selected,
    totals: {
      buckets: selected.filter((bucket) => bucket.exists).length,
      files: selected.reduce((sum, bucket) => sum + bucket.files, 0),
      bytes: selected.reduce((sum, bucket) => sum + bucket.totalBytes, 0),
    },
  };
}

export async function buildStorageOnlyDryRunReport({ source, minio, buckets }) {
  const [sourceStorage, minioCheck] = await Promise.all([
    collectS3StorageDiagnostics(source, buckets),
    testMinioConnection(minio).catch((error) => ({ ok: false, error: error.message })),
  ]);

  const warnings = [];
  const blockers = [];
  const missingBuckets = sourceStorage.buckets.filter((bucket) => !bucket.exists);
  const inaccessibleBuckets = sourceStorage.buckets.filter((bucket) => bucket.inaccessible);

  if (missingBuckets.length) {
    warnings.push({
      code: 'SOURCE_BUCKETS_MISSING',
      message: 'Alguns buckets selecionados não existem na origem.',
      buckets: missingBuckets.map((bucket) => bucket.name),
    });
  }

  if (inaccessibleBuckets.length) {
    blockers.push({
      code: 'SOURCE_BUCKETS_INACCESSIBLE',
      message: 'Há buckets de origem inacessíveis via S3.',
      buckets: inaccessibleBuckets.map((bucket) => ({
        name: bucket.name,
        error: bucket.error,
      })),
    });
  }

  if (!minioCheck.ok) {
    blockers.push({
      code: 'MINIO_NOT_READY',
      message: minioCheck.error,
    });
  }

  return {
    status: blockers.length ? 'corrections_required' : 'ready',
    ready: blockers.length === 0,
    mode: 'storage_only_s3',
    sourceStorage,
    minio: minioCheck,
    estimates: {
      buckets: sourceStorage.totals.buckets,
      files: sourceStorage.totals.files,
      storageBytes: sourceStorage.totals.bytes,
    },
    warnings,
    blockers,
  };
}

export async function migrateStorageS3ToMinio({ source, minio, buckets, onLog, onFile, onProgress }) {
  validateS3Config(source, 'Storage origem S3');
  validateMinioConfig(minio);

  const bucketObjects = [];
  for (const bucket of buckets) {
    const objects = await listAllS3Objects(source, bucket);
    bucketObjects.push({ bucket, objects });
  }

  const totalFiles = bucketObjects.reduce((sum, item) => sum + item.objects.length, 0);
  let processed = 0;
  let copied = 0;
  let skipped = 0;
  let failed = 0;
  let bytesCopied = 0;

  await onLog?.('info', `Migração storage-only iniciada para ${totalFiles} arquivos.`);

  for (const { bucket, objects } of bucketObjects) {
    const destinationBucket = minio.bucket || bucket;
    const destinationPrefix = minio.bucket ? `${bucket}/` : '';

    await ensureDestinationBucket(minio, destinationBucket);
    await onLog?.('info', `Bucket ${bucket}: ${objects.length} arquivos para processar.`);

    for (const object of objects) {
      processed++;
      const destinationKey = `${destinationPrefix}${object.key}`;
      const oldUrl = buildPublicObjectUrl(source, bucket, object.key);
      const newUrl = buildPublicObjectUrl(minio, destinationBucket, destinationKey);
      const basePayload = {
        old_url: oldUrl,
        new_url: newUrl,
        bucket,
        path: object.key,
        size: object.size,
        content_type: null,
      };

      try {
        const existing = await signedMinioRequest(minio, {
          method: 'HEAD',
          bucket: destinationBucket,
          key: destinationKey,
          allowStatuses: [200, 404],
        });

        if (existing.status === 200 && Number(existing.headers.get('content-length') || 0) === object.size) {
          skipped++;
          await onFile?.({ ...basePayload, status: 'skipped' });
          await onProgress?.({ processed, totalFiles, copied, skipped, failed, bytesCopied });
          continue;
        }

        const sourceResponse = await signedMinioRequest(source, {
          method: 'GET',
          bucket,
          key: object.key,
          allowStatuses: [200],
        });
        const buffer = Buffer.from(await sourceResponse.arrayBuffer());
        const contentType = sourceResponse.headers.get('content-type') || inferContentType(object.key);

        await signedMinioRequest(minio, {
          method: 'PUT',
          bucket: destinationBucket,
          key: destinationKey,
          body: buffer,
          headers: {
            'content-type': contentType,
          },
          allowStatuses: [200],
        });

        const validation = await signedMinioRequest(minio, {
          method: 'HEAD',
          bucket: destinationBucket,
          key: destinationKey,
          allowStatuses: [200],
        });
        const destinationSize = Number(validation.headers.get('content-length') || 0);
        if (destinationSize !== object.size) {
          throw new Error(`Tamanho divergente após upload: origem=${object.size}, destino=${destinationSize}.`);
        }

        copied++;
        bytesCopied += object.size;
        await onFile?.({ ...basePayload, content_type: contentType, status: 'copied' });
      } catch (error) {
        failed++;
        await onFile?.({ ...basePayload, status: 'failed', error_message: error.message });
        await onLog?.('error', `Falha ao migrar ${bucket}/${object.key}: ${error.message}`);
      }

      await onProgress?.({ processed, totalFiles, copied, skipped, failed, bytesCopied });
    }
  }

  const summary = { totalFiles, processed, copied, skipped, failed, bytesCopied };
  await onLog?.(failed ? 'warn' : 'info', 'Migração storage-only finalizada.', summary);
  return summary;
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

function validateS3Config(config, label) {
  if (!config?.endpoint || !config?.accessKey || !config?.secretKey) {
    throw new Error(`${label}: endpoint, access key e secret key são obrigatórios.`);
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
    query = {},
    body = Buffer.alloc(0),
    headers = {},
    allowStatuses = [200, 204],
  } = options;
  const baseUrl = buildMinioBaseUrl(config);
  const url = new URL(baseUrl);
  const basePath = url.pathname.replace(/\/+$/, '');

  const encodedPath = [bucket, key]
    .filter(Boolean)
    .map((part) => String(part).split('/').map(encodeURIComponent).join('/'))
    .join('/');
  url.pathname = [basePath, encodedPath]
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/') || '/';
  for (const [queryKey, queryValue] of Object.entries(query)) {
    if (queryValue !== undefined && queryValue !== null && queryValue !== '') {
      url.searchParams.set(queryKey, String(queryValue));
    }
  }

  const requestHeaders = signS3Request({
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
    headers: requestHeaders,
    body: ['GET', 'HEAD'].includes(method) ? undefined : body,
  });

  if (!allowStatuses.includes(response.status)) {
    const text = await response.text().catch(() => '');
    throw new Error(`MinIO ${method} ${url.pathname}: HTTP ${response.status} ${text.slice(0, 240)}`);
  }

  return response;
}

function signS3Request({ method, url, accessKey, secretKey, region = 'us-east-1', body, headers }) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
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

async function listAllS3Objects(config, bucket) {
  const objects = [];
  let continuationToken = null;

  do {
    const query = {
      'list-type': '2',
      'max-keys': '1000',
    };
    if (continuationToken) query['continuation-token'] = continuationToken;

    const response = await signedMinioRequest(config, {
      method: 'GET',
      bucket,
      query,
      allowStatuses: [200],
    });
    const xml = await response.text();
    const parsed = parseListBucketResult(xml);
    objects.push(...parsed.objects);
    continuationToken = parsed.isTruncated ? parsed.nextContinuationToken : null;
  } while (continuationToken);

  return objects;
}

function parseListBucketResult(xml) {
  const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((match) => {
    const content = match[1];
    return {
      key: decodeXml(readXmlTag(content, 'Key') || ''),
      lastModified: decodeXml(readXmlTag(content, 'LastModified') || ''),
      etag: decodeXml(readXmlTag(content, 'ETag') || '').replace(/^"|"$/g, ''),
      size: Number(readXmlTag(content, 'Size') || 0),
    };
  }).filter((object) => object.key);

  return {
    objects,
    isTruncated: /<IsTruncated>true<\/IsTruncated>/i.test(xml),
    nextContinuationToken: decodeXml(readXmlTag(xml, 'NextContinuationToken') || ''),
  };
}

function readXmlTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`));
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

async function ensureDestinationBucket(config, bucket) {
  const head = await signedMinioRequest(config, {
    method: 'HEAD',
    bucket,
    allowStatuses: [200, 301, 302, 403, 404],
  });

  if (head.status === 404) {
    await signedMinioRequest(config, {
      method: 'PUT',
      bucket,
      allowStatuses: [200, 409],
    });
    return;
  }

  if (head.status >= 400) {
    throw new Error(`Bucket destino "${bucket}" não está acessível (HTTP ${head.status}).`);
  }
}

function buildPublicObjectUrl(config, bucket, key) {
  const base = String(config.publicBaseUrl || '').trim().replace(/\/+$/, '');
  if (base) return `${base}/${encodePublicPath(bucket)}/${encodePublicPath(key)}`;

  if (config.supabaseUrl) {
    return `${String(config.supabaseUrl).replace(/\/+$/, '')}/storage/v1/object/public/${encodePublicPath(bucket)}/${encodePublicPath(key)}`;
  }

  return `${buildMinioBaseUrl(config)}/${encodePublicPath(bucket)}/${encodePublicPath(key)}`;
}

function encodePublicPath(value) {
  return String(value || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function inferContentType(key) {
  const ext = String(key).split('.').pop()?.toLowerCase();
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    opus: 'audio/ogg',
    wav: 'audio/wav',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    csv: 'text/csv',
    json: 'application/json',
  };
  return types[ext] || 'application/octet-stream';
}
