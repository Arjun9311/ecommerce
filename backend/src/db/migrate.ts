import fs from 'fs';
import path from 'path';
import { pool, connectPostgres } from './postgres.js';
import { logger } from '../utils/logger.js';

async function migrate(): Promise<void> {
  await connectPostgres();
  
  const migrationsDir = path.join(process.cwd(), 'src/db/migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  for (const file of files) {
    const exists = await pool.query('SELECT 1 FROM migrations WHERE filename = $1', [file]);
    if (exists.rows.length > 0) {
      logger.info(`⏭️  Skipping migration: ${file} (already applied)`);
      continue;
    }
    
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
    logger.info(`✅ Applied migration: ${file}`);
  }
  
  await pool.end();
  logger.info('🎉 All migrations applied');
}

migrate().catch((err) => {
  logger.error('Migration failed', err);
  process.exit(1);
});
