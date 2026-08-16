import { Router } from 'express';
import marketRoutes from './market.routes.js';
import legalRoutes from './legal.routes.js';
import enrichmentRoutes from './enrichment.routes.js';
import mapsRoutes from './maps.routes.js';
import pdfRoutes from './pdf.routes.js';
import integrationsRoutes from './integrations.routes.js';
import analysisRoutes from './analysis.routes.js';

const router = Router();

router.use(marketRoutes);
router.use(legalRoutes);
router.use(enrichmentRoutes);
router.use(mapsRoutes);
router.use(pdfRoutes);
router.use(integrationsRoutes);
router.use(analysisRoutes);

export default router;
