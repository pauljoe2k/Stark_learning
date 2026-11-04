import 'dotenv/config';
import { createServer } from 'node:http';
import { config } from './config.js';
import { createApp } from './app.js';
import { logger } from './logger.js';
import { prisma } from './repositories/prisma.js';
import { PrismaAuthRepository } from './repositories/auth.repository.js';
import { AuthService } from './services/auth.service.js';
import { createRealtime } from './realtime.js';
import { createClient } from 'redis';

const redis = createClient({ url: config.REDIS_URL });
redis.on('error', (error) => logger.error({ err: error }, 'Redis connection error'));
const authService = new AuthService(new PrismaAuthRepository(), config.JWT_SECRET);
const app = createApp({
  authService,
  readiness: {
    database: async () => { await prisma.$queryRaw`SELECT 1`; },
    redis: async () => { await redis.ping(); },
  },
  webOrigin: config.WEB_ORIGIN,
});
const server = createServer(app);

async function start(): Promise<void> {
  await redis.connect();
  const realtime = await createRealtime(server, config.REDIS_URL, authService, config.WEB_ORIGIN);
  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Pinpoint API listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down API');
    await realtime.close();
    await redis.quit();
    await prisma.$disconnect();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'API startup failed');
  process.exitCode = 1;
});
