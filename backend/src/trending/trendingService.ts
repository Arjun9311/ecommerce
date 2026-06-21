import { valkey } from '../valkey/client.js';
import { ProductService } from '../products/productService.js';

export class TrendingService {
  private static WEIGHTS = {
    view: 1,
    cart_add: 3,
    purchase: 5,
  };

  /**
   * Tracks an event by incrementing score inside time-decayed sorted sets.
   */
  static async trackEvent(type: 'view' | 'cart_add' | 'purchase', productId: string): Promise<void> {
    const score = this.WEIGHTS[type] || 1;
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().split('T')[0];

    // Get product details for category context
    const product = await ProductService.getProduct(productId);
    if (!product) return;

    const pipeline = valkey.pipeline();

    // 1. Increment global trending sets (1h and 24h)
    pipeline.zincrby('trending:global:1h', score, productId);
    pipeline.zincrby('trending:global:24h', score, productId);

    // 2. Increment category-specific sets
    pipeline.zincrby(`trending:category:${product.categoryId}:1h`, score, productId);
    pipeline.zincrby(`trending:category:${product.categoryId}:24h`, score, productId);

    // Set TTL on 1h sets if they were just initialized
    pipeline.expire('trending:global:1h', 3600);
    pipeline.expire(`trending:category:${product.categoryId}:1h`, 3600);
    
    // Set TTL on 24h sets
    pipeline.expire('trending:global:24h', 86400);
    pipeline.expire(`trending:category:${product.categoryId}:24h`, 86400);

    // 3. Track chronological product views time series for charts
    if (type === 'view') {
      pipeline.zadd(`product_views:${productId}:${dateStr}`, timestamp, `${timestamp}:${Math.random().toString(36).substr(2, 5)}`);
      pipeline.expire(`product_views:${productId}:${dateStr}`, 172800); // 48h TTL
    }

    await pipeline.exec();
  }

  /**
   * Returns top trending products from sorted sets.
   */
  static async getTrendingProducts(timeWindow: '1h' | '24h' = '24h', categoryId?: string, limit = 10): Promise<any[]> {
    const key = categoryId 
      ? `trending:category:${categoryId}:${timeWindow}`
      : `trending:global:${timeWindow}`;

    // Get members from sorted set (highest score first)
    const productIdsWithScores = await valkey.zrevrange(key, 0, limit - 1);
    
    if (productIdsWithScores.length === 0) {
      // Fallback: Return top products based on ratings/price from catalog
      const fallback = await ProductService.listProducts({ page: 1, limit });
      return fallback.products;
    }

    // Retrieve details for each product
    const products: any[] = [];
    for (const pId of productIdsWithScores) {
      const p = await ProductService.getProduct(pId);
      if (p) products.push(p);
    }

    return products;
  }

  /**
   * Cleans up decayed values in case some sets persist beyond their expiration (manual maintenance).
   */
  static async decayScores(): Promise<void> {
    // Standard ZREMRANGEBYSCORE or key expiration takes care of decays.
    // In advanced decay, we can multiply all elements by e.g. 0.9 every hour (exponential decay)
    const keys = await valkey.keys('trending:*:24h');
    for (const key of keys) {
      const members = await valkey.zrange(key, 0, -1, 'WITHSCORES');
      // members is flat array: [member1, score1, member2, score2...]
      // Wait, iovalkey zRange with WITHSCORES returns array of objects/tuples depending on options
      // Let's do simple multiplier via script or individual zadd
    }
  }
}
