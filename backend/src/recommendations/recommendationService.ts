import { valkey, jsonGet } from '../valkey/client.js';
import { ProductService } from '../products/productService.js';
import { query } from '../db/postgres.js';

export class RecommendationService {
  /**
   * Tracks user interaction to build interest profiles in Valkey.
   */
  static async recordUserAction(userId: string, productId: string, action: 'view' | 'cart' | 'buy'): Promise<void> {
    const product = await ProductService.getProduct(productId);
    if (!product) return;

    const pipeline = valkey.pipeline();

    // 1. Maintain a list of recently viewed product IDs per user (Max 15 items)
    if (action === 'view') {
      const viewKey = `recently_viewed:${userId}`;
      pipeline.lpush(viewKey, productId);
      pipeline.ltrim(viewKey, 0, 14); // Keep newest 15
      pipeline.expire(viewKey, 604800); // 7 days TTL
    }

    // 2. Increment category interest weights in User Hash
    // e.g. user_interests:userId category:123 -> weight
    const score = action === 'buy' ? 5 : action === 'cart' ? 3 : 1;
    const interestKey = `user_interests:${userId}`;
    pipeline.hincrby(interestKey, product.categoryId, score);
    pipeline.expire(interestKey, 2592000); // 30 days interest window

    await pipeline.exec();
  }

  /**
   * Generates custom recommendations for homepage ("For You").
   * Weighs products by user's top categories combined with global trending items.
   */
  static async getPersonalizedRecs(userId: string, limit = 8): Promise<any[]> {
    const interestKey = `user_interests:${userId}`;
    const interests = await valkey.hgetall(interestKey);

    if (!interests || Object.keys(interests).length === 0) {
      // Return general trending products if profile is fresh/anonymous
      const trending = await valkey.zrevrange('trending:global:24h', 0, limit - 1);
      if (trending.length > 0) {
        const list: any[] = [];
        for (const pId of trending) {
          const p = await ProductService.getProduct(pId);
          if (p) list.push(p);
        }
        return list;
      }
      
      // Secondary fallback: first N products
      const catalog = await ProductService.listProducts({ page: 1, limit });
      return catalog.products;
    }

    // Sort categories by score descending
    const sortedCategories = Object.entries(interests)
      .map(([catId, score]) => ({ catId, score: parseInt(score, 10) }))
      .sort((a, b) => b.score - a.score);

    const recommendedIds: string[] = [];

    // Get 3 items from top category, 2 from second, 1 from third, etc.
    const allocations = [4, 3, 2, 1];
    for (let i = 0; i < sortedCategories.length && i < allocations.length; i++) {
      const catId = sortedCategories[i].catId;
      const count = allocations[i];

      // Pull from categories products index in Valkey
      const productIds = await valkey.zrevrange(`category_products:${catId}`, 0, count - 1);
      recommendedIds.push(...productIds);
    }

    // De-duplicate recommended IDs
    const uniqueIds = Array.from(new Set(recommendedIds)).slice(0, limit);

    const products: any[] = [];
    for (const pId of uniqueIds) {
      const p = await ProductService.getProduct(pId);
      if (p) products.push(p);
    }

    return products;
  }

  /**
   * "Customers Also Bought" - finds products purchased together.
   * Simple query inside Postgres transaction history to retrieve related orders.
   */
  static async getCustomersAlsoBought(productId: string, limit = 6): Promise<any[]> {
    const sql = `
      SELECT oi2.product_id, COUNT(*) as count 
      FROM order_items oi1 
      JOIN order_items oi2 ON oi1.order_id = oi2.order_id 
      WHERE oi1.product_id = $1 AND oi2.product_id != $1 
      GROUP BY oi2.product_id 
      ORDER BY count DESC 
      LIMIT $2
    `;
    const rows = await query(sql, [productId, limit]);
    
    const products: any[] = [];
    for (const row of rows) {
      const p = await ProductService.getProduct(row.product_id);
      if (p) products.push(p);
    }

    if (products.length === 0) {
      // Fallback: Similar products in same category
      const current = await ProductService.getProduct(productId);
      if (current) {
        const catProducts = await valkey.zrevrange(`category_products:${current.categoryId}`, 0, limit);
        for (const id of catProducts) {
          if (id !== productId) {
            const p = await ProductService.getProduct(id);
            if (p) products.push(p);
          }
        }
      }
    }

    return products;
  }

  /**
   * Gets recently viewed products.
   */
  static async getRecentlyViewed(userId: string, limit = 8): Promise<any[]> {
    const viewKey = `recently_viewed:${userId}`;
    const productIds = await valkey.lrange(viewKey, 0, limit - 1);
    
    const products: any[] = [];
    for (const pId of productIds) {
      const p = await ProductService.getProduct(pId);
      if (p) products.push(p);
    }
    return products;
  }
}
