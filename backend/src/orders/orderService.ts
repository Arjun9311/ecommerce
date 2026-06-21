import { query, queryOne } from '../db/postgres.js';
import { CartService } from '../cart/cartService.js';
import { InventoryService } from '../inventory/inventoryService.js';
import { valkey, jsonGet } from '../valkey/client.js';
import { createId } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export interface OrderInput {
  userId: string;
  shippingAddress: any;
  paymentMethod: string;
}

export class OrderService {
  /**
   * Processes order checkout using Valkey distributed locks to guarantee transactional consistency.
   */
  static async checkout(input: OrderInput): Promise<any> {
    const { userId, shippingAddress, paymentMethod } = input;
    
    // 1. Get user's cart from Valkey
    const cart = await CartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new Error('Cannot checkout an empty cart');
    }

    // 2. Reserve stock in parallel using Valkey atomic locks
    const reservedItems: { productId: string; quantity: number }[] = [];
    let isSuccess = true;

    for (const item of cart.items) {
      const reserved = await InventoryService.reserveStock(item.productId, item.quantity);
      if (reserved) {
        reservedItems.push({ productId: item.productId, quantity: item.quantity });
      } else {
        isSuccess = false;
        break;
      }
    }

    // Rollback reserved stock if any product fails verification
    if (!isSuccess) {
      logger.warn(`Checkout failed for user: ${userId}. Rolling back stock reservations.`);
      for (const item of reservedItems) {
        await InventoryService.releaseStock(item.productId, item.quantity);
      }
      throw new Error('One or more items in your cart went out of stock. Please update your cart.');
    }

    // 3. Create order record in PostgreSQL
    const orderId = createId('order');
    const tax = Math.floor(cart.total * 0.18); // 18% GST simulation
    const shipping = cart.total > 50000 ? 0 : 15000; // Free shipping over 500 INR
    const finalTotal = cart.total + tax + shipping;

    const payment = {
      method: paymentMethod,
      transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      status: 'captured',
    };

    const delivery = {
      estimatedAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), // 3 days estimate
      trackingId: `DEL-HYD-${Math.floor(Math.random() * 900000) + 100000}`,
      status: 'pending',
    };

    try {
      // Begin Postgres Transaction
      await query('BEGIN');

      await query(
        `INSERT INTO orders (
          id, user_id, status, subtotal, discount, coupon_code, tax, shipping, total, shipping_address, payment, delivery
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          orderId,
          userId,
          'confirmed',
          cart.subtotal,
          cart.discount,
          cart.couponCode,
          tax,
          shipping,
          finalTotal,
          JSON.stringify(shippingAddress),
          JSON.stringify(payment),
          JSON.stringify(delivery),
        ]
      );

      for (const item of cart.items) {
        const itemId = createId('item');
        // Fetch product's vendor details from Valkey JSON
        const product = await jsonGet<any>(item.productId);
        const vendorId = product?.vendorId || '';

        await query(
          `INSERT INTO order_items (id, order_id, product_id, vendor_id, sku, name, quantity, price) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [itemId, orderId, item.productId, vendorId, item.sku, item.name, item.quantity, item.price]
        );

        // Commit stock decrement in Postgres and release Valkey reserve
        await InventoryService.commitStock(item.productId, item.quantity);
      }

      await query('COMMIT');

      // 4. Update coupon usage history if applicable
      if (cart.couponCode) {
        await valkey.sadd(`coupon_used:${cart.couponCode}`, userId);
        await valkey.call('JSON.NUMINCRBY', `coupon:${cart.couponCode}`, '$.usedCount', '1');
      }

      // 5. Clear user cart in Valkey
      await CartService.clearCart(userId);

      // 6. Push real-time analytics events to Valkey Pub/Sub
      await valkey.publish(
        'analytics:events',
        JSON.stringify({
          type: 'purchase',
          orderId,
          userId,
          total: finalTotal,
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
        })
      );

      // 7. Track trending purchases
      for (const item of cart.items) {
        await valkey.zincrby('trending:global:1h', 5 * item.quantity, item.productId);
        await valkey.zincrby('trending:global:24h', 5 * item.quantity, item.productId);
      }

      return {
        id: orderId,
        userId,
        status: 'confirmed',
        subtotal: cart.subtotal,
        discount: cart.discount,
        couponCode: cart.couponCode,
        tax,
        shipping,
        total: finalTotal,
        shippingAddress,
        payment,
        delivery,
        items: cart.items,
        createdAt: new Date().toISOString(),
      };
    } catch (err: any) {
      await query('ROLLBACK');
      logger.error('Postgres Order transaction rollback occurred', err);
      // Release reservations back to available stock in Valkey
      for (const item of reservedItems) {
        await InventoryService.releaseStock(item.productId, item.quantity);
      }
      throw err;
    }
  }

  /**
   * Retrieves order history for a user from Postgres.
   */
  static async listUserOrders(userId: string): Promise<any[]> {
    const orders = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    
    // Hydrate items for each order
    const list: any[] = [];
    for (const order of orders) {
      const items = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      list.push({
        ...order,
        subtotal: parseInt(order.subtotal),
        discount: parseInt(order.discount),
        tax: parseInt(order.tax),
        shipping: parseInt(order.shipping),
        total: parseInt(order.total),
        items: items.map((i) => ({
          productId: i.product_id,
          vendorId: i.vendor_id,
          sku: i.sku,
          name: i.name,
          quantity: i.quantity,
          price: parseInt(i.price),
        })),
      });
    }

    return list;
  }
}
