import { Router } from 'express';
import { getDashboardStatsController, getPrometheusMetricsController } from './analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticate, authorize('admin'), getDashboardStatsController);
router.get('/metrics', getPrometheusMetricsController);
router.get('/', (req, res) => {
  res.status(200).json({ status: 'active', service: 'Valkey Commerce AI Analytics Engine' });
});

export default router;
