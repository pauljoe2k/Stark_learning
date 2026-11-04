import { Prisma, PrismaClient } from '@prisma/client';

export class PrismaExplanationsRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  findTopicForExplain(userId: number, topicId: number) {
    return this.prisma.topic.findFirst({
      where: { id: topicId, userId },
      select: { id: true, title: true, notes: true, keyPointsJson: true },
    });
  }

  createForTopic(userId: number, input: {
    topicId: number;
    transcript: string;
    durationSec: number;
    score: number;
    points: Prisma.InputJsonValue;
    summary: string;
    nextFocus: Prisma.InputJsonValue;
  }) {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.topic.updateMany({
        where: { id: input.topicId, userId },
        data: { mastery: input.score },
      });
      if (updated.count !== 1) return null;

      return transaction.explanation.create({
        data: {
          topicId: input.topicId,
          transcript: input.transcript,
          durationSec: input.durationSec,
          score: input.score,
          pointsJson: input.points,
          summary: input.summary,
          nextFocus: input.nextFocus,
        },
      });
    });
  }
}
