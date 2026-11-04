import express from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import agentsRoutes from './agents.routes.js';
import chatRoutes from './chat.routes.js';
import automationRoutes from './automation.routes.js';
import aiOperationsRoutes from '../../routes/aiOperations.js';
import aiChannelsRoutes from '../../routes/aiChannels.js';
import aiConversationsRoutes from '../../routes/aiConversations.js';

const router = express.Router();

router.use(agentsRoutes);
router.use(chatRoutes);
router.use(automationRoutes);
router.use('/operations', verifyAuth, requireTenant, aiOperationsRoutes);
router.use('/channels', verifyAuth, requireTenant, aiChannelsRoutes);
router.use('/agents/conversations', verifyAuth, requireTenant, aiConversationsRoutes);

export default router;
