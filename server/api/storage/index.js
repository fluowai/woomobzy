import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';

import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  allowSupabaseStorageFallback,
  createPresignedGetUrl,
  getMinioPublicUrl,
  isMinioConfigured,
  resolveMediaBucket,
  resolveMinioObjectKey,
  uploadObject,
} from '../../lib/minio-storage.js';
import { ensureStorageConfigLoaded } from '../../services/storageIntelligenceService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const BUCKET_MAP = {
  'agency-assets': 'imobzycrm',
  'property-images': 'imobzycrm',
  imobzyimg: 'imobzycrm',
  imobzycrm: 'imobzycrm',
  'imobzy-media': 'imobzycrm',
  imobzymsg: 'imobzywhatsapp',
  imobzywhatsapp: 'imobzywhatsapp',
  'whatsapp-media': 'imobzywhatsapp',
  documents: 'documents',
  'imobzy-documents': 'documents',
  exports: 'exports',
  'imobzy-exports': 'exports',
};

const ALLOWED_MIME_BY_BUCKET = {
  imobzycrm: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  imobzywhatsapp: new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'video/mp4',
    'application/pdf',
  ]),
  documents: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
  exports: new Set([
    'application/pdf',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
};

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'video/mp4': '.mp4',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/csv': '.csv',
  'application/json': '.json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    await ensureStorageConfigLoaded();

    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo nao enviado.' });
    }

    const requestedBucket = req.body.bucket || 'imobzyimg';
    const bucket = BUCKET_MAP[requestedBucket];

    if (!bucket) {
      return res.status(400).json({ error: 'Bucket invalido.' });
    }

    validateUploadFile(bucket, req.file);

    const minioBucket = resolveMediaBucket(bucket);
    const sha256 = sha256Hex(req.file.buffer);
    const existing = minioBucket
      ? await findReusableStorageObject(req.orgId, minioBucket, sha256, bucket)
      : null;

    if (existing) {
      return res.json({
        bucket: existing.bucket,
        path: existing.object_key,
        publicUrl: getMinioPublicUrl({ bucket: existing.bucket, key: existing.object_key }),
        provider: 'minio',
        reused: true,
        sha256,
      });
    }

    const folder = sanitizePath(req.body.folder || defaultFolderForBucket(bucket));
    const originalExt = getExtensionForFile(req.file);
    const filePath = buildContentAddressedKey(req.orgId, folder, sha256, originalExt);

    const result = await uploadToConfiguredStorage(bucket, filePath, req.file);
    if (result.provider === 'minio') {
      await persistStorageObject({
        tenantId: req.orgId,
        bucket: result.bucket,
        objectKey: result.path,
        sha256,
        etag: result.etag,
        sizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        source: req.body.source || inferSourceFromFolder(folder),
        entityType: req.body.entity_type || null,
        entityId: req.body.entity_id || null,
      });
    }

    return res.json({ ...result, sha256 });
  } catch (error) {
    console.error('[Storage Upload Fatal]', error);
    if (
      error.message?.includes('Tipo de arquivo') ||
      error.message?.includes('Bucket sem politica')
    ) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Erro interno ao enviar arquivo.' });
  }
});

