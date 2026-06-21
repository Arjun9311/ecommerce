import app from './app.js';
import { config } from './config/index.js';
import { connectValkey } from './valkey/client.js';
import { connectPostgres } from './db/postgres.js';
import { logger } from './utils/logger.js';
import { AnalyticsService } from './analytics/analyticsService.js';

async function startServer(): Promise<void> {
  try {
    // 1. Establish Database Connections
    await connectPostgres();
    await connectValkey();

    // 2. Start Real-time analytics pub/sub listeners
    AnalyticsService.startEventListener();

    // 3. Listen on Port
    const server = app.listen(config.port, () => {
      logger.info(`✨ Valkey Commerce AI backend running in ${config.env} mode on port ${config.port}`);
    });

    const shutdown = async () => {
      logger.info('Graceful shutdown starting...');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
