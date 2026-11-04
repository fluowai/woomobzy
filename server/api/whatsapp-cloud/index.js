import { Router } from 'express';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.js';
import credentialsRouter from './credentials.js';
import webhookRouter from './webhook.js';
import sendRouter from './send.js';
import dataDeletionRouter from './data-deletion.js';

const router = Router();

router.use('/credentials', verifyAuth, verifyAdmin, credentialsRouter);
router.use('/send', verifyAuth, sendRouter);
router.use('/webhook', webhookRouter);
router.use('/data-deletion', dataDeletionRouter);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', provider: 'cloudapi' });
});

export default router;
