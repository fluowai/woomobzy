import crypto from 'crypto';

import { getSupabaseServer } from '../lib/supabase-server.js';
import {
  applyBucketLifecycle,
  createPresignedGetUrl,
  deleteMinioObjects,
  getBucketLifecycle,
  getBucketVersioning,
  getConfiguredBucketName,
  isMinioConfigured,
  listMinioBuckets,
  listMinioObjects,
  suspendBucketVersioning,
} from '../lib/minio-storage.js';

const DEFAULT_BUCKET = 'whatsapp-media';
const DEFAULT_RETENTION_RULES = [
  { type: 'audio', label: 'Audios WhatsApp', days: 15, match: ['audio/'] },
  { type: 'video', label: 'Videos WhatsApp', days: 15, match: ['video/'] },
  { type: 'image', label: 'Imagens WhatsApp', days: 30, match: ['image/'] },
  { type: 'document', label: 'Documentos', days: 45, match: ['application/pdf', 'document'] },
  { type: 'avatar', label: 'Avatares', days: 30, match: ['avatar', 'avatars'] },
  { type: 'temporary', label: 'Temporarios', days: 3, match: ['temp', 'temporary'] },
  { type: 'log', label: 'Logs', days: 7, match: ['log'] },
];

export async function getStorageSummary() {
  const [objects, buckets, duplicates, orphans] = await Promise.all([
    loadStorageObjects(),
    getStorageBuckets(),
    getStorageDuplicates(),
    getStorageOrphans(),
  ]);

  const totalBytes = sum(objects, 'size_bytes');
  const bucketStats = rankBy(objects, (item) => item.bucket || DEFAULT_BUCKET);
  const tenantStats = rankBy(objects, (item) => item.tenant_id || 'sem tenant');
  const extensionStats = rankBy(objects, (item) => normalizeExtension(item.object_key, item.mime_type));
  const whatsappBucket = buckets.find((bucket) => bucket.name === getWhatsappBucketName()) || buckets[0];

  return {
    configured: isMinioConfigured(),
    total_usage_bytes: totalBytes,
    total_objects: objects.length,
    total_buckets: buckets.length,
    heaviest_bucket: bucketStats[0] || null,
    top_tenant: tenantStats[0] || null,
    top_file_type: extensionStats[0] || null,
    duplicate_groups_estimated: duplicates.groups.length,
    duplicate_files_estimated: duplicates.duplicate_files,
    orphan_files_estimated: orphans.minio_without_database.length + orphans.database_without_minio.length,
    reclaimable_bytes_estimated: duplicates.wasted_bytes + sum(orphans.minio_without_database, 'size_bytes'),
    versioning_status: whatsappBucket?.versioning || 'desconhecido',
    lifecycle_status: whatsappBucket?.lifecycle || 'desconhecido',
    alerts: buildSummaryAlerts({ buckets, objects }),
  };
}

export async function getStorageBuckets() {
  const snapshotObjects = await loadSnapshotObjects();
  const snapshotByBucket = rankBy(snapshotObjects, (item) => item.bucket || DEFAULT_BUCKET);

  if (!isMinioConfigured()) {
    return snapshotByBucket.map((item) => ({
      name: item.key,
      objects: item.count,
      size_bytes: item.bytes,
      versioning: 'MinIO nao configurado',
      lifecycle: 'MinIO nao configurado',
      policy: 'desconhecida',
    }));
  }

  const liveBuckets = await listMinioBuckets();
  const names = liveBuckets.length ? liveBuckets.map((bucket) => bucket.name) : [getWhatsappBucketName()];

  return Promise.all(names.map(async (name) => {
    const stats = snapshotByBucket.find((item) => item.key === name);
    const [versioning, lifecycle] = await Promise.all([
      safeMinio(() => getBucketVersioning(name), { status: 'erro', enabled: false }),
      safeMinio(() => getBucketLifecycle(name), { enabled: false, rules: [] }),
    ]);

    return {
      name,
      objects: stats?.count || 0,
      size_bytes: stats?.bytes || 0,
      versioning: versioning.status || (versioning.enabled ? 'Enabled' : 'Off'),
      lifecycle: lifecycle.enabled ? 'Configured' : 'Missing',
      lifecycle_rules: lifecycle.rules || [],
      policy: 'S3 assinada no backend',
    };
  }));
}

