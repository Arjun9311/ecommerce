import { Router } from 'express';
import { getTrendingController, trackEventController } from './trendingController.js';

const router = Router();

router.get('/', getTrendingController);
router.post('/event', trackEventController);

export default router;
