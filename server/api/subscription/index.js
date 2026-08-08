import { Router } from 'express';
import checkoutRoutes from './checkout.js';
import cancelRoutes from './cancel.js';
import statusRoutes from './status.js';
import invoicesRoutes from './invoices.js';

const router = Router();

router.use('/checkout', checkoutRoutes);
router.use('/cancel', cancelRoutes);
router.use('/status', statusRoutes);
router.use('/invoices', invoicesRoutes);

export default router;
