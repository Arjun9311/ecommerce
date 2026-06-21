import { Response } from 'express';
import { OrderService } from './orderService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function checkoutController(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  const { shippingAddress, paymentMethod } = req.body;

  if (!shippingAddress || !paymentMethod) {
    res.status(400).json({ error: 'BadRequest', message: 'shippingAddress and paymentMethod are required' });
    return;
  }

  try {
    const order = await OrderService.checkout({
      userId: req.user.id,
      shippingAddress,
      paymentMethod,
    });
    res.status(201).json(order);
  } catch (error: any) {
    res.status(400).json({ error: 'BadRequest', message: error.message });
  }
}

export async function getOrdersController(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  try {
    const orders = await OrderService.listUserOrders(req.user.id);
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}
