import { Request, Response } from 'express';
import { TrendingService } from './trendingService.js';

export async function getTrendingController(req: Request, res: Response): Promise<void> {
  const { window, categoryId, limit } = req.query;

  try {
    const products = await TrendingService.getTrendingProducts(
      (window as '1h' | '24h') || '24h',
      categoryId as string,
      limit ? parseInt(limit as string, 10) : 10
    );
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function trackEventController(req: Request, res: Response): Promise<void> {
  const { type, productId } = req.body;

  if (!type || !productId || !['view', 'cart_add', 'purchase'].includes(type)) {
    res.status(400).json({ error: 'BadRequest', message: 'Valid type (view, cart_add, purchase) and productId are required' });
    return;
  }

  try {
    await TrendingService.trackEvent(type, productId);
    res.status(200).json({ message: 'Event tracked successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}
