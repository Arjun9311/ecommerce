import { Router } from 'express';
import {
  getCartController,
  addItemController,
  updateQuantityController,
  removeItemController,
  clearCartController,
  applyCouponController,
  removeCouponController,
  mergeCartController,
} from './cartController.js';
import { authenticate } from '../middleware/auth.js';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { valkey } from '../valkey/client.js';

// Optional auth: populates req.user if a valid token is present, but doesn't block if absent
async function optionalAuth(req: any, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const sessionKey = `session:${decoded.id}:${decoded.jti}`;
    const isActive = await valkey.get(sessionKey);
    if (isActive) {
      req.user = decoded;
      req.sessionId = decoded.jti;
    }
  } catch (e) {
    // ignore — treat as unauthenticated
  }
  next();
}

const router = Router();

// Apply optionalAuth to all cart routes so req.user is populated when available
router.use(optionalAuth);

router.get('/', getCartController);
router.post('/items', addItemController);
router.patch('/items/:productId', updateQuantityController);
router.delete('/items/:productId', removeItemController);
router.delete('/', clearCartController);
router.post('/coupon', applyCouponController);
router.delete('/coupon', removeCouponController);
router.post('/merge', mergeCartController);

export default router;
