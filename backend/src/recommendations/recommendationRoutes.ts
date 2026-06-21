import { Router } from 'express';
import {
  getPersonalizedRecsController,
  getCustomersAlsoBoughtController,
  getRecentlyViewedController,
  recordActionController,
} from './recommendationController.js';

const router = Router();

router.post('/action', recordActionController);
router.get('/personalized', getPersonalizedRecsController);
router.get('/recently-viewed', getRecentlyViewedController);
router.get('/also-bought/:productId', getCustomersAlsoBoughtController);

export default router;
