import { Response } from 'express';
import { CartService } from './cartService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { valkey } from '../valkey/client.js';

function getCartUserId(req: AuthenticatedRequest): string {
  // If user logged in, use their ID. Else fallback to guest session headers or session token
  if (req.user) return req.user.id;
  const guestHeader = req.headers['x-guest-session-id'] as string;
  return guestHeader || 'guest:anonymous';
}

export async function getCartController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = getCartUserId(req);
  try {
    const cart = await CartService.getCart(userId);
    res.status(200).json(cart);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function addItemController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = getCartUserId(req);
  const { productId, quantity } = req.body;

  if (!productId || typeof quantity !== 'number') {
    res.status(400).json({ error: 'BadRequest', message: 'productId and quantity are required' });
    return;
  }

  try {
    const cart = await CartService.addItem(userId, productId, quantity);
    
    // Broadcast add-to-cart analytics
    valkey.publish('analytics:events', JSON.stringify({ type: 'cart_add', productId, quantity }));

    res.status(200).json(cart);
  } catch (error: any) {
    res.status(400).json({ error: 'BadRequest', message: error.message });
  }
}

export async function updateQuantityController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = getCartUserId(req);
  const { productId } = req.params;
  const { quantity } = req.body;

  if (typeof quantity !== 'number') {
    res.status(400).json({ error: 'BadRequest', message: 'quantity must be a number' });
    return;
  }

  try {
    const cart = await CartService.updateQuantity(userId, productId, quantity);
    res.status(200).json(cart);
  } catch (error: any) {
    res.status(400).json({ error: 'BadRequest', message: error.message });
  }
}

export async function removeItemController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = getCartUserId(req);
  const { productId } = req.params;

  try {
    const cart = await CartService.removeItem(userId, productId);
    res.status(200).json(cart);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function clearCartController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = getCartUserId(req);

  try {
    await CartService.clearCart(userId);
    res.status(200).json({ message: 'Cart cleared' });
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function applyCouponController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = getCartUserId(req);
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'BadRequest', message: 'Coupon code is required' });
    return;
  }

  try {
    const cart = await CartService.applyCoupon(userId, code);
    res.status(200).json(cart);
  } catch (error: any) {
    res.status(400).json({ error: 'BadRequest', message: error.message });
  }
}

export async function removeCouponController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = getCartUserId(req);

  try {
    const cart = await CartService.removeCoupon(userId);
    res.status(200).json(cart);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function mergeCartController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { guestSessionId } = req.body;
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'User must be authenticated' });
    return;
  }

  if (!guestSessionId) {
    res.status(400).json({ error: 'BadRequest', message: 'guestSessionId is required' });
    return;
  }

  try {
    const cart = await CartService.mergeCarts(guestSessionId, req.user.id);
    res.status(200).json(cart);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}
