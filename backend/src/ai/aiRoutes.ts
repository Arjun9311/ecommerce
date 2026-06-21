import { Router } from 'express';
import { chatAssistantController, discoverProductsController } from './aiController.js';

const router = Router();

router.post('/chat', chatAssistantController);
router.get('/discover', discoverProductsController);

export default router;
