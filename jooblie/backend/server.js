import 'dotenv/config';
import { createServer } from 'node:http';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { logger } from './src/config/logger.js';

const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      defaultSite: env.DEFAULT_SITE_SLUG,
    },
    'Jooblie shared API listening',
  );
});

function shutdown(signal) {
  logger.info({ signal }, 'Graceful shutdown started');
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Graceful shutdown failed');
      process.exit(1);
    }
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});
