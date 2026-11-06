import { PrismaClient } from '@prisma/client';

export class PrismaPlacesRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  listPlaces(userId: number) {
    return this.prisma.place.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { flags: true } } },
    });
  }

  findPlace(userId: number, id: number) {
    return this.prisma.place.findFirst({
      where: { id, userId },
      include: { flags: { orderBy: { createdAt: 'asc' } } },
    });
  }

  listDueFlags(userId: number, now: Date) {
    return this.prisma.flag.findMany({
      where: {
        place: { is: { userId } },
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
      include: { place: { select: { id: true, name: true, imageUrl: true } } },
      orderBy: [{ nextReviewAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findOwnedFlag(userId: number, id: number) {
    return this.prisma.flag.findFirst({
      where: { id, place: { is: { userId } } },
    });
  }

  async scheduleFlagReview(userId: number, id: number, data: {
    reviewIntervalDays: number;
    reviewEase: number;
    nextReviewAt: Date;
    lastReviewedAt: Date;
  }) {
    const updated = await this.prisma.flag.updateMany({
      where: { id, place: { is: { userId } } },
      data,
    });
    if (updated.count !== 1) return null;
    return this.findOwnedFlag(userId, id);
  }

  createPlace(userId: number, input: { name: string; imageUrl: string }) {
    return this.prisma.place.create({ data: { userId, ...input } });
  }

  async renamePlace(userId: number, id: number, name: string) {
    const updated = await this.prisma.place.updateMany({
      where: { id, userId },
      data: { name },
    });
    if (updated.count !== 1) return null;
    return this.prisma.place.findFirst({ where: { id, userId } });
  }

  deletePlace(userId: number, id: number) {
    return this.prisma.place.deleteMany({ where: { id, userId } });
  }

  findOwnedTopicKeyPoints(userId: number, topicId: number) {
    return this.prisma.topic.findFirst({
      where: { id: topicId, userId },
      select: { keyPointsJson: true },
    });
  }

  createFlag(input: {
    placeId: number;
    topicId?: number;
    keyPointId?: number;
    x: number;
    y: number;
    title: string;
    note?: string;
    emoji?: string;
  }) {
    return this.prisma.flag.create({ data: input });
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
    const updated = await this.prisma.flag.updateMany({
      where: { id, place: { is: { userId } } },
      data: input,
    });
    if (updated.count !== 1) return null;
    return this.findOwnedFlag(userId, id);
  }

  deleteFlag(userId: number, id: number) {
    return this.prisma.flag.deleteMany({
      where: { id, place: { is: { userId } } },
    });
  }

  async createShare(userId: number, placeId: number, tokenHash: string) {
    return this.prisma.$transaction(async (transaction) => {
      const place = await transaction.place.findFirst({ where: { id: placeId, userId }, select: { id: true } });
      if (!place) return null;
      await transaction.placeShare.updateMany({
        where: { placeId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return transaction.placeShare.create({ data: { placeId, tokenHash } });
    });
  }

  async revokeShare(userId: number, placeId: number) {
    return this.prisma.placeShare.updateMany({
      where: { placeId, revokedAt: null, place: { is: { userId } } },
      data: { revokedAt: new Date() },
    });
  }

  findActiveShare(userId: number, placeId: number) {
    return this.prisma.placeShare.findFirst({
      where: { placeId, revokedAt: null, place: { is: { userId } } },
      select: { id: true, createdAt: true },
    });
  }

  findSharedPlace(tokenHash: string) {
    return this.prisma.placeShare.findFirst({
      where: { tokenHash, revokedAt: null },
      include: {
        place: {
          include: {
            flags: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });
  }
}
