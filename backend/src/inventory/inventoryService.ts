import { valkey, acquireInventoryLock, releaseInventoryLock } from '../valkey/client.js';
import { ProductService } from '../products/productService.js';
import { query } from '../db/postgres.js';
import { logger } from '../utils/logger.js';

export class InventoryService {
  /**
   * Safe decrement of inventory during checkout using Valkey locking.
   * Prevents overselling/race conditions when multiple users checkout at the exact same moment.
   */
  static async reserveStock(productId: string, quantity: number): Promise<boolean> {
    const lockAcquired = await acquireInventoryLock(productId, 10); // 10-second lock
    if (!lockAcquired) {
      logger.warn(`Could not acquire inventory lock for product: ${productId}`);
      return false;
    }

    try {
      const product = await ProductService.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const availableStock = product.inventory.quantity;
      if (availableStock < quantity) {
        logger.warn(`Insufficient stock for product: ${productId}. Requested: ${quantity}, Available: ${availableStock}`);
        return false;
      }

      // Decrement locally in product object
      product.inventory.quantity -= quantity;
      product.inventory.reserved += quantity;

      // Save updated JSON doc to Valkey
      await valkey.call('JSON.SET', productId, '$', JSON.stringify(product));

      // Also publish real-time stock updates to clients (Pub/Sub)
      await valkey.publish('inventory:updates', JSON.stringify({
        productId,
        quantity: product.inventory.quantity,
        alertType: product.inventory.quantity <= 5 ? 'LOW_STOCK' : 'SYNC',
      }));

      return true;
    } finally {
      await releaseInventoryLock(productId);
    }
  }

  /**
   * Release reserved stock back if checkout fails.
   */
  static async releaseStock(productId: string, quantity: number): Promise<void> {
    const lockAcquired = await acquireInventoryLock(productId, 10);
    if (!lockAcquired) {
      // In a real system, queue for retry or force override
      throw new Error(`Inventory lock failure during release of product: ${productId}`);
    }

    try {
      const product = await ProductService.getProduct(productId);
      if (product) {
        product.inventory.quantity += quantity;
        product.inventory.reserved = Math.max(0, product.inventory.reserved - quantity);

        await valkey.call('JSON.SET', productId, '$', JSON.stringify(product));

        // Publish update
        await valkey.publish('inventory:updates', JSON.stringify({
          productId,
          quantity: product.inventory.quantity,
          alertType: 'SYNC',
        }));
      }
    } finally {
      await releaseInventoryLock(productId);
    }
  }

  /**
   * Finalize transaction, committing stock decrement permanently to Postgres canonical store.
   */
  static async commitStock(productId: string, quantity: number): Promise<void> {
    const product = await ProductService.getProduct(productId);
    if (product) {
      // Decrement reserve, persist to Postgres
      product.inventory.reserved = Math.max(0, product.inventory.reserved - quantity);
      await valkey.call('JSON.SET', productId, '$', JSON.stringify(product));

      // Postgres persistence sync
      await query(
        'UPDATE products SET stock = stock - $1, reserved = GREATEST(0, reserved - $1) WHERE id = $2',
        [quantity, productId]
      );
    }
  }
}
