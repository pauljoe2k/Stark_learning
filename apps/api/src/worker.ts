import 'dotenv/config';
import { UnrecoverableError, Worker, type Job } from 'bullmq';
import { config } from './config.js';
import { logger } from './logger.js';
import { createClient } from 'redis';
import { prisma } from './repositories/prisma.js';
import { PrismaTopicsRepository } from './repositories/topics.repository.js';
import { createRedisConnection } from './services/redis-connection.js';
import { UploadStorage } from './services/upload-storage.js';
import { GeminiExtractionService } from './services/gemini-extraction.js';
import { topicExtractionJobSchema } from '@pinpoint/shared';
import type { TopicExtractionJob } from '@pinpoint/shared';
import type { UploadJobResult } from './services/topics.service.js';
import { publishWorkerSocketMessage } from './services/redis-events.js';
import { HttpError } from './errors.js';

const publisher = createClient({ url: config.REDIS_URL });
publisher.on('error', (error) => logger.error({ err: error }, 'Worker event publisher error'));
const storage = new UploadStorage({
  provider: config.STORAGE_PROVIDER,
  uploadsDirectory: config.UPLOAD_DIR,
  publicUrl: config.API_PUBLIC_URL,
  cloudinary: {
    cloudName: config.CLOUDINARY_CLOUD_NAME,
    apiKey: config.CLOUDINARY_API_KEY,
    apiSecret: config.CLOUDINARY_API_SECRET,
  },
});
const repository = new PrismaTopicsRepository(prisma);
const extractor = new GeminiExtractionService(config.GEMINI_API_KEY, config.GEMINI_MODEL);

async function notify(message: Parameters<typeof publishWorkerSocketMessage>[1]): Promise<void> {
  await publishWorkerSocketMessage(publisher.publish.bind(publisher), message);
}

async function processTopicExtraction(job: Job<TopicExtractionJob, UploadJobResult, string>): Promise<UploadJobResult> {
  if (job.name !== 'topic.extract') throw new Error(`Unsupported background job type: ${job.name}`);
  const parsedData = topicExtractionJobSchema.safeParse(job.data);
  if (!parsedData.success) throw new Error('Invalid topic extraction job payload.');
  const data = parsedData.data;
  const topic = await repository.findTopic(data.userId, data.topicId);
  if (!topic) throw new Error('Topic no longer exists for this account.');

  await notify({
    userId: data.userId,
    event: 'file:progress',
    payload: { fileId: data.fileId, stage: 'validating', percent: 5 },
  });
  await job.updateProgress(5);
  const bytes = await storage.read(data.fileUrl);
  await notify({
    userId: data.userId,
    event: 'file:progress',
    payload: { fileId: data.fileId, stage: 'extracting', percent: 20 },
  });
  await job.updateProgress(20);

  const rateKey = `rate:gemini:${data.userId}`;
  const count = await publisher.incr(rateKey);
  if (count === 1) await publisher.expire(rateKey, 60);
  if (count > 10) throw new Error('Too many document extractions. Wait a minute before trying again.');

  let extraction;
  try {
    extraction = await extractor.extract(bytes, data.mediaType);
  } catch (error) {
    if (error instanceof HttpError && ['GEMINI_NOT_CONFIGURED', 'INVALID_GEMINI_RESPONSE'].includes(error.code)) {
      throw new UnrecoverableError(error.message);
    }
    throw error;
  }
  const keyPoints = extraction.keyPoints.map((text, index) => ({
    id: topic.nextKeyPointId + index,
    text,
  }));
  const result = { extraction, keyPoints };
  await notify({
    userId: data.userId,
    event: 'file:progress',
    payload: { fileId: data.fileId, stage: 'saving', percent: 90 },
  });
  await job.updateProgress(90);
  await job.updateProgress(100);
  await notify({
    userId: data.userId,
    event: 'file:done',
    payload: {
      fileId: data.fileId,
      topicId: data.topicId,
      extraction,
      keyPoints,
    },
  });
  return result;
}

const worker = new Worker<TopicExtractionJob, UploadJobResult, string>(
  'pinpoint',
  processTopicExtraction,
  { connection: createRedisConnection(config.REDIS_URL), concurrency: 2 },
);

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err: error }, 'Background job failed');
  if (!job || (!(error instanceof UnrecoverableError) && job.attemptsMade < (job.opts.attempts ?? 1))) return;
  const parsedData = topicExtractionJobSchema.safeParse(job.data);
  if (!parsedData.success) return;
  const message = error instanceof HttpError || error instanceof UnrecoverableError
    ? error.message.slice(0, 500)
    : 'Document extraction failed. Try the upload again.';
  void notify({
    userId: parsedData.data.userId,
    event: 'file:error',
    payload: { fileId: parsedData.data.fileId, message },
  }).catch((publishError: unknown) => {
    logger.error({ jobId: job.id, err: publishError }, 'Could not publish final file failure event');
  });
});
worker.on('error', (error) => logger.error({ err: error }, 'Background worker error'));

async function start(): Promise<void> {
  await publisher.connect();
  logger.info('Pinpoint background worker started');
}

start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Background worker startup failed');
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void Promise.all([worker.close(), publisher.quit(), prisma.$disconnect()])
      .then(() => { process.exitCode = 0; });
  });
}