export async function getStorageFiles(filters = {}) {
  const objects = await loadStorageObjects();
  const filtered = objects.filter((item) => matchesFileFilters(item, filters));
  return {
    files: filtered.slice(0, Math.max(1, Math.min(Number(filters.limit) || 100, 500))),
    total: filtered.length,
  };
}

export async function getLargestFiles(limit = 50) {
  const objects = await loadStorageObjects();
  return objects
    .sort((a, b) => Number(b.size_bytes || 0) - Number(a.size_bytes || 0))
    .slice(0, Math.max(1, Math.min(Number(limit) || 50, 200)));
}

export async function getByExtension() {
  const objects = await loadStorageObjects();
  return rankBy(objects, (item) => normalizeExtension(item.object_key, item.mime_type));
}

export async function getByPrefix() {
  const objects = await loadStorageObjects();
  return rankBy(objects, (item) => String(item.object_key || '').split('/').slice(0, 3).join('/') || 'raiz');
}

export async function getByTenant() {
  const objects = await loadStorageObjects();
  const stats = rankBy(objects, (item) => item.tenant_id || 'sem tenant');
  const orgNames = await loadOrganizationNames(stats.map((item) => item.key).filter(isUuid));
  return stats.map((item) => ({
    ...item,
    tenant_id: item.key,
    tenant_name: orgNames[item.key] || item.key,
    images: countByMime(objects, item.key, 'image/'),
    audios: countByMime(objects, item.key, 'audio/'),
    videos: countByMime(objects, item.key, 'video/'),
    pdfs: objects.filter((object) => object.tenant_id === item.key && /pdf/i.test(object.mime_type || object.object_key || '')).length,
    avatars: objects.filter((object) => object.tenant_id === item.key && /avatar/i.test(object.object_key || '')).length,
    daily_growth_bytes: estimateGrowth(objects, item.key, 1),
    weekly_growth_bytes: estimateGrowth(objects, item.key, 7),
    monthly_projection_bytes: estimateGrowth(objects, item.key, 7) * 4,
  }));
}

export async function getStorageDuplicates() {
  const objects = await loadStorageObjects();
  const groups = [];

  for (const strategy of [
    ['sha256', (item) => item.sha256],
    ['etag', (item) => item.etag],
    ['same_size', (item) => Number(item.size_bytes || 0) > 0 ? String(item.size_bytes) : ''],
    ['same_name', (item) => fileName(item.object_key)],
    ['message_id', (item) => item.entity_type === 'whatsapp_message' ? item.entity_id : ''],
  ]) {
    const [strategyName, selector] = strategy;
    const byKey = new Map();
    for (const item of objects) {
      const key = selector(item);
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(item);
    }
    for (const [key, items] of byKey.entries()) {
      if (items.length < 2) continue;
      const sorted = [...items].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      groups.push({
        strategy: strategyName,
        key,
        count: items.length,
        size_bytes: sum(items, 'size_bytes'),
        wasted_bytes: sum(sorted.slice(1), 'size_bytes'),
        keep: sorted[0],
        duplicates: sorted.slice(1),
      });
    }
  }

  const uniqueGroups = dedupeDuplicateGroups(groups);
  return {
    total_groups: uniqueGroups.length,
    duplicate_files: uniqueGroups.reduce((acc, group) => acc + Math.max(0, group.count - 1), 0),
    wasted_bytes: sum(uniqueGroups, 'wasted_bytes'),
    groups: uniqueGroups
      .sort((a, b) => Number(b.wasted_bytes || 0) - Number(a.wasted_bytes || 0))
      .slice(0, 50),
  };
}

