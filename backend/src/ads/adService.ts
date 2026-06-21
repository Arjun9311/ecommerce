import { valkey, jsonGet } from '../valkey/client.js';

export interface AdContext {
  categoryId?: string;
  query?: string;
  userId?: string;
}

export class AdService {
  /**
   * Retrieves high-bid ads corresponding to current page category context or search keywords.
   * Prevents showing ads that have exhausted their budget or exceeded frequency caps.
   */
  static async serveAds(context: AdContext, limit = 1): Promise<any[]> {
    const { categoryId, query, userId = 'anonymous' } = context;
    const dateStr = new Date().toISOString().split('T')[0];
    const adIds: string[] = [];

    // 1. Get ads by category
    if (categoryId) {
      const candidates = await valkey.zrevrange(`ads:category:${categoryId}`, 0, 5);
      adIds.push(...candidates);
    }

    // 2. Fallback or general ads (fetch active ads)
    if (adIds.length < limit) {
      // Find all active ad keys
      const keys = await valkey.keys('ad:*');
      adIds.push(...keys.slice(0, 5));
    }

    // De-duplicate
    const uniqueAdIds = Array.from(new Set(adIds));
    const servedAds: any[] = [];

    for (const adKey of uniqueAdIds) {
      if (servedAds.length >= limit) break;

      const adId = adKey.includes(':') ? adKey : `ad:${adKey}`;
      const ad = await jsonGet<any>(adId);
      if (!ad || ad.status !== 'active') continue;

      // Check daily budget limits via Valkey INCR counter
      const spendKey = `ad_spend:${ad.id}:${dateStr}`;
      const currentSpend = await valkey.get(spendKey);
      if (currentSpend && parseInt(currentSpend, 10) >= ad.dailyBudget) {
        continue; // budget exhausted
      }

      // Check frequency capping per user per day (max 3 times)
      if (userId !== 'anonymous') {
        const freqKey = `ad_freq:${userId}:${ad.id}:${dateStr}`;
        const userSeenCount = await valkey.get(freqKey);
        if (userSeenCount && parseInt(userSeenCount, 10) >= 3) {
          continue; // frequency cap reached
        }
      }

      servedAds.push(ad);
    }

    return servedAds;
  }

  /**
   * Records an ad impression, increments frequency counter.
   */
  static async recordImpression(adId: string, userId = 'anonymous'): Promise<void> {
    const dateStr = new Date().toISOString().split('T')[0];
    const pipeline = valkey.pipeline();

    // Increment impressions metric
    pipeline.incr(`ad_impressions:${adId}:${dateStr}`);
    pipeline.expire(`ad_impressions:${adId}:${dateStr}`, 86400);

    // Frequency cap tracking
    if (userId !== 'anonymous') {
      const freqKey = `ad_freq:${userId}:${adId}:${dateStr}`;
      pipeline.incr(freqKey);
      pipeline.expire(freqKey, 86400);
    }

    await pipeline.exec();
  }

  /**
   * Records ad click and increments budget spending.
   */
  static async recordClick(adId: string, userId = 'anonymous'): Promise<void> {
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Get ad details for cost
    const ad = await jsonGet<any>(`ad:${adId}`);
    if (!ad) return;

    const pipeline = valkey.pipeline();

    // Increment click counts
    pipeline.incr(`ad_clicks:${adId}:${dateStr}`);
    
    // Increment daily spend
    pipeline.incrby(`ad_spend:${adId}:${dateStr}`, ad.bidAmount);
    pipeline.expire(`ad_spend:${adId}:${dateStr}`, 86400);

    await pipeline.exec();
  }

  /**
   * Returns performance stats for ads.
   */
  static async getStats(adId: string): Promise<any> {
    const dateStr = new Date().toISOString().split('T')[0];
    
    const impressions = await valkey.get(`ad_impressions:${adId}:${dateStr}`) || '0';
    const clicks = await valkey.get(`ad_clicks:${adId}:${dateStr}`) || '0';
    const spend = await valkey.get(`ad_spend:${adId}:${dateStr}`) || '0';

    const impNum = parseInt(impressions, 10);
    const clickNum = parseInt(clicks, 10);
    const ctr = impNum > 0 ? parseFloat(((clickNum / impNum) * 100).toFixed(2)) : 0.0;

    return {
      adId,
      date: dateStr,
      impressions: impNum,
      clicks: clickNum,
      ctr,
      spend: parseInt(spend, 10),
    };
  }
}