router.get('/signed-url', async (req, res) => {
  try {
    await ensureStorageConfigLoaded();

    if (!isMinioConfigured()) {
      return res.status(503).json({ error: 'MinIO nao configurado.' });
    }

    const requestedBucket = req.query.bucket || 'documents';
    const bucket = BUCKET_MAP[requestedBucket];
    if (!bucket) {
      return res.status(400).json({ error: 'Bucket invalido.' });
    }

    const minioBucket = resolveMediaBucket(bucket);
    if (!minioBucket) {
      return res.status(400).json({ error: 'Bucket MinIO invalido.' });
    }

    const key = String(req.query.path || '').trim();
    const isTenantPath = key.startsWith(`${req.orgId}/`) || key.startsWith(`${bucket}/${req.orgId}/`);
    if (!key || !isTenantPath) {
      return res.status(403).json({ error: 'Arquivo fora da organizacao atual.' });
    }

    const expiresInSeconds = Math.max(60, Math.min(Number(req.query.expiresInSeconds) || 300, 3600));
    const url = createPresignedGetUrl({
      bucket: minioBucket,
      key,
      expiresInSeconds,
    });

    return res.json({ bucket: minioBucket, path: key, url, expiresInSeconds });
  } catch (error) {
    console.error('[Storage Signed URL Fatal]', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao assinar URL.' });
  }
});

async function uploadToConfiguredStorage(bucket, filePath, file) {
  if (isMinioConfigured()) {
    return uploadToMinio(bucket, filePath, file);
  }

  if (allowSupabaseStorageFallback()) {
    return uploadToSupabase(bucket, filePath, file);
  }

  throw new Error('MinIO nao configurado para midias. Defina MINIO_ENDPOINT, MINIO_ACCESS_KEY e MINIO_SECRET_KEY.');
}

async function uploadToMinio(bucket, filePath, file) {
  const minioBucket = resolveMediaBucket(bucket);
  if (!minioBucket) {
    throw new Error('Bucket MinIO invalido.');
  }

  const result = await uploadObject({
    bucket: minioBucket,
    key: filePath,
    logicalBucket: bucket,
    body: file.buffer,
    contentType: file.mimetype || 'application/octet-stream',
  });

  return {
    bucket: minioBucket,
    path: result.path,
    publicUrl: result.publicUrl,
    provider: 'minio',
    etag: result.etag,
  };
}

async function findReusableStorageObject(tenantId, bucket, sha256, logicalBucket = '') {
  try {
    const supabase = getSupabaseServer();
    let query = supabase
      .from('storage_objects')
      .select('bucket, object_key, sha256, size_bytes, mime_type')
      .eq('tenant_id', tenantId)
      .eq('bucket', bucket)
      .eq('sha256', sha256)
      .is('deleted_at', null);

    const tenantPrefix = `${tenantId}/`;
    const scopedPrefix = logicalBucket ? resolveMinioObjectKey(logicalBucket, tenantPrefix) : tenantPrefix;
    if (scopedPrefix !== tenantPrefix) {
      query = query.like('object_key', `${scopedPrefix}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (/does not exist|schema cache|PGRST/i.test(error.message || '')) return null;
      throw error;
    }
    return data || null;
  } catch (error) {
    console.warn('[Storage Upload] Reuse lookup unavailable:', error.message);
    return null;
  }
}

async function persistStorageObject({
  tenantId,
  bucket,
  objectKey,
  sha256,
  etag,
  sizeBytes,
  mimeType,
  source,
  entityType,
  entityId,
}) {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('storage_objects')
      .upsert({
        tenant_id: tenantId,
        bucket,
        object_key: objectKey,
        sha256,
        etag: etag || null,
        size_bytes: sizeBytes || null,
        mime_type: mimeType || null,
        source: source || null,
        entity_type: entityType || null,
        entity_id: entityId || null,
        deleted_at: null,
      }, { onConflict: 'bucket,object_key' });

    if (error) {
      if (/does not exist|schema cache|PGRST/i.test(error.message || '')) return;
      throw error;
    }
  } catch (error) {
    console.warn('[Storage Upload] Metadata persist unavailable:', error.message);
  }
}

async function uploadToSupabase(bucket, filePath, file) {
  const supabase = getSupabaseServer();
  const { error } = await supabase.storage.from(bucket).upload(filePath, file.buffer, {
    contentType: file.mimetype || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    console.error('[Storage Upload Error]', error);
    throw new Error(error.message || 'Erro ao enviar arquivo.');
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    bucket,
    path: filePath,
    publicUrl,
    provider: 'supabase',
  };
}

function sanitizePath(value) {
  return String(value)
    .split('/')
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, '-'))
    .filter(Boolean)
    .join('/') || 'uploads';
}

function getExtension(fileName) {
  const match = String(fileName || '').match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : '';
}

function getExtensionForFile(file) {
  return EXTENSION_BY_MIME[file.mimetype] || getExtension(file.originalname);
}

function buildContentAddressedKey(tenantId, folder, sha256, extension) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const ext = extension || '.bin';
  return `${tenantId}/${folder}/${year}/${month}/${sha256}${ext}`;
}

function defaultFolderForBucket(bucket) {
  if (bucket === 'imobzymsg' || bucket === 'imobzywhatsapp' || bucket === 'whatsapp-media') return 'whatsapp/media';
  if (bucket === 'documents') return 'documents';
  if (bucket === 'exports') return 'exports';
  return 'uploads';
}

function inferSourceFromFolder(folder) {
  if (String(folder).includes('whatsapp')) return 'whatsapp';
  if (String(folder).includes('avatar')) return 'avatar';
  if (String(folder).includes('temp')) return 'temporary';
  return 'upload';
}

function validateUploadFile(bucket, file) {
  const allowed = ALLOWED_MIME_BY_BUCKET[bucket];
  if (!allowed) {
    throw new Error('Bucket sem politica de upload.');
  }

  if (!allowed.has(file.mimetype)) {
    throw new Error(`Tipo de arquivo nao permitido para este bucket: ${file.mimetype || 'desconhecido'}`);
  }
}

function randomName() {
  return Math.random().toString(36).slice(2, 15);
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export default router;
