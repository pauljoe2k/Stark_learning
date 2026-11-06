import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import type { WorkerSocketMessage } from '@pinpoint/shared';
import { logger } from '../logger.js';
import { HttpError } from '../errors.js';
import type { PrismaPlacesRepository } from '../repositories/places.repository.js';
import { scheduleFlagReview, type FlagReviewGrade } from './flag-review.js';
import type { UploadStorage } from './upload-storage.js';

const maxImageBytes = 10 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface PlaceServicesDependencies {
  repository: PrismaPlacesRepository;
  storage: UploadStorage;
  publish: (message: Extract<WorkerSocketMessage, { event: 'dashboard:updated' }>) => Promise<void>;
}

function validatePlaceImage(file: { buffer: Buffer; mimetype: string }): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (file.buffer.length === 0 || file.buffer.length > maxImageBytes) {
    throw new HttpError(413, 'Place photos must be smaller than 10 MB.', 'PLACE_IMAGE_SIZE');
  }
  if (!allowedTypes.has(file.mimetype)) {
    throw new HttpError(400, 'Choose a JPEG, PNG, or WebP photo.', 'INVALID_PLACE_IMAGE_TYPE');
  }
  const isPng = file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  const isWebp = file.buffer.toString('ascii', 0, 4) === 'RIFF'
    && file.buffer.toString('ascii', 8, 12) === 'WEBP';
  if (file.mimetype === 'image/png' && isPng) return 'image/png';
  if (file.mimetype === 'image/jpeg' && isJpeg) return 'image/jpeg';
  if (file.mimetype === 'image/webp' && isWebp) return 'image/webp';
  throw new HttpError(400, 'Photo contents do not match the selected image type.', 'PLACE_IMAGE_SIGNATURE_MISMATCH');
}

export class PlacesService {
  constructor(private readonly dependencies: PlaceServicesDependencies) {}

  async list(userId: number) {
    return (await this.dependencies.repository.listPlaces(userId)).map((place) => ({
      id: place.id,
      name: place.name,
      imageUrl: place.imageUrl,
      flagsCount: place._count.flags,
      createdAt: place.createdAt.toISOString(),
      updatedAt: place.updatedAt.toISOString(),
    }));
  }

  async get(userId: number, id: number) {
    const place = await this.dependencies.repository.findPlace(userId, id);
    if (!place) throw new HttpError(404, 'Place not found.', 'PLACE_NOT_FOUND');
    return {
      id: place.id,
      name: place.name,
      imageUrl: place.imageUrl,
      flags: place.flags,
      createdAt: place.createdAt.toISOString(),
      updatedAt: place.updatedAt.toISOString(),
    };
  }

  async dueFlags(userId: number, now = new Date()) {
    const flags = await this.dependencies.repository.listDueFlags(userId, now);
    return flags.map(({ place, ...flag }) => ({ ...flag, place }));
  }

  async reviewFlag(userId: number, id: number, grade: FlagReviewGrade) {
    const current = await this.dependencies.repository.findOwnedFlag(userId, id);
    if (!current) throw new HttpError(404, 'Flag not found.', 'FLAG_NOT_FOUND');
    const reviewedAt = new Date();
    const schedule = scheduleFlagReview(current, grade, reviewedAt);
    const updated = await this.dependencies.repository.scheduleFlagReview(userId, id, {
      ...schedule,
      lastReviewedAt: reviewedAt,
    });
    if (!updated) throw new HttpError(404, 'Flag not found.', 'FLAG_NOT_FOUND');
    await this.publishDashboard(userId);
    return updated;
  }

  async create(userId: number, name: string, file: { buffer: Buffer; mimetype: string }) {
    const mediaType = validatePlaceImage(file);
    const saved = await this.dependencies.storage.saveLocal(file.buffer, mediaType);
    let place;
    try {
      place = await this.dependencies.repository.createPlace(userId, { name, imageUrl: saved.fileUrl });
    } catch (error) {
      await this.dependencies.storage.removeLocal(saved.filePath);
      throw error;
    }
    await this.publishDashboard(userId);
    return {
      id: place.id,
      name: place.name,
      imageUrl: place.imageUrl,
      flagsCount: 0,
      createdAt: place.createdAt.toISOString(),
      updatedAt: place.updatedAt.toISOString(),
    };
  }

  async rename(userId: number, id: number, name: string) {
    const place = await this.dependencies.repository.renamePlace(userId, id, name);
    if (!place) throw new HttpError(404, 'Place not found.', 'PLACE_NOT_FOUND');
    await this.publishDashboard(userId);
    return {
      id: place.id,
      name: place.name,
      imageUrl: place.imageUrl,
      updatedAt: place.updatedAt.toISOString(),
    };
  }

  async delete(userId: number, id: number): Promise<void> {
    const deleted = await this.dependencies.repository.deletePlace(userId, id);
    if (deleted.count !== 1) throw new HttpError(404, 'Place not found.', 'PLACE_NOT_FOUND');
    await this.publishDashboard(userId);
  }

