import { z } from 'zod';
import type { ExtractionResult, TopicExtractionJob } from '@pinpoint/shared';
import { Prisma } from '@prisma/client';
import type { Queue } from 'bullmq';
import { HttpError } from '../errors.js';
import type { PrismaTopicsRepository } from '../repositories/topics.repository.js';
import type { UploadStorage } from './upload-storage.js';
import type { UploadTickets } from './upload-tickets.js';
import { validateUploadedFile, type SupportedMediaType } from './upload-validation.js';
import type { WorkerSocketMessage } from '@pinpoint/shared';

const savedKeyPointsSchema = z.array(z.object({
  id: z.number().int().positive(),
  text: z.string().trim().min(1).max(1000),
}).strict()).max(30);
const publicJobFailureMessages = new Set([
  'Document extraction needs a GEMINI_API_KEY in apps/api/.env.',
  'Document extraction returned invalid data twice. Try the upload again.',
  'Too many document extractions. Wait a minute before trying again.',
]);

export interface UploadJobResult {
  extraction: ExtractionResult;
  keyPoints: Array<{ id: number; text: string }>;
}

export interface TopicsServiceDependencies {
  repository: PrismaTopicsRepository;
  storage: UploadStorage;
  queue: Queue<TopicExtractionJob, UploadJobResult, string>;
  tickets: UploadTickets;
  publish: (message: WorkerSocketMessage) => Promise<void>;
}

export class TopicsService {
  constructor(private readonly dependencies: TopicsServiceDependencies) {}

  listUnits(userId: number) {
    return this.dependencies.repository.listUnits(userId);
  }

  async createUnit(userId: number, title: string) {
    return this.dependencies.repository.createUnit(userId, title);
  }

  async listTopics(userId: number) {
    const topics = await this.dependencies.repository.listTopics(userId);
    return topics.map((topic) => this.toTopicDto(topic));
  }

  async getTopic(userId: number, id: number) {
    const topic = await this.requireTopic(userId, id);
    return this.toTopicDto(topic);
  }

  async createTopic(userId: number, input: { unitId?: number; title: string; notes: string }) {
    if (input.unitId) {
      const units = await this.dependencies.repository.listUnits(userId);
      if (!units.some((unit) => unit.id === input.unitId)) {
        throw new HttpError(404, 'Unit not found.', 'UNIT_NOT_FOUND');
      }
    }
    const topic = await this.dependencies.repository.createTopic(userId, input);
    return this.toTopicDto(topic);
  }

  async updateTopic(userId: number, id: number, input: {
    title?: string;
    notes?: string;
    keyPoints?: ReadonlyArray<{ id?: number; text: string }>;
  }) {
    const current = await this.requireTopic(userId, id);
    const update: {
      title?: string;
      notes?: string;
      keyPointsJson?: Prisma.InputJsonValue;
      nextKeyPointId?: number;
    } = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.notes !== undefined) update.notes = input.notes;

    if (input.keyPoints) {
      const storedResult = savedKeyPointsSchema.safeParse(current.keyPointsJson);
      const stored = storedResult.success ? storedResult.data : [];
      const existingIds = new Set(stored.map((point) => point.id));
      let nextKeyPointId = Math.max(current.nextKeyPointId, ...stored.map((point) => point.id + 1), 1);
      const allocated = new Set<number>();
      const keyPoints = input.keyPoints.map((point) => {
        if (point.id !== undefined && existingIds.has(point.id) && !allocated.has(point.id)) {
          allocated.add(point.id);
          return { id: point.id, text: point.text };
        }
        const newPoint = { id: nextKeyPointId, text: point.text };
        allocated.add(nextKeyPointId);
        nextKeyPointId += 1;
        return newPoint;
      });
      update.keyPointsJson = keyPoints;
      update.nextKeyPointId = nextKeyPointId;
    }

