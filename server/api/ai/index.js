import express from 'express';
import agentsRoutes from './agents.routes.js';
import chatRoutes from './chat.routes.js';
import automationRoutes from './automation.routes.js';
import aiOperationsRoutes from '../../routes/aiOperations.js';
import aiAgentsRoutes from '../../routes/aiAgents.js';
import aiChannelsRoutes from '../../routes/aiChannels.js';

const router = express.Router();

router.use(agentsRoutes);
router.use(chatRoutes);
router.use(automationRoutes);
router.use('/operations', aiOperationsRoutes);
router.use('/agents', aiAgentsRoutes);
router.use('/channels', aiChannelsRoutes);

export default router;
