import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();

router.get('/metrics', DashboardController.getMetrics);
router.get('/audit-trail', DashboardController.getAuditTrail);
router.get('/stream', DashboardController.streamEvents);

export default router;
