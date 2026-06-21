import Redis from 'iovalkey';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Main Valkey client
export const valkey = new Redis(config.valkeyUrl, { lazyConnect: true });
// Subscriber client for Pub/Sub (cannot share with commands client)
export const valkeySubscriber = new Redis(config.valkeyUrl, { lazyConnect: true });

valkey.on('error', (err: any) => logger.error('Valkey client error', err));
valkeySubscriber.on('error', (err: any) => logger.error('Valkey subscriber error', err));

export async function connectValkey(): Promise<void> {
  if (valkey.status === 'wait' || valkey.status === 'close') {
    await valkey.connect();
  }
  if (valkeySubscriber.status === 'wait' || valkeySubscriber.status === 'close') {
    await valkeySubscriber.connect();
  }
  logger.info('✅ Connected to Valkey');
}

// ─── Typed Helper Wrappers ────────────────────────────────────────────────────

/** JSON.SET helper */
export async function jsonSet(key: string, value: unknown, path = '$'): Promise<void> {
  await (valkey as any).call('JSON.SET', key, path, JSON.stringify(value));
}

/** JSON.GET helper */
export async function jsonGet<T>(key: string, path = '$'): Promise<T | null> {
  const result = await (valkey as any).call('JSON.GET', key, path);
  if (!result) return null;
  const parsed = JSON.parse(result as string);
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

/** JSON.MGET helper */
export async function jsonMGet<T>(keys: string[], path = '$'): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  const results = await (valkey as any).call('JSON.MGET', ...keys, path);
  return (results as string[]).map((r) => {
    if (!r) return null;
    const parsed = JSON.parse(r);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  });
}

/** JSON.NUMINCRBY helper */
export async function jsonNumIncrBy(key: string, path: string, amount: number): Promise<number> {
  const result = await (valkey as any).call('JSON.NUMINCRBY', key, path, amount);
  const parsed = JSON.parse(result as string);
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

/** FT.CREATE - create search index */
export async function ftCreate(args: string[]): Promise<void> {
  try {
    await (valkey as any).call('FT.CREATE', ...args);
  } catch (err: any) {
    if (!err.message?.includes('Index already exists')) {
      throw err;
    }
  }
}

/** FT.SEARCH helper */
export async function ftSearch(index: string, query: string, options: string[] = []): Promise<any[]> {
  const result = await (valkey as any).call('FT.SEARCH', index, query, ...options);
  return result as any[];
}

/** FT.AGGREGATE helper */
export async function ftAggregate(index: string, query: string, options: string[] = []): Promise<any[]> {
  const result = await (valkey as any).call('FT.AGGREGATE', index, query, ...options);
  return result as any[];
}

/** FT.SUGADD - add suggestion (using Sorted Set for cross-compatibility) */
export async function ftSugAdd(key: string, string: string, score: number): Promise<void> {
  // Use lowercase string for normalized matching
  await valkey.zadd(key, 0, string.toLowerCase().trim());
}

/** FT.SUGGET - get suggestions (using Sorted Set lexicographical search) */
export async function ftSugGet(key: string, prefix: string, fuzzy = true, max = 10): Promise<string[]> {
  const normalized = prefix.toLowerCase().trim();
  // Lexicographical query range in ioredis format: zrange(key, min, max, 'BYLEX', 'LIMIT', offset, count)
  return valkey.zrange(key, `[${normalized}`, `[${normalized}\xff`, 'BYLEX', 'LIMIT', 0, max);
}

/** Atomic inventory decrement with NX lock */
export async function acquireInventoryLock(productId: string, ttlSeconds = 30): Promise<boolean> {
  const result = await valkey.set(`inventory_lock:${productId}`, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function releaseInventoryLock(productId: string): Promise<void> {
  await valkey.del(`inventory_lock:${productId}`);
}

/** Health check */
export async function checkValkeyHealth(): Promise<{ status: string; latencyMs: number }> {
  const start = Date.now();
  await valkey.ping();
  return { status: 'ok', latencyMs: Date.now() - start };
}
