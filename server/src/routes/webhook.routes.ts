import { Router } from 'express';
import { WebhookHandler } from '../razorpay/webhook-handler';

const router = Router();

router.post('/razorpay', WebhookHandler.handleWebhook.bind(WebhookHandler));

export default router;
