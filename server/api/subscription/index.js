import { Router } from 'express';
import checkoutRoutes from './checkout.js';
import cancelRoutes from './cancel.js';
import statusRoutes from './status.js';
import invoicesRoutes from './invoices.js';

const router = Router();

router.use(checkoutRoutes);
router.use(cancelRoutes);
router.use(statusRoutes);
router.use(invoicesRoutes);

export default router;
