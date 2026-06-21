import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { valkey } from '../valkey/client.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  sessionId?: string;
}

/**
 * Middleware to authenticate requests via JWT and session storage lookup in Valkey.
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(412).json({ error: 'Unauthenticated', message: 'No bearer token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string; role: string; jti: string };
    
    // Check if session exists in Valkey
    const sessionKey = `session:${decoded.id}:${decoded.jti}`;
    const isActive = await valkey.get(sessionKey);

    if (!isActive) {
      res.status(401).json({ error: 'Unauthorized', message: 'Session expired or logged out' });
      return;
    }

    // Refresh TTL in Valkey
    await valkey.expire(sessionKey, config.sessionTTL);

    req.user = decoded;
    req.sessionId = decoded.jti;
    next();
  } catch (error) {
    logger.warn('JWT Verification failed', error);
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

/**
 * Middleware to authorize specific roles.
 */
export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }
    next();
  };
}
