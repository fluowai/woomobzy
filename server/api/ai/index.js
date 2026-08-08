import express from 'express';
import agentsRoutes from './agents.routes.js';
import chatRoutes from './chat.routes.js';
import automationRoutes from './automation.routes.js';
import cloneRoutes from './clone.routes.js';

const router = express.Router();

router.use(agentsRoutes);
router.use(chatRoutes);
router.use(automationRoutes);
router.use(cloneRoutes);

export default router;
