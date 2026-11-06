import { Prisma, PrismaClient } from '@prisma/client';

export class PrismaTopicsRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  listUnits(userId: number) {
    return this.prisma.unit.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true },
    });
  }

  async createUnit(userId: number, title: string) {
    return this.prisma.unit.create({
      data: { userId, title },
      select: { id: true, title: true },
    });
  }

  listTopics(userId: number) {
    return this.prisma.topic.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        unit: { select: { id: true, title: true } },
        topicFiles: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  findTopic(userId: number, id: number) {
    return this.prisma.topic.findFirst({
      where: { id, userId },
      include: {
        unit: { select: { id: true, title: true } },
        topicFiles: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async createTopic(userId: number, input: { unitId?: number; title: string; notes: string }) {
    return this.prisma.topic.create({
      data: {
        userId,
        ...(input.unitId ? { unitId: input.unitId } : {}),
        title: input.title,
        notes: input.notes,
        keyPointsJson: [],
        nextKeyPointId: 1,
      },
      include: {
        unit: { select: { id: true, title: true } },
        topicFiles: true,
      },
    });
  }

  async updateTopic(
    userId: number,
    id: number,
    input: { title?: string; notes?: string; keyPointsJson?: Prisma.InputJsonValue; nextKeyPointId?: number },
  ) {
    const updated = await this.prisma.topic.updateMany({
      where: { id, userId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.keyPointsJson !== undefined ? { keyPointsJson: input.keyPointsJson } : {}),
        ...(input.nextKeyPointId !== undefined ? { nextKeyPointId: input.nextKeyPointId } : {}),
      },
    });
    if (updated.count !== 1) return null;
    return this.findTopic(userId, id);
  }

  async getTopicFileStats(userId: number, topicId: number) {
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, userId },
      select: { topicFiles: { select: { pageCount: true, type: true } } },
    });
    return topic?.topicFiles ?? null;
  }

  async createTopicFileWithinLimits(userId: number, input: {
    topicId: number;
    fileUrl: string;
    type: string;
    pageCount: number;
  }) {
    return this.prisma.$transaction(async (transaction) => {
      const ownerRows = await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM topics
        WHERE id = ${input.topicId} AND user_id = ${userId}
        FOR UPDATE
      `;
      if (ownerRows.length !== 1) return { status: 'missing' as const };

      const existing = await transaction.topicFile.findMany({
        where: { topicId: input.topicId },
        select: { fileUrl: true, type: true, pageCount: true },
      });
      if (existing.some((file) => file.fileUrl === input.fileUrl)) {
        return { status: 'duplicate' as const };
      }
      if (existing.reduce((sum, file) => sum + file.pageCount, 0) + input.pageCount > 100) {
        return { status: 'page_limit' as const };
      }
      if (input.type.startsWith('image/') && existing.filter((file) => file.type.startsWith('image/')).length >= 20) {
        return { status: 'image_limit' as const };
      }
      return {
        status: 'created' as const,
        file: await transaction.topicFile.create({
          data: {
            topicId: input.topicId,
            fileUrl: input.fileUrl,
            type: input.type,
            pageCount: input.pageCount,
          },
        }),
      };
    });
  }

  async deleteTopicFile(userId: number, topicId: number, fileId: number) {
    return this.prisma.topicFile.deleteMany({
      where: { id: fileId, topicId, topic: { is: { userId } } },
    });
  }

  findTopicFile(userId: number, topicId: number, fileId: number) {
    return this.prisma.topicFile.findFirst({
      where: { id: fileId, topicId, topic: { is: { userId } } },
    });
  }

}