  async createShare(userId: number, placeId: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const share = await this.dependencies.repository.createShare(
      userId,
      placeId,
      createHash('sha256').update(token).digest('hex'),
    );
    if (!share) throw new HttpError(404, 'Place not found.', 'PLACE_NOT_FOUND');
    return token;
  }

  async revokeShare(userId: number, placeId: number): Promise<void> {
    await this.requirePlace(userId, placeId);
    await this.dependencies.repository.revokeShare(userId, placeId);
  }

  async shareStatus(userId: number, placeId: number) {
    await this.requirePlace(userId, placeId);
    const share = await this.dependencies.repository.findActiveShare(userId, placeId);
    return share ? { active: true as const, createdAt: share.createdAt.toISOString() } : { active: false as const };
  }

  async getShared(token: string) {
    const share = await this.dependencies.repository.findSharedPlace(
      createHash('sha256').update(token).digest('hex'),
    );
    if (!share) throw new HttpError(404, 'This shared palace is unavailable.', 'SHARE_NOT_FOUND');
    const { place } = share;
    return {
      id: place.id,
      name: place.name,
      imageUrl: place.imageUrl,
      flags: place.flags.map(({ id, x, y, title, note, emoji }) => ({ id, x, y, title, note, emoji })),
    };
  }

  async createFlag(userId: number, input: {
    placeId: number;
    topicId?: number;
    keyPointId?: number;
    x: number;
    y: number;
    title: string;
    note?: string;
    emoji?: string;
  }) {
    await this.requirePlace(userId, input.placeId);
    await this.validateKeyPointLink(userId, input.topicId, input.keyPointId);
    const flag = await this.dependencies.repository.createFlag(input);
    await this.publishDashboard(userId);
    return flag;
  }

  async updateFlag(userId: number, id: number, input: {
    topicId?: number | null;
    keyPointId?: number | null;
    x?: number;
    y?: number;
    title?: string;
    note?: string;
    emoji?: string;
  }) {
    const current = await this.dependencies.repository.findOwnedFlag(userId, id);
    if (!current) throw new HttpError(404, 'Flag not found.', 'FLAG_NOT_FOUND');
    const changes = input.topicId === null ? { ...input, keyPointId: null } : input;
    const topicId = changes.topicId === undefined ? current.topicId ?? undefined : changes.topicId ?? undefined;
    const keyPointId = changes.keyPointId === undefined ? current.keyPointId ?? undefined : changes.keyPointId ?? undefined;
    await this.validateKeyPointLink(userId, topicId, keyPointId);
    const flag = await this.dependencies.repository.updateFlag(userId, id, changes);
    if (!flag) throw new HttpError(404, 'Flag not found.', 'FLAG_NOT_FOUND');
    await this.publishDashboard(userId);
    return flag;
  }

  async deleteFlag(userId: number, id: number): Promise<void> {
    const deleted = await this.dependencies.repository.deleteFlag(userId, id);
    if (deleted.count !== 1) throw new HttpError(404, 'Flag not found.', 'FLAG_NOT_FOUND');
    await this.publishDashboard(userId);
  }

  private async requirePlace(userId: number, id: number): Promise<void> {
    if (!(await this.dependencies.repository.findPlace(userId, id))) {
      throw new HttpError(404, 'Place not found.', 'PLACE_NOT_FOUND');
    }
  }

  private async validateKeyPointLink(userId: number, topicId?: number, keyPointId?: number): Promise<void> {
    if (keyPointId !== undefined && topicId === undefined) {
      throw new HttpError(400, 'A key point must be linked to its topic.', 'KEY_POINT_TOPIC_REQUIRED');
    }
    if (topicId === undefined) return;
    const topic = await this.dependencies.repository.findOwnedTopicKeyPoints(userId, topicId);
    if (!topic) throw new HttpError(404, 'Topic not found.', 'TOPIC_NOT_FOUND');
    if (keyPointId === undefined) return;
    const points = topic.keyPointsJson;
    if (
      !Array.isArray(points)
      || !points.some((point) => isKeyPoint(point) && point.id === keyPointId)
    ) {
      throw new HttpError(404, 'Key point not found in this topic.', 'KEY_POINT_NOT_FOUND');
    }
  }

  private async publishDashboard(userId: number): Promise<void> {
    try {
      await this.dependencies.publish({
        userId,
        event: 'dashboard:updated',
        payload: { reason: 'place', occurredAt: new Date().toISOString() },
      });
    } catch (error) {
      logger.warn({ err: error, userId }, 'Could not publish Palace dashboard update');
    }
  }
}

function isKeyPoint(value: Prisma.JsonValue): value is Prisma.JsonObject & { id: number } {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && 'id' in value
    && typeof value.id === 'number';
}
