import { Router } from 'express';
import { RecoveryController } from '../controllers/recovery.controller';

const router = Router();

router.get('/active', RecoveryController.getActiveRecoveries);
router.get('/:id', RecoveryController.getRecoveryById);
router.post('/confirm', RecoveryController.confirmRecoveryAction);
router.post('/complete-payment', RecoveryController.completeRecoveryPayment);

export default router;