    const result = await this.dependencies.repository.updateTopic(userId, id, update);
    if (!result) throw new HttpError(404, 'Topic not found.', 'TOPIC_NOT_FOUND');
    return this.toTopicDto(result);
  }

  async createUploadTicket(userId: number, topicId: number) {
    await this.requireTopic(userId, topicId);
    const ticket = await this.dependencies.tickets.issue(userId, topicId);
    if (this.dependencies.storage.provider === 'cloudinary') {
      return {
        provider: 'cloudinary' as const,
        ...ticket,
        ...this.dependencies.storage.cloudinarySignature({
          userId,
          topicId,
          nonce: ticket.nonce,
          nowSeconds: Math.floor(Date.now() / 1000),
        }),
      };
    }
    return { provider: 'local' as const, ...ticket };
  }

  async acceptLocalUpload(userId: number, topicId: number, uploadToken: string, file: {
    buffer: Buffer;
    mimetype: string;
  }) {
    await this.dependencies.tickets.consumeToken(uploadToken, userId, topicId);
    const topic = await this.requireTopic(userId, topicId);
    const existing = await this.dependencies.repository.getTopicFileStats(userId, topicId);
    if (!existing) throw new HttpError(404, 'Topic not found.', 'TOPIC_NOT_FOUND');
    const checked = await validateUploadedFile(file.buffer, file.mimetype, existing);
    const saved = await this.dependencies.storage.saveLocal(file.buffer, checked.mediaType);
    return this.saveFileAndEnqueue(
      userId,
      topic.id,
      saved.fileUrl,
      checked,
      () => this.dependencies.storage.removeLocal(saved.filePath),
    );
  }

  async acceptCloudinaryUpload(userId: number, topicId: number, input: {
    publicId: string;
    secureUrl: string;
    resourceType: 'image' | 'raw';
    uploadNonce: string;
  }) {
    await this.dependencies.tickets.consumeNonce(input.uploadNonce, userId, topicId);
    const topic = await this.requireTopic(userId, topicId);
    const remote = await this.dependencies.storage.verifyCloudinaryUpload({
      userId,
      topicId,
      publicId: input.publicId,
      secureUrl: input.secureUrl,
      resourceType: input.resourceType,
      nonce: input.uploadNonce,
    });
    let checked: { mediaType: SupportedMediaType; pageCount: number };
    try {
      const existing = await this.dependencies.repository.getTopicFileStats(userId, topicId);
      if (!existing) throw new HttpError(404, 'Topic not found.', 'TOPIC_NOT_FOUND');
      checked = await validateUploadedFile(remote.bytes, remote.declaredMimeType, existing);
    } catch (error) {
      await this.dependencies.storage.removeCloudinaryUpload(input.publicId, input.resourceType);
      throw error;
    }
    return this.saveFileAndEnqueue(
      userId,
      topic.id,
      remote.fileUrl,
      checked,
      () => this.dependencies.storage.removeCloudinaryUpload(input.publicId, input.resourceType),
    );
  }

  async getFileStatus(userId: number, topicId: number, fileId: number) {
    const file = await this.dependencies.repository.findTopicFile(userId, topicId, fileId);
    if (!file) throw new HttpError(404, 'Topic file not found.', 'TOPIC_FILE_NOT_FOUND');
    const job = await this.dependencies.queue.getJob(`topic-file-${file.id}`);
    if (!job) return { fileId, state: 'missing' as const };
    const state = await job.getState();
    return {
      fileId,
      state,
      progress: job.progress,
      ...(state === 'completed' && job.returnvalue ? { result: job.returnvalue } : {}),
      ...(state === 'failed'
        ? {
          error: job.failedReason && publicJobFailureMessages.has(job.failedReason)
            ? job.failedReason
            : 'Document extraction failed. Try the upload again.',
        }
        : {}),
    };
  }

  private async saveFileAndEnqueue(
    userId: number,
    topicId: number,
    fileUrl: string,
    checked: { mediaType: SupportedMediaType; pageCount: number },
    cleanup: () => Promise<void>,
  ) {
    type CreatedFile = Extract<
      Awaited<ReturnType<PrismaTopicsRepository['createTopicFileWithinLimits']>>,
      { status: 'created' }
    >['file'];
    let record: CreatedFile | undefined;
    let job: Awaited<ReturnType<TopicsServiceDependencies['queue']['add']>> | undefined;
    try {
      const fileResult = await this.dependencies.repository.createTopicFileWithinLimits(userId, {
        topicId,
        fileUrl,
        type: checked.mediaType,
        pageCount: checked.pageCount,
      });
      if (fileResult.status === 'missing') {
        throw new HttpError(404, 'Topic not found.', 'TOPIC_NOT_FOUND');
      }
      if (fileResult.status === 'duplicate') {
        throw new HttpError(409, 'This file has already been added to the topic.', 'DUPLICATE_TOPIC_FILE');
      }
      if (fileResult.status === 'page_limit') {
        throw new HttpError(400, 'A topic can contain a maximum of two pages in total.', 'PAGE_LIMIT_EXCEEDED');
      }
      if (fileResult.status === 'image_limit') {
        throw new HttpError(400, 'A topic can contain a maximum of two images.', 'IMAGE_LIMIT_EXCEEDED');
      }
      record = fileResult.file;
      const createdFile = fileResult.file;
      const data: TopicExtractionJob = {
        userId,
        topicId,
        fileId: createdFile.id,
        fileUrl,
        mediaType: checked.mediaType,
      };
      job = await this.dependencies.queue.add('topic.extract', data, {
        jobId: `topic-file-${createdFile.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1500 },
        removeOnComplete: { age: 7 * 24 * 60 * 60, count: 1000 },
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 1000 },
      });
      await this.dependencies.publish({
        userId,
        event: 'file:processing',
        payload: { fileId: createdFile.id, topicId },
      });
    } catch (error) {
      if (job) await job.remove();
      if (record) await this.dependencies.repository.deleteTopicFile(userId, topicId, record.id);
      await cleanup();
      throw error;
    }
    if (!record) throw new Error('Upload file record was not created.');
    return { fileId: record.id, topicId, state: 'waiting' as const };
  }

  private async requireTopic(userId: number, id: number) {
    const topic = await this.dependencies.repository.findTopic(userId, id);
    if (!topic) throw new HttpError(404, 'Topic not found.', 'TOPIC_NOT_FOUND');
    return topic;
  }

  private toTopicDto(topic: NonNullable<Awaited<ReturnType<PrismaTopicsRepository['findTopic']>>> | Awaited<ReturnType<PrismaTopicsRepository['createTopic']>>) {
    const { keyPointsJson, ...rest } = topic;
    const parsed = savedKeyPointsSchema.safeParse(keyPointsJson);
    return { ...rest, keyPoints: parsed.success ? parsed.data : [] };
  }
}
