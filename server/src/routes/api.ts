import { Router } from 'express';
import commerceRoutes from './commerce.routes';
import checkoutRoutes from './checkout.routes';
import recoveryRoutes from './recovery.routes';
import webhookRoutes from './webhook.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/commerce', commerceRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/recovery', recoveryRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
