import { Prisma, PrismaClient } from '@prisma/client';
import { scheduleFlagReview, type FlagReviewGrade } from '../services/flag-review.js';

export class PrismaRecallRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  listPlacesWithFlags(userId: number) {
    return this.prisma.place.findMany({
      where: { userId, flags: { some: {} } },
      include: {
        flags: {
          orderBy: { createdAt: 'asc' },
          include: { topic: { select: { title: true, notes: true, keyPointsJson: true } } },
        },
      },
    });
  }

  createRound(userId: number, placeId: number, timeLimitSec: number, speedMode: boolean) {
    return this.prisma.recallRound.create({
      data: { userId, placeId, timeLimitSec, speedMode },
    });
  }

  findRound(userId: number, id: number) {
    return this.prisma.recallRound.findFirst({
      where: { id, userId },
      include: {
        place: {
          include: {
            flags: {
              orderBy: { createdAt: 'asc' },
              include: { topic: { select: { title: true, notes: true, keyPointsJson: true } } },
            },
          },
        },
        results: true,
      },
    });
  }

  async recordResult(userId: number, input: {
    roundId: number;
    placeId: number;
    flagId: number;
    result: 'green' | 'red';
    secondsTaken: number;
    voiceTranscript?: string;
    aiFeedback?: string;
    gradingSource?: string;
  }) {
    return this.prisma.$transaction(async (transaction) => {
      const flag = await transaction.flag.findFirst({
        where: { id: input.flagId, placeId: input.placeId, place: { is: { userId } } },
      });
      if (!flag) return null;
      const saved = await transaction.recallResult.create({
        data: {
          roundId: input.roundId,
          flagId: input.flagId,
          result: input.result,
          secondsTaken: input.secondsTaken,
          ...(input.voiceTranscript !== undefined ? { voiceTranscript: input.voiceTranscript } : {}),
          ...(input.aiFeedback !== undefined ? { aiFeedback: input.aiFeedback } : {}),
          ...(input.gradingSource !== undefined ? { gradingSource: input.gradingSource } : {}),
        },
      });
      const grade: FlagReviewGrade = input.result === 'green' ? 'correct' : 'incorrect';
      const reviewedAt = new Date();
      const schedule = scheduleFlagReview(flag, grade, reviewedAt);
      await transaction.flag.update({
        where: { id: flag.id },
        data: { ...schedule, lastReviewedAt: reviewedAt },
      });
      return saved;
    });
  }

  finishRound(userId: number, id: number) {
    return this.prisma.recallRound.updateMany({
      where: { id, userId, finishedAt: null },
      data: { finishedAt: new Date() },
    });
  }

  offlineReview(userId: number) {
    return this.prisma.place.findMany({
      where: { userId, flags: { some: {} } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        flags: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, title: true, note: true, emoji: true },
        },
      },
    });
  }
}

export type RecallRoundRecord = NonNullable<Awaited<ReturnType<PrismaRecallRepository['findRound']>>>;
export type RecallFlagRecord = RecallRoundRecord['place']['flags'][number];

export function keyPointText(flag: RecallFlagRecord): string | null {
  const points: Prisma.JsonValue = flag.topic?.keyPointsJson ?? [];
  if (!Array.isArray(points) || flag.keyPointId === null) return null;
  const point = points.find((item) => typeof item === 'object'
    && item !== null
    && !Array.isArray(item)
    && 'id' in item
    && item.id === flag.keyPointId
    && 'text' in item
    && typeof item.text === 'string');
  return point && typeof point === 'object' && 'text' in point && typeof point.text === 'string'
    ? point.text
    : null;
}
