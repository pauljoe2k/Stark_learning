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
import { Queue } from 'bullmq';
import { resolve } from 'node:path';
import { TopicsService } from './services/topics.service.js';
import { PrismaTopicsRepository } from './repositories/topics.repository.js';
import { UploadStorage } from './services/upload-storage.js';
import { UploadTickets } from './services/upload-tickets.js';
import { createRedisConnection } from './services/redis-connection.js';
import { PrismaExplanationsRepository } from './repositories/explanations.repository.js';
import { ExplainService } from './services/explain.service.js';
import { GeminiExplainAnalyzer } from './services/gemini-explain.js';
import { PrismaPlacesRepository } from './repositories/places.repository.js';
import { PlacesService } from './services/places.service.js';

const redis = createClient({ url: config.REDIS_URL });
redis.on('error', (error) => logger.error({ err: error }, 'Redis connection error'));
const authService = new AuthService(new PrismaAuthRepository(), config.JWT_SECRET);
const queue = new Queue('pinpoint', { connection: createRedisConnection(config.REDIS_URL) });
const uploadsDirectory = resolve(config.UPLOAD_DIR);
const storage = new UploadStorage({
  provider: config.STORAGE_PROVIDER,
  uploadsDirectory,
  publicUrl: config.API_PUBLIC_URL,
  cloudinary: {
    cloudName: config.CLOUDINARY_CLOUD_NAME,
    apiKey: config.CLOUDINARY_API_KEY,
    apiSecret: config.CLOUDINARY_API_SECRET,
  },
});
let realtime: Awaited<ReturnType<typeof createRealtime>> | undefined;
const topicsService = new TopicsService({
  repository: new PrismaTopicsRepository(prisma),
  storage,
  queue,
  tickets: new UploadTickets(config.JWT_SECRET, {
    issue: async (ticketId, userId, topicId, ttlSeconds) => {
      const saved = await redis.set(
        `upload-ticket:${ticketId}`,
        JSON.stringify({ userId, topicId }),
        { EX: ttlSeconds, NX: true },
      );
      if (saved !== 'OK') throw new Error('Unable to reserve upload ticket.');
    },
    consume: async (ticketId, userId, topicId) => {
      const stored = await redis.getDel(`upload-ticket:${ticketId}`);
      return stored === JSON.stringify({ userId, topicId });
    },
  }),
  publish: async (message) => {
    if (!realtime) throw new Error('Socket server is not ready.');
    await realtime.publish(message);
  },
});
const explainService = new ExplainService({
  repository: new PrismaExplanationsRepository(prisma),
  analyzer: new GeminiExplainAnalyzer(config.GEMINI_API_KEY, config.GEMINI_MODEL),
  quota: {
    consume: async (userId) => {
      const key = `rate:explain:${userId}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      return count <= 10;
    },
  },
  cache: {
    get: (key) => redis.get(key),
    set: async (key, value, ttlSeconds) => {
      await redis.set(key, value, { EX: ttlSeconds });
    },
  },
  publish: async (message) => {
    if (!realtime) throw new Error('Socket server is not ready.');
    await realtime.publish(message);
  },
  nodeEnv: config.NODE_ENV,
});
const placesService = new PlacesService({
  repository: new PrismaPlacesRepository(prisma),
  storage,
  publish: async (message) => {
    if (!realtime) throw new Error('Socket server is not ready.');
    await realtime.publish(message);
  },
});
const app = createApp({
  authService,
  readiness: {
    database: async () => { await prisma.$queryRaw`SELECT 1`; },
    redis: async () => { await redis.ping(); },
  },
  topics: {
    service: topicsService,
    uploadTicketQuota: {
      consume: async (userId) => {
        const key = `rate:topic-upload:${userId}`;
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, 60);
        return count <= 10;
      },
    },
    uploadsDirectory,
  },
  explain: explainService,
  palace: placesService,
  webOrigin: config.WEB_ORIGIN,
});
const server = createServer(app);

async function start(): Promise<void> {
  await redis.connect();
  realtime = await createRealtime(server, config.REDIS_URL, authService, config.WEB_ORIGIN);
  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Pinpoint API listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down API');
    await realtime?.close();
    await queue.close();
    await redis.quit();
    await prisma.$disconnect();
    process.exitCode = 0;
    server.close();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'API startup failed');
  process.exitCode = 1;
});
