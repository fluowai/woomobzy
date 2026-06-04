import express from 'express';
import { verifySuperAdmin } from '../../middleware/auth.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  analyzeMediaOrganization,
  buildStorageOnlyDryRunReport,
  collectS3StorageDiagnostics,
  decryptCredentials,
  encryptCredentials,
  getDefaultMigrationSelections,
  maskCredentials,
  migrateStorageS3ToMinio,
  sanitizePublicJob,
  testMinioConnection,
  testS3StorageConnection,
  validateStorageMigration,
} from '../../services/fluowaiMigrationService.js';

const router = express.Router();

router.use(verifySuperAdmin);

router.get('/defaults', (_req, res) => {
  res.json({
    success: true,
    defaults: getDefaultMigrationSelections(),
    phase: 'storage_only_s3',
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
    const [credentialsResult, logsResult, errorsResult, stepsResult] = await Promise.all([
      loadOptionalJobPart('credentials', () => loadMaskedCredentialsForDetails(req.params.id), {}),
      loadOptionalJobPart('logs', () => loadLogs(req.params.id), []),
      loadOptionalJobPart('errors', () => loadErrors(req.params.id), []),
      loadOptionalJobPart('steps', () => loadSteps(req.params.id), []),
    ]);
    const warnings = [
      credentialsResult.warning,
      logsResult.warning,
      errorsResult.warning,
      stepsResult.warning,
    ].filter(Boolean);

    res.json({
      success: true,
      job: sanitizePublicJob(job),
      credentials: credentialsResult.value,
      logs: logsResult.value,
      errors: errorsResult.value,
      steps: stepsResult.value,
      warnings,
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/jobs', async (req, res) => {
  try {
    const body = req.body || {};
    const source = normalizeSourceConfig(body.source || {});
    const minio = normalizeMinioConfig(body.minio || {});
    validateUnmaskedS3Credentials(source, 'Supabase Storage S3 origem');
    validateUnmaskedS3Credentials(minio, 'MinIO destino');
    const selectedSchemas = sanitizeList(body.selectedSchemas, getDefaultMigrationSelections().schemas);
    const selectedBuckets = sanitizeList(body.selectedBuckets, getDefaultMigrationSelections().buckets);
    const supabase = getSupabaseServer();

    const { data: job, error } = await supabase
      .from('migration_jobs')
      .insert({
        status: 'draft',
        source_supabase_url: source.publicBaseUrl || source.endpoint || null,
        target_supabase_url: null,
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
      saveCredentials(job.id, 'minio', minio, req.user.id),
      writeLog(job.id, 'info', 'connections', 'Job de migracao de midias criado em modo storage-only.', {
        source: maskCredentials(source),
        minio: maskCredentials(minio),
      }),
    ]);

    res.status(201).json({
      success: true,
      job: sanitizePublicJob(job),
      credentials: {
        source: maskCredentials(source),
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
      ['sourceS3', () => testS3StorageConnection(credentials.source, 'Supabase Storage S3 origem')],
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
    await writeLog(job.id, 'info', 'diagnostic', 'Diagnostico de buckets iniciado em modo somente leitura.');

    const sourceStorage = await collectS3StorageDiagnostics(credentials.source, job.selected_buckets);
    const diagnostic = {
      mode: 'storage_only_s3',
      sourceStorage,
      generatedAt: new Date().toISOString(),
    };

    await upsertStep(job.id, 'diagnostic', 'completed', 100, diagnostic);
    await updateJob(job.id, { status: 'ready', progress: 35 });
    await writeLog(job.id, 'info', 'diagnostic', 'Diagnostico concluido.', summarizeDiagnostic(diagnostic));

    res.json({ success: true, diagnostic });
  } catch (error) {
    await upsertStep(req.params.id, 'diagnostic', 'failed', 100, {
      error: error.message,
    }).catch(() => {});
    await writeError(req.params.id, 'diagnostic', 'job', req.params.id, error.message).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

router.post('/jobs/:id/analyze-media-organization', async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    const credentials = await loadCredentials(req.params.id);
    await upsertStep(job.id, 'media_organization', 'running', 10);
    await writeLog(job.id, 'info', 'media_organization', 'Analise de organizacao de midias iniciada em modo somente leitura.');

    const analysis = await analyzeMediaOrganization({
      source: credentials.source,
      minio: credentials.minio,
      buckets: job.selected_buckets,
    });

    await upsertStep(job.id, 'media_organization', 'completed', 100, analysis);
    await updateJob(job.id, { status: 'ready', progress: Math.max(job.progress || 0, 40) });
    await writeLog(job.id, 'info', 'media_organization', 'Analise de organizacao concluida.', {
      buckets: analysis.sourceStorage?.totals?.buckets || 0,
      files: analysis.sourceStorage?.totals?.files || 0,
      databaseAvailable: Boolean(analysis.database?.available),
      matchedColumns: analysis.database?.matchedColumns || 0,
    });

    res.json({ success: true, analysis });
  } catch (error) {
    await upsertStep(req.params.id, 'media_organization', 'failed', 100, {
      error: error.message,
    }).catch(() => {});
    await writeError(req.params.id, 'media_organization', 'job', req.params.id, error.message).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

router.post('/jobs/:id/dry-run', async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    const credentials = await loadCredentials(req.params.id);
    await upsertStep(job.id, 'dry_run', 'running', 10);
    await writeLog(job.id, 'info', 'dry_run', 'Simulacao storage-only iniciada. Nenhum arquivo sera copiado ou alterado.');

    const report = await buildStorageOnlyDryRunReport({
      source: credentials.source,
      minio: credentials.minio,
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
      report.ready ? 'Pronto para migrar midias.' : 'Correcoes necessarias antes da migracao de midias.',
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

router.post('/jobs/:id/migrate-storage', async (req, res) => {
  try {
    const confirmation = String(req.body?.confirmation || '').trim();
    if (confirmation !== 'MIGRAR MIDIAS') {
      return res.status(400).json({ error: 'Digite MIGRAR MIDIAS para iniciar a copia dos arquivos.' });
    }

    const job = await loadJob(req.params.id);
    if (!job.dry_run_approved) {
      return res.status(400).json({ error: 'Execute e aprove o dry-run antes de migrar midias.' });
    }

    await updateJob(job.id, {
      status: 'running',
      progress: 55,
      started_at: job.started_at || new Date().toISOString(),
    });
    await upsertStep(job.id, 'storage_migration', 'running', 0);
    await writeLog(job.id, 'info', 'storage_migration', 'Migracao de midias iniciada em background.');

    runStorageMigration(job.id).catch(async (error) => {
      await writeError(job.id, 'storage_migration', 'job', job.id, error.message).catch(() => {});
      await writeLog(job.id, 'error', 'storage_migration', error.message).catch(() => {});
      await upsertStep(job.id, 'storage_migration', 'failed', 100, { error: error.message }).catch(() => {});
      await updateJob(job.id, { status: 'failed', progress: 55 }).catch(() => {});
    });

    res.status(202).json({
      success: true,
      message: 'Migracao de midias iniciada. Acompanhe os logs e o relatorio do job.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/jobs/:id/validate', async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    
    await updateJob(job.id, {
      status: 'testing',
      progress: 80,
    });
    await upsertStep(job.id, 'validation', 'running', 0);
    await writeLog(job.id, 'info', 'validation', 'Validacao de integridade iniciada em background.');

    runValidation(job.id).catch(async (error) => {
      await writeError(job.id, 'validation', 'job', job.id, error.message).catch(() => {});
      await writeLog(job.id, 'error', 'validation', error.message).catch(() => {});
      await upsertStep(job.id, 'validation', 'failed', 100, { error: error.message }).catch(() => {});
      await updateJob(job.id, { status: 'failed', progress: 80 }).catch(() => {});
    });

    res.status(202).json({
      success: true,
      message: 'Validacao iniciada em background. Acompanhe os logs.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/jobs/:id/report', async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    const [steps, logs, errors, files] = await Promise.all([
      loadSteps(job.id),
      loadLogs(job.id, 500),
      loadErrors(job.id),
      loadFileMap(job.id),
    ]);

    res.json({
      success: true,
      report: {
        job: sanitizePublicJob(job),
        steps,
        logs,
        errors,
        files,
        generatedAt: new Date().toISOString(),
        mode: 'storage_only_s3',
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

async function runStorageMigration(jobId) {
  const job = await loadJob(jobId);
  const credentials = await loadCredentials(jobId);
  const summary = await migrateStorageS3ToMinio({
    source: credentials.source,
    minio: credentials.minio,
    buckets: job.selected_buckets,
    onLog: (level, message, metadata = {}) => writeLog(jobId, level, 'storage_migration', message, metadata),
    onFile: (file) => saveFileMap(jobId, file),
    onProgress: async (progress) => {
      const percent = progress.totalFiles
        ? Math.min(99, Math.max(55, Math.round((progress.processed / progress.totalFiles) * 44) + 55))
        : 55;
      await updateJob(jobId, { progress: percent });
      await upsertStep(jobId, 'storage_migration', 'running', progress.totalFiles ? Math.round((progress.processed / progress.totalFiles) * 100) : 0, progress);
    },
  });

  await upsertStep(jobId, 'storage_migration', summary.failed ? 'failed' : 'completed', 100, summary);
  await updateJob(jobId, {
    status: summary.failed ? 'failed' : 'completed',
    progress: 100,
    finished_at: new Date().toISOString(),
  });
}

async function runValidation(jobId) {
  const job = await loadJob(jobId);
  const credentials = await loadCredentials(jobId);
  const summary = await validateStorageMigration({
    source: credentials.source,
    minio: credentials.minio,
    buckets: job.selected_buckets,
    onLog: (level, message, metadata = {}) => writeLog(jobId, level, 'validation', message, metadata),
    onProgress: async (progress) => {
      const percent = progress.totalFiles
        ? Math.min(99, Math.max(80, Math.round((progress.processed / progress.totalFiles) * 19) + 80))
        : 80;
      await updateJob(jobId, { progress: percent });
      await upsertStep(jobId, 'validation', 'running', progress.totalFiles ? Math.round((progress.processed / progress.totalFiles) * 100) : 0, progress);
    },
  });

  const failed = summary.missing > 0 || summary.sizeMismatch > 0;
  await upsertStep(jobId, 'validation', failed ? 'failed' : 'completed', 100, summary);
  await updateJob(jobId, {
    status: failed ? 'failed' : 'completed',
    progress: 100,
  });
}

async function loadJob(id) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('migration_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    const notFound = new Error('Job de migracao nao encontrado.');
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

  for (const scope of ['source', 'minio']) {
    if (!credentials[scope]) {
      throw new Error(`Credenciais "${scope}" nao encontradas para este job.`);
    }
  }
  return credentials;
}

async function loadMaskedCredentials(jobId) {
  const credentials = await loadCredentials(jobId);
  return {
    source: maskCredentials(credentials.source),
    minio: maskCredentials(credentials.minio),
  };
}

async function loadMaskedCredentialsForDetails(jobId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('migration_credentials')
    .select('scope, encrypted_payload')
    .eq('job_id', jobId);

  if (error) throw error;

  const credentials = {};
  const warnings = [];
  for (const row of data || []) {
    try {
      credentials[row.scope] = maskCredentials(decryptCredentials(row.encrypted_payload));
    } catch (error) {
      credentials[row.scope] = {
        unavailable: true,
        error: 'Credencial salva nao pode ser descriptografada no servidor atual.',
      };
      warnings.push(`Credencial "${row.scope}" indisponivel: ${error.message}`);
    }
  }

  for (const scope of ['source', 'minio']) {
    if (!credentials[scope]) {
      credentials[scope] = {
        unavailable: true,
        error: 'Credencial nao cadastrada para este job.',
      };
      warnings.push(`Credencial "${scope}" nao cadastrada para este job.`);
    }
  }

  return { ...credentials, warnings };
}

async function loadOptionalJobPart(name, loader, fallback) {
  try {
    return { value: await loader(), warning: null };
  } catch (error) {
    console.warn(`[FluowAI Migration] Failed to load ${name}:`, error.message);
    return {
      value: fallback,
      warning: `${name}: ${error.message}`,
    };
  }
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

async function saveFileMap(jobId, file) {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('migration_file_map').insert({
    job_id: jobId,
    old_url: file.old_url,
    new_url: file.new_url,
    bucket: file.bucket,
    path: file.path,
    size: file.size,
    content_type: file.content_type,
    status: file.status,
    error_message: file.error_message || null,
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

async function loadFileMap(jobId) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('migration_file_map')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

function normalizeSourceConfig(input) {
  const endpoint = normalizeSupabaseS3Endpoint(clean(input.endpoint || input.s3Endpoint));
  return {
    endpoint,
    region: clean(input.region || input.s3Region || 'sa-east-1'),
    accessKey: clean(input.accessKey || input.s3AccessKey),
    secretKey: clean(input.secretKey || input.s3SecretKey),
    publicBaseUrl: clean(input.publicBaseUrl || input.supabasePublicBaseUrl),
    supabaseUrl: clean(input.supabaseUrl),
    useSsl: input.useSsl !== false,
    buckets: sanitizeList(input.buckets, getDefaultMigrationSelections().buckets),
  };
}

function validateUnmaskedS3Credentials(config, label) {
  for (const field of ['accessKey', 'secretKey']) {
    const value = String(config[field] || '').trim();
    if (!value) continue;
    if (/^[•●*]+$/.test(value) || value.includes('••') || value.includes('●●')) {
      throw new Error(`${label}: cole a chave real em "${field}". Valores mascarados nao podem ser salvos.`);
    }
  }
}

function normalizeMinioConfig(input) {
  return {
    endpoint: clean(input.endpoint),
    region: clean(input.region || 'us-east-1'),
    port: input.port ? Number(input.port) : undefined,
    accessKey: clean(input.accessKey),
    secretKey: clean(input.secretKey),
    bucket: clean(input.bucket || input.bucketDestino || input.minioBucketDestino),
    layoutMode: clean(input.layoutMode || input.organizationMode),
    prefixStrategy: clean(input.prefixStrategy || input.folderStrategy),
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

function normalizeSupabaseS3Endpoint(endpoint) {
  const cleanEndpoint = String(endpoint || '').trim().replace(/\/+$/, '');
  if (!cleanEndpoint) return '';

  if (/\/storage\/v1\/s3$/i.test(cleanEndpoint)) {
    return cleanEndpoint;
  }

  if (/\/storage\/v1$/i.test(cleanEndpoint)) {
    return `${cleanEndpoint}/s3`;
  }

  try {
    if (/\.storage\.supabase\.co$/i.test(new URL(cleanEndpoint).host)) {
      return `${cleanEndpoint}/storage/v1/s3`;
    }
  } catch {
    return cleanEndpoint;
  }

  return cleanEndpoint;
}

function summarizeDiagnostic(diagnostic) {
  return {
    mode: diagnostic.mode,
    buckets: diagnostic.sourceStorage?.totals?.buckets || 0,
    files: diagnostic.sourceStorage?.totals?.files || 0,
    bytes: diagnostic.sourceStorage?.totals?.bytes || 0,
  };
}

export default router;