export async function getStorageOrphans() {
  const [snapshotObjects, storageObjects, whatsappMedia, whatsappMessages] = await Promise.all([
    loadSnapshotObjects(),
    loadStorageObjects(),
    safeTableRows('whatsapp_media', 'bucket, object_key, tenant_id, status, created_at', 10000),
    safeTableRows('whatsapp_messages', 'media_url, media_mimetype, media_filename, created_at', 10000),
  ]);

  const dbKeys = new Set();
  for (const item of storageObjects) addDbKey(dbKeys, item.bucket, item.object_key);
  for (const item of whatsappMedia) addDbKey(dbKeys, item.bucket || DEFAULT_BUCKET, item.object_key);
  for (const item of whatsappMessages) {
    const parsed = parseStorageUrl(item.media_url);
    if (parsed.key) addDbKey(dbKeys, parsed.bucket || DEFAULT_BUCKET, parsed.key);
  }

  const minioKeys = new Set(snapshotObjects.map((item) => storageKey(item.bucket, item.object_key)));
  const minioWithoutDatabase = snapshotObjects
    .filter((item) => !dbKeys.has(storageKey(item.bucket, item.object_key)))
    .slice(0, 500);
  const databaseWithoutMinio = [...dbKeys]
    .filter((key) => !minioKeys.has(key))
    .slice(0, 500)
    .map((key) => {
      const [bucket, ...rest] = key.split('/');
      return { bucket, object_key: rest.join('/'), classification: 'Existe no banco, mas nao existe no MinIO' };
    });

  return {
    minio_without_database: minioWithoutDatabase.map((item) => ({
      ...item,
      classification: classifyOrphan(item),
    })),
    database_without_minio: databaseWithoutMinio,
    counts: {
      minio_without_database: minioWithoutDatabase.length,
      database_without_minio: databaseWithoutMinio.length,
    },
  };
}

export async function getLifecycle() {
  const bucket = getWhatsappBucketName();
  const lifecycle = isMinioConfigured()
    ? await safeMinio(() => getBucketLifecycle(bucket), { enabled: false, rules: [] })
    : { enabled: false, rules: [] };

  return {
    bucket,
    enabled: lifecycle.enabled,
    minio_rules: lifecycle.rules || [],
    retention_rules: DEFAULT_RETENTION_RULES,
  };
}

export async function runStorageScan(adminId) {
  if (!isMinioConfigured()) {
    throw new Error('MinIO nao configurado para executar auditoria.');
  }

  const buckets = await listMinioBuckets();
  const bucketNames = buckets.length ? buckets.map((bucket) => bucket.name) : [getWhatsappBucketName()];
  const scannedAt = new Date().toISOString();
  const rows = [];

  for (const bucket of bucketNames) {
    let continuationToken = '';
    let safety = 0;
    do {
      const page = await listMinioObjects({ bucket, continuationToken, maxKeys: 1000 });
      for (const object of page.objects) {
        rows.push(snapshotRow(bucket, object, scannedAt));
      }
      continuationToken = page.nextContinuationToken || '';
      safety += 1;
    } while (continuationToken && safety < 100);
  }

  await saveSnapshotRows(rows);
  await upsertStorageObjectRows(rows);
  await logStorageAction(adminId, 'storage_scan', null, {
    buckets: bucketNames,
    objects: rows.length,
    size_bytes: sum(rows, 'size_bytes'),
  });

  return {
    scanned_at: scannedAt,
    buckets: bucketNames.length,
    objects: rows.length,
    size_bytes: sum(rows, 'size_bytes'),
    by_extension: rankBy(rows, (item) => item.extension || normalizeExtension(item.object_key)),
    by_prefix: rankBy(rows, (item) => item.prefix || 'raiz'),
    by_tenant: rankBy(rows, (item) => item.tenant_id || 'sem tenant'),
  };
}

export async function signStorageObject(bucket, key, expiresInSeconds = 300) {
  return {
    bucket,
    key,
    url: createPresignedGetUrl({ bucket, key, expiresInSeconds }),
    expires_in: expiresInSeconds,
  };
}

export async function suspendVersioning(adminId, confirmation, bucket = getWhatsappBucketName()) {
  if (String(confirmation || '').trim() !== 'SUSPENDER VERSIONAMENTO') {
    throw new Error('Confirmacao obrigatoria: SUSPENDER VERSIONAMENTO');
  }
  const result = await suspendBucketVersioning(bucket);
  await logStorageAction(adminId, 'suspend_versioning', bucket, result);
  return result;
}

export async function applyLifecycle(adminId, bucket = getWhatsappBucketName()) {
  const result = await applyBucketLifecycle(bucket);
  await logStorageAction(adminId, 'apply_lifecycle', bucket, result);
  return result;
}

export async function simulateCleanup(payload = {}) {
  const objects = await loadStorageObjects();
  const now = Date.now();
  const candidates = objects.filter((item) => {
    const rule = retentionRuleFor(item, payload.rules || DEFAULT_RETENTION_RULES);
    if (!rule) return false;
    const created = new Date(item.created_at || item.last_modified || 0).getTime();
    return created > 0 && now - created > Number(rule.days || 0) * 86400000;
  });

  return {
    files: candidates.slice(0, 500),
    total_files: candidates.length,
    reclaimable_bytes: sum(candidates, 'size_bytes'),
    affected_tenants: [...new Set(candidates.map((item) => item.tenant_id).filter(Boolean))],
    affected_types: rankBy(candidates, (item) => normalizeExtension(item.object_key, item.mime_type)),
  };
}

