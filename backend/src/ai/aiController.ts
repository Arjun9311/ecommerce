import { Response } from 'express';
import { AIService } from './aiService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function chatAssistantController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { query } = req.body;
  const userId = req.user ? req.user.id : req.headers['x-guest-session-id'] as string || 'anonymous';

  if (!query) {
    res.status(400).json({ error: 'BadRequest', message: 'Chat query is required' });
    return;
  }

  try {
    const data = await AIService.chatAssistant(query, userId);
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function discoverProductsController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { query } = req.query;

  if (!query) {
    res.status(400).json({ error: 'BadRequest', message: 'Discover query is required' });
    return;
  }

  try {
    const products = await AIService.discoverProducts(query as string);
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}
