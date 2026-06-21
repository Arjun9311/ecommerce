import { Router } from 'express';
import { checkoutController, getOrdersController } from './orderController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/checkout', checkoutController);
router.get('/', getOrdersController);

export default router;
