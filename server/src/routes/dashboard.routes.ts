import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();

router.get('/metrics', DashboardController.getMetrics);
router.get('/audit-trail', DashboardController.getAuditTrail);
router.post('/reset', DashboardController.resetData);
router.get('/stream', DashboardController.streamEvents);

export default router;
