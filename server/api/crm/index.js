import { Router } from 'express';
import leadsRoutes from './leads.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import distributionRoutes from './distribution.routes.js';
import dripRoutes from './drip.routes.js';
import reportsRoutes from './reports.routes.js';

const router = Router();

router.use(leadsRoutes);
router.use(whatsappRoutes);
router.use(distributionRoutes);
router.use('/drip', dripRoutes);
router.use('/reports', reportsRoutes);

export default router;
