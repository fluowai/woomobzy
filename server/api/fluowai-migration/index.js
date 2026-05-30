import express from 'express';
import { verifySuperAdmin } from '../../middleware/auth.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  buildDryRunReport,
  collectDatabaseDiagnostics,
  collectSupabaseStorageDiagnostics,
  decryptCredentials,
  encryptCredentials,
  getDefaultMigrationSelections,
  maskCredentials,
  sanitizePublicJob,
  testMinioConnection,
  testPostgresConnection,
  testSupabaseConnection,
} from '../../services/fluowaiMigrationService.js';

const router = express.Router();

router.use(verifySuperAdmin);

router.get('/defaults', (_req, res) => {
  res.json({
    success: true,
    defaults: getDefaultMigrationSelections(),
    phase: 'diagnostic_only',
  });
});

router.get('/jobs', async (_req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('migration_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, jobs: (data || []).map(sanitizePublicJob) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    const [credentials, logs, errors, steps] = await Promise.all([
      loadMaskedCredentials(req.params.id),
      loadLogs(req.params.id),
      loadErrors(req.params.id),
      loadSteps(req.params.id),
    ]);

    res.json({
      success: true,
      job: sanitizePublicJob(job),
      credentials,
      logs,
      errors,
      steps,
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/jobs', async (req, res) => {
  try {
    const body = req.body || {};
    const source = normalizeSourceConfig(body.source || {});
    const target = normalizeTargetConfig(body.target || {});
    const minio = normalizeMinioConfig(body.minio || {});
    const selectedSchemas = sanitizeList(body.selectedSchemas, getDefaultMigrationSelections().schemas);
    const selectedBuckets = sanitizeList(body.selectedBuckets, getDefaultMigrationSelections().buckets);
    const supabase = getSupabaseServer();

    const { data: job, error } = await supabase
      .from('migration_jobs')
      .insert({
        status: 'draft',
        source_supabase_url: source.supabaseUrl || null,
        target_supabase_url: target.supabaseUrl || null,
        target_minio_endpoint: minio.endpoint || null,
        selected_schemas: selectedSchemas,
        selected_buckets: selectedBuckets,
        created_by: req.user.id,
      })
      .select('*')
      .single();

    if (error) throw error;

    await Promise.all([
      saveCredentials(job.id, 'source', source, req.user.id),
      saveCredentials(job.id, 'target', target, req.user.id),
      saveCredentials(job.id, 'minio', minio, req.user.id),
      writeLog(job.id, 'info', 'connections', 'Job de migração criado em modo diagnóstico.', {
        source: maskCredentials(source),
        target: maskCredentials(target),
        minio: maskCredentials(minio),
      }),
    ]);

    res.status(201).json({
      success: true,
      job: sanitizePublicJob(job),
      credentials: {
        source: maskCredentials(source),
        target: maskCredentials(target),
        minio: maskCredentials(minio),
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/jobs/:id/test-connections', async (req, res) => {
  try {
    await updateJob(req.params.id, { status: 'testing', progress: 10 });
    await upsertStep(req.params.id, 'connections', 'running', 10);

    const credentials = await loadCredentials(req.params.id);
    const checks = {};

    for (const check of [
      ['sourceSupabase', () => testSupabaseConnection(credentials.source, 'Supabase origem')],
      ['targetSupabase', () => testSupabaseConnection(credentials.target, 'Supabase destino')],
      ['sourceDatabase', () => testPostgresConnection(credentials.source, 'Banco origem')],
      ['targetDatabase', () => testPostgresConnection(credentials.target, 'Banco destino')],
      ['minio', () => testMinioConnection(credentials.minio)],
    ]) {
      const [name, fn] = check;
      try {
        checks[name] = await fn();
        await writeLog(req.params.id, 'info', 'connections', `${name} conectado com sucesso.`);
      } catch (error) {
        checks[name] = { ok: false, error: error.message };
        await writeError(req.params.id, 'connections', 'connection', name, error.message);
        await writeLog(req.params.id, 'error', 'connections', `${name} falhou.`, {
          error: error.message,
        });
      }
    }

    const ok = Object.values(checks).every((check) => check.ok);
    await upsertStep(req.params.id, 'connections', ok ? 'completed' : 'failed', 100, { checks });
    await updateJob(req.params.id, { status: ok ? 'ready' : 'failed', progress: ok ? 20 : 10 });

    res.json({ success: true, ok, checks });
  } catch (error) {
    await updateJob(req.params.id, { status: 'failed' }).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

router.post('/jobs/:id/diagnose', async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    const credentials = await loadCredentials(req.params.id);
    await upsertStep(job.id, 'diagnostic', 'running', 10);
    await writeLog(job.id, 'info', 'diagnostic', 'Diagnóstico iniciado em modo somente leitura.');

    const [sourceDatabase, targetDatabase, sourceStorage] = await Promise.all([
      collectDatabaseDiagnostics(credentials.source, job.selected_schemas),
      collectDatabaseDiagnostics(credentials.target, job.selected_schemas),
      collectSupabaseStorageDiagnostics(credentials.source, job.selected_buckets),
    ]);

    const diagnostic = {
      sourceDatabase,
      targetDatabase,
      sourceStorage,
      generatedAt: new Date().toISOString(),
    };

    await upsertStep(job.id, 'diagnostic', 'completed', 100, diagnostic);
    await updateJob(job.id, { status: 'ready', progress: 35 });
    await writeLog(job.id, 'info', 'diagnostic', 'Diagnóstico concluído.', summarizeDiagnostic(diagnostic));

    res.json({ success: true, diagnostic });
  } catch (error) {
    await upsertStep(req.params.id, 'diagnostic', 'failed', 100, {
      error: error.message,
    }).catch(() => {});
    await writeError(req.params.id, 'diagnostic', 'job', req.params.id, error.message).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

router.post('/jobs/:id/dry-run', async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    const credentials = await loadCredentials(req.params.id);
    await upsertStep(job.id, 'dry_run', 'running', 10);
    await writeLog(job.id, 'info', 'dry_run', 'Simulação iniciada. Nenhum dado será copiado ou alterado.');

    const report = await buildDryRunReport({
      source: credentials.source,
      target: credentials.target,
      minio: credentials.minio,
      schemas: job.selected_schemas,
      buckets: job.selected_buckets,
    });

    await upsertStep(job.id, 'dry_run', report.ready ? 'completed' : 'failed', 100, report);
    await updateJob(job.id, {
      status: report.ready ? 'ready' : 'failed',
      progress: report.ready ? 50 : 35,
      dry_run_approved: report.ready,
    });
    await writeLog(
      job.id,
      report.ready ? 'info' : 'warn',
      'dry_run',
      report.ready ? 'Pronto para migrar.' : 'Correções necessárias antes da migração real.',
      {
        warnings: report.warnings?.length || 0,
        blockers: report.blockers?.length || 0,
      }
    );

    res.json({ success: true, report });
  } catch (error) {
    await upsertStep(req.params.id, 'dry_run', 'failed', 100, {
      error: error.message,
    }).catch(() => {});
    await writeError(req.params.id, 'dry_run', 'job', req.params.id, error.message).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

router.get('/jobs/:id/report', async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    const [steps, logs, errors] = await Promise.all([
      loadSteps(job.id),
      loadLogs(job.id, 500),
      loadErrors(job.id),
    ]);

    res.json({
      success: true,
      report: {
        job: sanitizePublicJob(job),
        steps,
        logs,
        errors,
        generatedAt: new Date().toISOString(),
        mode: 'diagnostic_only',
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

async function loadJob(id) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('migration_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    const notFound = new Error('Job de migração não encontrado.');
    notFound.status = 404;
    throw notFound;
  }
  return data;
}

async function saveCredentials(jobId, scope, payload, userId) {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('migration_credentials').upsert(
    {
      job_id: jobId,
      scope,
      encrypted_payload: encryptCredentials(payload),
      created_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'job_id,scope' }
  );
  if (error) throw error;
}

async function loadCredentials(jobId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('migration_credentials')
    .select('scope, encrypted_payload')
    .eq('job_id', jobId);

  if (error) throw error;
  const credentials = {};
  for (const row of data || []) {
    credentials[row.scope] = decryptCredentials(row.encrypted_payload);
  }

  for (const scope of ['source', 'target', 'minio']) {
    if (!credentials[scope]) {
      throw new Error(`Credenciais "${scope}" não encontradas para este job.`);
    }
  }
  return credentials;
}

async function loadMaskedCredentials(jobId) {
  const credentials = await loadCredentials(jobId);
  return {
    source: maskCredentials(credentials.source),
    target: maskCredentials(credentials.target),
    minio: maskCredentials(credentials.minio),
  };
}

async function updateJob(jobId, updates) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('migration_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function upsertStep(jobId, step, status, progress, metadata = undefined) {
  const supabase = getSupabaseServer();
  const now = new Date().toISOString();
  const payload = {
    job_id: jobId,
    step,
    status,
    progress,
    updated_at: now,
  };

  if (metadata !== undefined) payload.metadata = metadata;
  if (status === 'running') payload.started_at = now;
  if (['completed', 'failed', 'skipped', 'cancelled'].includes(status)) {
    payload.finished_at = now;
  }

  const { data: existing } = await supabase
    .from('migration_steps')
    .select('id')
    .eq('job_id', jobId)
    .eq('step', step)
    .maybeSingle();

  const query = existing?.id
    ? supabase.from('migration_steps').update(payload).eq('id', existing.id)
    : supabase.from('migration_steps').insert(payload);

  const { error } = await query;
  if (error) throw error;
}

async function writeLog(jobId, level, step, message, metadata = {}) {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('migration_logs').insert({
    job_id: jobId,
    level,
    step,
    message,
    metadata,
  });
  if (error) throw error;
}

async function writeError(jobId, step, entityType, entityName, errorMessage, payload = {}) {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('migration_errors').insert({
    job_id: jobId,
    step,
    entity_type: entityType,
    entity_name: entityName,
    error_message: errorMessage,
    payload,
  });
  if (error) throw error;
}

async function loadLogs(jobId, limit = 100) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('migration_logs')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function loadErrors(jobId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('migration_errors')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

async function loadSteps(jobId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('migration_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

function normalizeSourceConfig(input) {
  return {
    supabaseUrl: clean(input.supabaseUrl),
    anonKey: clean(input.anonKey),
    serviceRoleKey: clean(input.serviceRoleKey),
    dbHost: clean(input.dbHost),
    dbPort: Number(input.dbPort || 5432),
    dbName: clean(input.dbName || 'postgres'),
    dbUser: clean(input.dbUser || 'postgres'),
    dbPassword: clean(input.dbPassword),
    sslMode: clean(input.sslMode || 'require'),
    buckets: sanitizeList(input.buckets, DEFAULT_BUCKETS),
  };
}

function normalizeTargetConfig(input) {
  return {
    supabaseUrl: clean(input.supabaseUrl),
    anonKey: clean(input.anonKey),
    serviceRoleKey: clean(input.serviceRoleKey),
    dbHost: clean(input.dbHost),
    dbPort: Number(input.dbPort || 5432),
    dbName: clean(input.dbName || 'postgres'),
    dbUser: clean(input.dbUser || 'postgres'),
    dbPassword: clean(input.dbPassword),
    sslMode: clean(input.sslMode || 'require'),
  };
}

function normalizeMinioConfig(input) {
  return {
    endpoint: clean(input.endpoint),
    port: input.port ? Number(input.port) : undefined,
    accessKey: clean(input.accessKey),
    secretKey: clean(input.secretKey),
    bucket: clean(input.bucket || input.bucketDestino || input.minioBucketDestino),
    publicBaseUrl: clean(input.publicBaseUrl),
    useSsl: input.useSsl !== false,
  };
}

function sanitizeList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleanValues = value.map((item) => clean(item)).filter(Boolean);
  return cleanValues.length ? cleanValues : fallback;
}

function clean(value) {
  return String(value || '').trim();
}

function summarizeDiagnostic(diagnostic) {
  return {
    sourceTables: diagnostic.sourceDatabase.tables.length,
    sourceEstimatedRows: diagnostic.sourceDatabase.estimatedRows,
    targetTables: diagnostic.targetDatabase.tables.length,
    buckets: diagnostic.sourceStorage.buckets.length,
  };
}

export default router;