export async function deleteExpired(adminId, payload = {}) {
  if (String(payload.confirmation || '').trim() !== 'CONFIRMAR LIMPEZA DE EXPIRADOS') {
    throw new Error('Confirmacao obrigatoria: CONFIRMAR LIMPEZA DE EXPIRADOS');
  }
  const simulation = await simulateCleanup(payload);
  const deleted = await deleteExplicitObjects(simulation.files.slice(0, Number(payload.limit) || 100));
  await logStorageAction(adminId, 'delete_expired', null, { deleted: deleted.length });
  return { deleted };
}

export async function deleteOrphans(adminId, payload = {}) {
  const confirmation = String(payload.confirmation || '').trim();
  if (!['CONFIRMAR LIMPEZA DE ORFAOS', 'CONFIRMAR LIMPEZA DE ÓRFÃOS', 'CONFIRMAR LIMPEZA DE ÓRFÃOS'].includes(confirmation)) {
    throw new Error('Confirmacao obrigatoria: CONFIRMAR LIMPEZA DE ORFAOS');
  }
  const orphans = await getStorageOrphans();
  const selected = Array.isArray(payload.objectKeys) && payload.objectKeys.length
    ? orphans.minio_without_database.filter((item) => payload.objectKeys.includes(item.object_key))
    : orphans.minio_without_database.slice(0, Number(payload.limit) || 100);
  const deleted = await deleteExplicitObjects(selected);
  await logStorageAction(adminId, 'delete_orphans', null, { deleted: deleted.length });
  return { deleted };
}

export async function deleteDuplicates(adminId, payload = {}) {
  if (String(payload.confirmation || '').trim() !== 'CONFIRMAR LIMPEZA DE DUPLICADOS') {
    throw new Error('Confirmacao obrigatoria: CONFIRMAR LIMPEZA DE DUPLICADOS');
  }
  const duplicates = await getStorageDuplicates();
  const selected = duplicates.groups.flatMap((group) => group.duplicates).slice(0, Number(payload.limit) || 100);
  const deleted = await deleteExplicitObjects(selected);
  await logStorageAction(adminId, 'delete_duplicates', null, { deleted: deleted.length });
  return { deleted };
}

export async function getStorageLogs(limit = 100) {
  return safeTableRows('storage_admin_actions', 'id, admin_id, action, bucket, details, created_at', Math.min(Number(limit) || 100, 500));
}

export async function logStorageAction(adminId, action, bucket, details = {}) {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('storage_admin_actions').insert({
    admin_id: adminId || null,
    action,
    bucket,
    details,
  });
  if (error) console.warn('[Storage Intelligence] Failed to log action:', error.message);
}

function getWhatsappBucketName() {
  return getConfiguredBucketName('whatsapp') || process.env.MINIO_BUCKET || DEFAULT_BUCKET;
}

async function loadStorageObjects() {
  const rows = await safeTableRows(
    'storage_objects',
    'id, tenant_id, bucket, object_key, sha256, etag, size_bytes, mime_type, source, entity_type, entity_id, created_at, expires_at, deleted_at',
    20000
  );
  return rows.filter((item) => !item.deleted_at).map(normalizeObjectRow);
}

async function loadSnapshotObjects() {
  const rows = await safeTableRows(
    'storage_inventory_snapshots',
    'bucket, object_key, size_bytes, etag, extension, prefix, tenant_id, is_version, version_id, is_delete_marker, last_modified, scanned_at',
    50000
  );
  const latestScan = rows.reduce((latest, row) => {
    const value = new Date(row.scanned_at || 0).getTime();
    return value > latest ? value : latest;
  }, 0);
  const latestRows = latestScan
    ? rows.filter((row) => new Date(row.scanned_at || 0).getTime() === latestScan)
    : rows;

  return latestRows.map((item) => normalizeObjectRow({
    ...item,
    created_at: item.last_modified || item.scanned_at,
    sha256: '',
    mime_type: mimeFromExtension(item.extension),
  }));
}

