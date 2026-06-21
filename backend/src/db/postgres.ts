import { Pool } from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const pool = new Pool({ connectionString: config.databaseUrl });

pool.on('error', (err) => logger.error('Postgres pool error', err));

export async function connectPostgres(): Promise<void> {
  const client = await pool.connect();
  client.release();
  logger.info('✅ Connected to PostgreSQL');
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}
