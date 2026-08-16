import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import multer from 'multer';
import { AnalysisController } from './analysis/controller.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post(
  '/analysis/kmz',
  verifyAuth,
  requireTenant,
  upload.single('file'),
  AnalysisController.uploadKMZ
);

router.get(
  '/analysis/status/:analysisId',
  verifyAuth,
  requireTenant,
  AnalysisController.checkStatus
);

router.get(
  '/analysis/report/:analysisId/pdf',
  verifyAuth,
  requireTenant,
  AnalysisController.downloadPDF
);

export default router;
