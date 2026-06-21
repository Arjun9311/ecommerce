import { Response } from 'express';
import { AdService } from './adService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function serveAdsController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { categoryId, query } = req.query;
  const userId = req.user ? req.user.id : req.headers['x-guest-session-id'] as string || 'anonymous';

  try {
    const ads = await AdService.serveAds({
      categoryId: categoryId as string,
      query: query as string,
      userId,
    });
    res.status(200).json(ads);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function clickAdController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { adId } = req.params;
  const userId = req.user ? req.user.id : req.headers['x-guest-session-id'] as string || 'anonymous';

  try {
    await AdService.recordClick(adId, userId);
    res.status(200).json({ message: 'Click recorded' });
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function impressAdController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { adId } = req.params;
  const userId = req.user ? req.user.id : req.headers['x-guest-session-id'] as string || 'anonymous';

  try {
    await AdService.recordImpression(adId, userId);
    res.status(200).json({ message: 'Impression recorded' });
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function getAdStatsController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { adId } = req.params;

  try {
    const stats = await AdService.getStats(adId);
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}
