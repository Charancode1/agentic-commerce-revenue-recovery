import { Router } from 'express';
import { CommerceController } from '../controllers/commerce.controller';

const router = Router();

router.get('/products', CommerceController.getProducts);
router.get('/products/:id', CommerceController.getProductById);
router.post('/chat', CommerceController.chatWithAgent);

export default router;
