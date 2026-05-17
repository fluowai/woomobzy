import { Router } from 'express';
import multer from 'multer';

import { getSupabaseServer } from '../../lib/supabase-server.js';

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

    const supabase = getSupabaseServer();
    const { error } = await supabase.storage.from(bucket).upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype || 'application/octet-stream',
      upsert: false,
    });

    if (error) {
      console.error('[Storage Upload Error]', error);
      return res.status(500).json({ error: error.message || 'Erro ao enviar arquivo.' });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return res.json({
      bucket,
      path: filePath,
      publicUrl,
    });
  } catch (error) {
    console.error('[Storage Upload Fatal]', error);
    return res.status(500).json({ error: 'Erro interno ao enviar arquivo.' });
  }
});

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
