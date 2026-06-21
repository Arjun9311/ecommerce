import { valkey, valkeySubscriber } from '../valkey/client.js';
import { logger } from '../utils/logger.js';
import { ProductService } from '../products/productService.js';

export class AnalyticsService {
  /**
   * Initializes background Pub/Sub listener for real-time analytics events.
   * Isolates metrics tracking to prevent slowing down user response APIs.
   */
  static startEventListener(): void {
    valkeySubscriber.subscribe('analytics:events', (err) => {
      if (err) {
        logger.error('Failed to subscribe to analytics channel', err);
        return;
      }
      logger.info('🔔 Listening for real-time analytics events...');
    });

    valkeySubscriber.on('message', async (channel, message) => {
      if (channel !== 'analytics:events') return;

      try {
        const event = JSON.parse(message);
        await this.processEvent(event);
      } catch (error) {
        logger.error('Error processing subscriber event', error);
      }
    });
  }

  /**
   * Process and index analytics events.
   */
  private static async processEvent(event: any): Promise<void> {
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().split('T')[0];
    const hourStr = new Date().toISOString().split('T')[1].split(':')[0]; // e.g. "14"

    const pipeline = valkey.pipeline();

    // 1. Log hourly visitors using HyperLogLog (PFADD) for unique count
    if (event.userId) {
      pipeline.pfadd(`analytics:visitors:${dateStr}`, event.userId);
      pipeline.pfadd(`analytics:visitors:${dateStr}:${hourStr}`, event.userId);
      pipeline.expire(`analytics:visitors:${dateStr}`, 172800); // 48h
    }

    // 2. Increment global counters based on action type
    if (event.type === 'purchase') {
      // Order sales counts & revenue tracking
      pipeline.incr(`analytics:orders:count:${dateStr}`);
      pipeline.incrbyfloat(`analytics:orders:revenue:${dateStr}`, event.total);
      
      // Expire metrics keys after 30 days
      pipeline.expire(`analytics:orders:count:${dateStr}`, 2592000);
      pipeline.expire(`analytics:orders:revenue:${dateStr}`, 2592000);

      // Conversions per item
      for (const item of event.items) {
        pipeline.hincrby(`analytics:product:conversions:${dateStr}`, item.productId, 1);
        pipeline.expire(`analytics:product:conversions:${dateStr}`, 2592000);
      }
    } else if (event.type === 'view') {
      // Product view events counts
      pipeline.hincrby(`analytics:product:views:${dateStr}`, event.productId, 1);
      pipeline.expire(`analytics:product:views:${dateStr}`, 2592000);
    } else if (event.type === 'search') {
      // Searches count
      pipeline.zincrby(`analytics:searches:${dateStr}`, 1, event.query.toLowerCase().trim());
      pipeline.expire(`analytics:searches:${dateStr}`, 2592000);
    }

    await pipeline.exec();
  }

  /**
   * Generates admin dashboard metrics combining PostgreSQL orders history and Valkey counters.
   */
  static async getDashboardStats(): Promise<any> {
    const dateStr = new Date().toISOString().split('T')[0];

    // Read Valkey analytics counters for today
    const uniqueVisitors = await valkey.pfcount(`analytics:visitors:${dateStr}`) || 0;
    const ordersCount = await valkey.get(`analytics:orders:count:${dateStr}`) || '0';
    const revenue = await valkey.get(`analytics:orders:revenue:${dateStr}`) || '0';

    // Retrieve Top 5 searches from Sorted Set
    const rawSearches = await valkey.zrevrange(`analytics:searches:${dateStr}`, 0, 4, 'WITHSCORES');
    
    // Parse searches ( WITHSCORES: true returns flat strings list [member, score, ...])
    const topSearches: any[] = [];
    if (Array.isArray(rawSearches)) {
      for (let i = 0; i < rawSearches.length; i += 2) {
        topSearches.push({
          query: rawSearches[i],
          count: parseInt(rawSearches[i + 1] || '0', 10),
        });
      }
    }

    // Top Viewed products today (from Hash)
    const productViews = await valkey.hgetall(`analytics:product:views:${dateStr}`) || {};
    const viewsList = await Promise.all(
      Object.entries(productViews).map(async ([pId, count]) => {
        const product = await ProductService.getProduct(pId);
        return {
          id: pId,
          name: product?.name || 'Unknown Product',
          views: parseInt(count, 10),
        };
      })
    );
    const topProducts = viewsList.sort((a, b) => b.views - a.views).slice(0, 5);

    // Calculate Conversion Rate: orders / visitors
    const visitorNum = parseInt(uniqueVisitors.toString(), 10);
    const orderNum = parseInt(ordersCount, 10);
    const conversionRate = visitorNum > 0 ? parseFloat(((orderNum / visitorNum) * 100).toFixed(2)) : 0.0;

    return {
      date: dateStr,
      uniqueVisitors: visitorNum,
      ordersCount: orderNum,
      revenue: parseInt(revenue, 10),
      conversionRate,
      topSearches,
      topProducts,
    };
  }

  /**
   * Tracks latency metrics of HTTP endpoints for Prometheus.
   */
  static async recordLatency(endpoint: string, durationMs: number): Promise<void> {
    const timestamp = Math.floor(Date.now() / 60000) * 60000; // truncate to nearest minute
    const latencyKey = `metrics:latency:${endpoint}:${timestamp}`;
    
    const pipeline = valkey.pipeline();
    pipeline.zadd(latencyKey, durationMs, `${Date.now()}:${Math.random().toString(36).substr(2, 5)}`);
    pipeline.expire(latencyKey, 3600); // 1h retention
    await pipeline.exec();
  }
}
