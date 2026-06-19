/**
 * Locação API - Gestão de Locações
 * Mount point: /api/locacao
 *
 * Sub-routers:
 *   /leases        → lease.routes.js
 *   /templates     → template.routes.js
 *   /signatures    → signature.routes.js
 *   /invoices      → invoice.routes.js
 *   /inspections   → inspection.routes.js
 *   /adjustments   → adjustment.routes.js
 *   /terminations  → termination.routes.js
 *   /dashboard     → dashboard.routes.js
 */
import { Router } from 'express';
import leaseRoutes from './lease.routes.js';
import templateRoutes from './template.routes.js';
import signatureRoutes from './signature.routes.js';
import invoiceRoutes from './invoice.routes.js';
import inspectionRoutes from './inspection.routes.js';
import adjustmentRoutes from './adjustment.routes.js';
import terminationRoutes from './termination.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.use('/leases', leaseRoutes);
router.use('/templates', templateRoutes);
router.use('/signatures', signatureRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/adjustments', adjustmentRoutes);
router.use('/terminations', terminationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);

export default router;
