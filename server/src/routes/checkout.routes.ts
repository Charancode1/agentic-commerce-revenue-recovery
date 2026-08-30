import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller';

const router = Router();

router.post('/create-order', CheckoutController.createOrder);
router.post('/verify', CheckoutController.verifyPayment);
router.post('/simulate-failure', CheckoutController.simulateFailure);
router.get('/orders', CheckoutController.getOrders);

export default router;
