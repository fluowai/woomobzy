import { Router } from 'express';
import multer from 'multer';

import { getSupabaseServer } from '../../lib/supabase-server.js';
import {
  allowSupabaseStorageFallback,
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

    const folder = sanitizePath(req.body.folder || 'uploads');
    const originalExt = getExtension(req.file.originalname);
    const fileName = `${randomName()}_${Date.now()}${originalExt}`;
    const filePath = `${req.orgId}/${folder}/${fileName}`;

    const result = await uploadToConfiguredStorage(bucket, filePath, req.file);

    return res.json(result);
  } catch (error) {
    console.error('[Storage Upload Fatal]', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao enviar arquivo.' });
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

function randomName() {
  return Math.random().toString(36).slice(2, 15);
}

export default router;
