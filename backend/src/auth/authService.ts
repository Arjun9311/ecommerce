import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/postgres.js';
import { valkey, jsonSet, jsonGet } from '../valkey/client.js';
import { config } from '../config/index.js';
import { createId } from '../utils/helpers.js';

export interface UserSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export class AuthService {
  /**
   * Register a new user, hashes password, saves to PostgreSQL and writes profile details to Valkey JSON.
   */
  static async register(email: string, passwordPlain: string, firstName: string, lastName: string): Promise<UserSession> {
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      throw new Error('Email already registered');
    }

    const userId = createId('user');
    const passwordHash = await bcrypt.hash(passwordPlain, 12);

    await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email, passwordHash, firstName, lastName, 'customer']
    );

    const userObj = {
      id: userId,
      email,
      role: 'customer',
      firstName,
      lastName,
      phone: '',
      addresses: [],
      preferences: {
        currency: 'INR',
        language: 'en',
        notifications: true,
      },
    };
    await jsonSet(userId, userObj);

    return { id: userId, email, firstName, lastName, role: 'customer' };
  }

  /**
   * Log in user, verifies password, generates JWTs, and registers session in Valkey.
   */
  static async login(email: string, passwordPlain: string): Promise<{ accessToken: string; refreshToken: string; user: UserSession }> {
    // Check login attempts (brute force protection)
    const attemptsKey = `login_attempts:${email}`;
    const attempts = await valkey.get(attemptsKey);
    if (attempts && parseInt(attempts, 10) >= 5) {
      throw new Error('Too many failed login attempts. Please try again after 15 minutes.');
    }

    const dbUser = await queryOne(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
      [email]
    );

    if (!dbUser || !(await bcrypt.compare(passwordPlain, dbUser.password_hash))) {
      // Increment failed attempts
      await valkey.incr(attemptsKey);
      await valkey.expire(attemptsKey, 900); // 15 minutes TTL
      throw new Error('Invalid email or password');
    }

    // Reset failed attempts
    await valkey.del(attemptsKey);

    const jti = uuidv4();
    const payload = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      jti,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });
    const refreshToken = jwt.sign({ id: dbUser.id, jti }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });

    // Store session in Valkey
    const sessionKey = `session:${dbUser.id}:${jti}`;
    await valkey.set(sessionKey, JSON.stringify({ device: 'web', ip: 'local' }), 'EX', config.sessionTTL);

    // Store refresh token
    const refreshKey = `refresh:${dbUser.id}:${jti}`;
    await valkey.set(refreshKey, 'active', 'EX', config.refreshTokenTTL);

    // Update login timestamp in PostgreSQL
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [dbUser.id]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        role: dbUser.role,
      },
    };
  }

  /**
   * Log out user, removing session keys from Valkey.
   */
  static async logout(userId: string, jti: string): Promise<void> {
    await valkey.del(`session:${userId}:${jti}`);
    await valkey.del(`refresh:${userId}:${jti}`);
  }

  /**
   * Refresh access token by validating refresh token.
   */
  static async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as { id: string; jti: string };
      
      const refreshKey = `refresh:${decoded.id}:${decoded.jti}`;
      const isActive = await valkey.get(refreshKey);
      if (!isActive) {
        throw new Error('Refresh token is invalid or expired');
      }

      // Fetch user role from db
      const dbUser = await queryOne('SELECT email, role FROM users WHERE id = $1', [decoded.id]);
      if (!dbUser) {
        throw new Error('User not found');
      }

      const newJti = uuidv4();
      const payload = {
        id: decoded.id,
        email: dbUser.email,
        role: dbUser.role,
        jti: newJti,
      };

      const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });
      const refreshToken = jwt.sign({ id: decoded.id, jti: newJti }, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn as any,
      });

      // Remove old tokens
      await valkey.del(`session:${decoded.id}:${decoded.jti}`);
      await valkey.del(refreshKey);

      // Save new session and refresh token
      await valkey.set(`session:${decoded.id}:${newJti}`, 'active', 'EX', config.sessionTTL);
      await valkey.set(`refresh:${decoded.id}:${newJti}`, 'active', 'EX', config.refreshTokenTTL);

      return { accessToken, refreshToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get complete profile object (either from Valkey JSON cache or PG fallback).
   */
  static async getProfile(userId: string): Promise<any> {
    let profile = await jsonGet(userId);
    if (!profile) {
      // Fallback to PostgreSQL
      const user = await queryOne(
        'SELECT id, email, first_name, last_name, phone, role, preferences, addresses FROM users WHERE id = $1',
        [userId]
      );
      if (!user) return null;
      profile = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone || '',
        addresses: user.addresses || [],
        preferences: user.preferences || { currency: 'INR', language: 'en', notifications: true },
      };
      await jsonSet(userId, profile);
    }
    return profile;
  }
}
