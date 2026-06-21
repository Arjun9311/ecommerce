import { Router } from 'express';
import { serveAdsController, clickAdController, impressAdController, getAdStatsController } from './adController.js';

const router = Router();

router.get('/serve', serveAdsController);
router.post('/click/:adId', clickAdController);
router.post('/impression/:adId', impressAdController);
router.get('/stats/:adId', getAdStatsController);

export default router;
