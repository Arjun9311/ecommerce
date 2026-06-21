import { Response } from 'express';
import { RecommendationService } from './recommendationService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getPersonalizedRecsController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user ? req.user.id : req.headers['x-guest-session-id'] as string || 'guest:anonymous';
  const { limit } = req.query;

  try {
    const products = await RecommendationService.getPersonalizedRecs(
      userId,
      limit ? parseInt(limit as string, 10) : 8
    );
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function getCustomersAlsoBoughtController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { productId } = req.params;
  const { limit } = req.query;

  try {
    const products = await RecommendationService.getCustomersAlsoBought(
      productId,
      limit ? parseInt(limit as string, 10) : 6
    );
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function getRecentlyViewedController(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(200).json([]);
    return;
  }
  const { limit } = req.query;

  try {
    const products = await RecommendationService.getRecentlyViewed(
      req.user.id,
      limit ? parseInt(limit as string, 10) : 8
    );
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function recordActionController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user ? req.user.id : req.headers['x-guest-session-id'] as string || 'guest:anonymous';
  const { productId, action } = req.body;

  if (!productId || !action || !['view', 'cart', 'buy'].includes(action)) {
    res.status(400).json({ error: 'BadRequest', message: 'productId and valid action (view, cart, buy) are required' });
    return;
  }

  try {
    await RecommendationService.recordUserAction(userId, productId, action as 'view' | 'cart' | 'buy');
    res.status(200).json({ message: 'Action recorded' });
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}
