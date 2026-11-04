import 'dotenv/config';
import { Worker } from 'bullmq';
import { config } from './config.js';
import { logger } from './logger.js';
import { URL } from 'node:url';

const redisUrl = new URL(config.REDIS_URL);
const worker = new Worker('pinpoint', async (job) => {
  logger.error({ jobId: job.id, jobName: job.name }, 'No background job processor is registered yet');
  throw new Error(`Unsupported job type: ${job.name}`);
}, {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
  },
});

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err: error }, 'Background job failed');
});
worker.on('error', (error) => logger.error({ err: error }, 'Background worker error'));
logger.info('Pinpoint background worker started');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void worker.close().then(() => process.exit(0));
  });
}