async function safeTableRows(table, columns, limit) {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .limit(limit);
    if (error) {
      if (/does not exist|schema cache|PGRST/i.test(error.message || '')) return [];
      throw error;
    }
    return data || [];
  } catch (error) {
    if (/does not exist|schema cache|relation/i.test(error.message || '')) return [];
    console.warn(`[Storage Intelligence] ${table} unavailable:`, error.message);
    return [];
  }
}

async function loadOrganizationNames(ids) {
  if (!ids.length) return {};
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', ids);
    if (error) throw error;
    return (data || []).reduce((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

async function saveSnapshotRows(rows) {
  if (!rows.length) return;
  const supabase = getSupabaseServer();
  for (const chunk of chunks(rows, 500)) {
    const { error } = await supabase.from('storage_inventory_snapshots').insert(chunk);
    if (error) throw error;
  }
}

async function upsertStorageObjectRows(rows) {
  if (!rows.length) return;
  const supabase = getSupabaseServer();
  const payload = rows.map((row) => ({
    tenant_id: isUuid(row.tenant_id) ? row.tenant_id : null,
    bucket: row.bucket,
    object_key: row.object_key,
    etag: row.etag,
    size_bytes: row.size_bytes,
    mime_type: mimeFromExtension(row.extension),
    source: inferSource(row.object_key),
    created_at: row.last_modified || row.scanned_at,
    deleted_at: null,
  }));

  for (const chunk of chunks(payload, 300)) {
    const { error } = await supabase
      .from('storage_objects')
      .upsert(chunk, { onConflict: 'bucket,object_key' });
    if (error) throw error;
  }
}

async function deleteExplicitObjects(objects) {
  if (!isMinioConfigured()) throw new Error('MinIO nao configurado para excluir objetos.');
  const byBucket = objects.reduce((acc, item) => {
    const bucket = item.bucket || DEFAULT_BUCKET;
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket].push(item.object_key);
    return acc;
  }, {});
  const deleted = [];
  for (const [bucket, keys] of Object.entries(byBucket)) {
    deleted.push(...await deleteMinioObjects({ bucket, keys }));
  }
  return deleted;
}

function snapshotRow(bucket, object, scannedAt) {
  const extension = normalizeExtension(object.key);
  const tenant = inferTenantId(object.key);
  return {
    bucket,
    object_key: object.key,
    size_bytes: Number(object.size || 0),
    etag: object.etag || null,
    extension,
    prefix: String(object.key || '').split('/').slice(0, 3).join('/'),
    tenant_id: tenant || null,
    is_version: false,
    version_id: null,
    is_delete_marker: false,
    last_modified: object.lastModified || null,
    scanned_at: scannedAt,
  };
}

function normalizeObjectRow(row) {
  return {
    ...row,
    bucket: row.bucket || DEFAULT_BUCKET,
    object_key: row.object_key || '',
    size_bytes: Number(row.size_bytes || 0),
    tenant_id: row.tenant_id || inferTenantId(row.object_key),
    etag: row.etag || '',
    sha256: row.sha256 || '',
  };
}

function matchesFileFilters(item, filters = {}) {
  if (filters.bucket && item.bucket !== filters.bucket) return false;
  if (filters.tenant && item.tenant_id !== filters.tenant) return false;
  if (filters.extension && normalizeExtension(item.object_key, item.mime_type) !== filters.extension) return false;
  if (filters.type && !String(item.mime_type || item.object_key || '').toLowerCase().includes(String(filters.type).toLowerCase())) return false;
  if (filters.origin && !String(item.source || '').toLowerCase().includes(String(filters.origin).toLowerCase())) return false;
  if (filters.prefix && !String(item.object_key || '').startsWith(String(filters.prefix))) return false;
  if (filters.minMb && Number(item.size_bytes || 0) < Number(filters.minMb) * 1024 * 1024) return false;
  if (filters.startDate && new Date(item.created_at || 0) < new Date(filters.startDate)) return false;
  if (filters.endDate && new Date(item.created_at || 0) > new Date(filters.endDate)) return false;
  return true;
}

function buildSummaryAlerts({ buckets, objects }) {
  const alerts = [];
  const whatsapp = buckets.find((bucket) => bucket.name === getWhatsappBucketName());
  if (String(whatsapp?.versioning || '').toLowerCase() === 'enabled') {
    alerts.push({ severity: 'critical', message: 'CRITICO: Versionamento ativo no bucket whatsapp-media.' });
  }
  if (!whatsapp || String(whatsapp.lifecycle || '').toLowerCase() === 'missing') {
    alerts.push({ severity: 'critical', message: 'CRITICO: Nenhuma politica de retencao encontrada.' });
  }
  const tenantCount = new Set(objects.map((item) => item.tenant_id).filter(Boolean)).size;
  if (tenantCount <= 2 && sum(objects, 'size_bytes') > 2 * 1024 * 1024 * 1024) {
    alerts.push({ severity: 'high', message: 'ALTO: Crescimento incompativel com apenas 2 clientes ativos.' });
  }
  return alerts;
}

function retentionRuleFor(item, rules) {
  const haystack = `${item.object_key || ''} ${item.mime_type || ''} ${item.source || ''}`.toLowerCase();
  return rules.find((rule) => (rule.match || []).some((needle) => haystack.includes(String(needle).toLowerCase())));
}

function rankBy(items, selector) {
  const map = new Map();
  for (const item of items) {
    const key = selector(item) || 'desconhecido';
    const current = map.get(key) || { key, count: 0, bytes: 0 };
    current.count += 1;
    current.bytes += Number(item.size_bytes || 0);
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.bytes - a.bytes || b.count - a.count);
}

function countByMime(objects, tenantId, mimePrefix) {
  return objects.filter((item) => item.tenant_id === tenantId && String(item.mime_type || '').startsWith(mimePrefix)).length;
}

function estimateGrowth(objects, tenantId, days) {
  const cutoff = Date.now() - days * 86400000;
  return sum(objects.filter((item) => item.tenant_id === tenantId && new Date(item.created_at || 0).getTime() >= cutoff), 'size_bytes');
}

function sum(items, field) {
  return items.reduce((acc, item) => acc + Number(item[field] || 0), 0);
}

function normalizeExtension(key = '', mimeType = '') {
  const match = String(key || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match) return match[1].toLowerCase();
  if (mimeType) return String(mimeType).split('/').pop()?.toLowerCase() || 'bin';
  return 'sem-extensao';
}

function mimeFromExtension(extension = '') {
  const ext = String(extension || '').replace('.', '').toLowerCase();
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    ogg: 'audio/ogg',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
  };
  return map[ext] || 'application/octet-stream';
}

function inferTenantId(key = '') {
  const first = String(key || '').split('/')[0];
  return isUuid(first) ? first : '';
}

function inferSource(key = '') {
  const lower = String(key || '').toLowerCase();
  if (lower.includes('/whatsapp/')) return 'whatsapp';
  if (lower.includes('avatar')) return 'avatar';
  if (lower.includes('temp')) return 'temporary';
  return 'unknown';
}

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

function fileName(key = '') {
  return String(key || '').split('/').pop() || '';
}

function dedupeDuplicateGroups(groups) {
  const seen = new Set();
  return groups.filter((group) => {
    const ids = group.duplicates.map((item) => item.id || storageKey(item.bucket, item.object_key)).sort().join('|');
    const key = `${group.strategy}:${ids}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function storageKey(bucket, objectKey) {
  return `${bucket || DEFAULT_BUCKET}/${objectKey || ''}`;
}

function addDbKey(set, bucket, objectKey) {
  if (!objectKey) return;
  set.add(storageKey(bucket || DEFAULT_BUCKET, objectKey));
}

function parseStorageUrl(value = '') {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    const publicIndex = parts.findIndex((part) => part === 'public');
    if (publicIndex >= 0 && parts[publicIndex + 1]) {
      return {
        bucket: parts[publicIndex + 1],
        key: decodeURIComponent(parts.slice(publicIndex + 2).join('/')),
      };
    }
    return {
      bucket: parts[0] || DEFAULT_BUCKET,
      key: decodeURIComponent(parts.slice(1).join('/')),
    };
  } catch {
    return { bucket: DEFAULT_BUCKET, key: '' };
  }
}

function classifyOrphan(item) {
  if (!item.tenant_id) return 'Arquivo sem tenant';
  if (!item.source || item.source === 'unknown') return 'Arquivo sem origem';
  if (item.expires_at && new Date(item.expires_at).getTime() < Date.now()) return 'Arquivo expirado';
  return 'Existe no MinIO, mas nao existe no banco';
}

function chunks(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function safeMinio(fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    return { ...fallback, error: error.message };
  }
}

export function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
