import { Router } from 'express';
import multer from 'multer';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { DocumentService } from '../../services/documentService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo nao permitido. Use PDF, JPEG, PNG ou DOC.'));
    }
  },
});

function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id));
}

router.post('/upload/:propertyId', verifyAuth, requireTenant, upload.single('file'), async (req, res) => {
  try {
    const { propertyId } = req.params;
    if (!isValidUUID(propertyId)) {
      return res.status(400).json({ error: 'ID de propriedade invalido' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo obrigatorio' });
    }

    const doc = await DocumentService.uploadAndProcess(req.file, propertyId, req.orgId, req.user.id);
    res.status(201).json({ success: true, document: doc });
  } catch (error) {
    console.error('[Documents] Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:propertyId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { propertyId } = req.params;
    if (!isValidUUID(propertyId)) {
      return res.status(400).json({ error: 'ID de propriedade invalido' });
    }

    const documents = await DocumentService.listByProperty(propertyId, req.orgId);
    res.json({ success: true, documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:documentId/analysis', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { documentId } = req.params;
    if (!isValidUUID(documentId)) {
      return res.status(400).json({ error: 'ID de documento invalido' });
    }

    const analysis = await DocumentService.getAnalysis(documentId, req.orgId);
    res.json({ success: true, ...analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:documentId/classify', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { document_type } = req.body;

    if (!isValidUUID(documentId)) {
      return res.status(400).json({ error: 'ID de documento invalido' });
    }
    if (!document_type) {
      return res.status(400).json({ error: 'document_type obrigatorio' });
    }

    await DocumentService.classify(documentId, req.orgId, document_type);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:documentId', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { documentId } = req.params;
    if (!isValidUUID(documentId)) {
      return res.status(400).json({ error: 'ID de documento invalido' });
    }

    await DocumentService.deleteDocument(documentId, req.orgId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook/worker-result', async (req, res) => {
  try {
    const { document_id, result, error } = req.body;

    if (error) {
      await DocumentService._updateStatus(document_id, 'failed', error);
      return res.json({ success: true });
    }

    if (!document_id || !result) {
      return res.status(400).json({ error: 'document_id e result obrigatorios' });
    }

    await DocumentService.processWorkerResult(document_id, result);
    res.json({ success: true });
  } catch (error) {
    console.error('[Documents] Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
