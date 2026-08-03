import express from 'express';

import adminRoutes from './admin.js';
import adminTemplateRoutes from './admin-templates.js';
import internalRoutes from './internal.js';
import importRoutes from './import.js';
import publicRoutes from './public.js';
import onboardingRoutes from './onboarding.js';
import domainRoutes from './domains.js';
import jarvisRoutes from './jarvis.js';
import accountRoutes from './account.js';
import wootechAiRoutes from './wootechAi.js';
import cvcrmBiaRoutes from './cvcrmBia.js';
import megaAdminRoutes from './mega-admin.js';
import subscriptionRoutes from './subscription.js';
import licensingRoutes from '../api/licensing/index.js';
import megaLicensesRoutes from '../api/mega-licenses/index.js';

const router = express.Router();

router.use('/internal', internalRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/admin/templates', adminTemplateRoutes);
router.use('/api/import', importRoutes);
router.use('/api/public', publicRoutes);
router.use('/api/onboarding', onboardingRoutes);
router.use('/api/domains', domainRoutes);
router.use('/api/jarvis', jarvisRoutes);
router.use('/api/account', accountRoutes);
router.use('/api/wootech-ai', wootechAiRoutes);
router.use('/api/cvcrm-bia', cvcrmBiaRoutes);
router.use('/api/mega', megaAdminRoutes);
router.use('/api/mega/licenses', megaLicensesRoutes);
router.use('/api/subscription', subscriptionRoutes);
router.use('/api/licensing/v1', licensingRoutes);

export default router;
