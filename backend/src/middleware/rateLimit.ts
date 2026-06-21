import { valkey } from '../valkey/client.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware for Valkey-based rate limiting.
 * Employs a sliding-window rate limit using sorted sets or simple counters.
 */
export async function rateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  const key = `rate_limit:${ip}:${req.path}`;
  
  try {
    const requests = await valkey.incr(key);
    if (requests === 1) {
      await valkey.expire(key, Math.floor(config.rateLimit.windowMs / 1000));
    }
    
    res.setHeader('X-RateLimit-Limit', config.rateLimit.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.rateLimit.max - requests));
    
    if (requests > config.rateLimit.max) {
      logger.warn(`Rate limit exceeded for IP: ${ip} on path: ${req.path}`);
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('Rate limiter error', error);
    // Fail-open to avoid breaking service in case of Valkey issue
    next();
  }
}
