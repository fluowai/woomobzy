import { Router } from 'express';
import multer from 'multer';

import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  allowSupabaseStorageFallback,
  createPresignedGetUrl,
  isMinioConfigured,
  resolveMediaBucket,
  uploadObject,
} from '../../lib/minio-storage.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const BUCKET_MAP = {
  'agency-assets': 'imobzyimg',
  'property-images': 'imobzyimg',
  imobzyimg: 'imobzyimg',
  'imobzy-media': 'imobzyimg',
  imobzymsg: 'imobzymsg',
  'whatsapp-media': 'whatsapp-media',
  documents: 'documents',
  'imobzy-documents': 'documents',
  exports: 'exports',
  'imobzy-exports': 'exports',
};

const ALLOWED_MIME_BY_BUCKET = {
  imobzyimg: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  imobzymsg: new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'video/mp4',
    'application/pdf',
  ]),
  'whatsapp-media': new Set([
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
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo nao enviado.' });
    }

    const requestedBucket = req.body.bucket || 'imobzyimg';
    const bucket = BUCKET_MAP[requestedBucket];

    if (!bucket) {
      return res.status(400).json({ error: 'Bucket invalido.' });
    }

    validateUploadFile(bucket, req.file);

    const folder = sanitizePath(req.body.folder || 'uploads');
    const originalExt = getExtensionForFile(req.file);
    const fileName = `${randomName()}_${Date.now()}${originalExt}`;
    const filePath = `${req.orgId}/${folder}/${fileName}`;

    const result = await uploadToConfiguredStorage(bucket, filePath, req.file);

    return res.json(result);
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

router.get('/signed-url', (req, res) => {
  try {
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
    if (!key || !key.startsWith(`${req.orgId}/`)) {
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
    body: file.buffer,
    contentType: file.mimetype || 'application/octet-stream',
  });

  return {
    bucket: minioBucket,
    path: result.path,
    publicUrl: result.publicUrl,
    provider: 'minio',
  };
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

export default router;
