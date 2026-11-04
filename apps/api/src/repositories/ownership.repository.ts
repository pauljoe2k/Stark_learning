import type { PrismaClient } from '@prisma/client';

export class OwnershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUnitForUser(userId: number, id: number) {
    return this.prisma.unit.findFirst({ where: { id, userId } });
  }

  findTopicForUser(userId: number, id: number) {
    return this.prisma.topic.findFirst({ where: { id, userId } });
  }

  findTopicFileForUser(userId: number, id: number) {
    return this.prisma.topicFile.findFirst({ where: { id, topic: { is: { userId } } } });
  }

  findExplanationForUser(userId: number, id: number) {
    return this.prisma.explanation.findFirst({ where: { id, topic: { is: { userId } } } });
  }

  findPlaceForUser(userId: number, id: number) {
    return this.prisma.place.findFirst({ where: { id, userId }, include: { flags: true } });
  }

  findFlagForUser(userId: number, id: number) {
    return this.prisma.flag.findFirst({ where: { id, place: { is: { userId } } } });
  }

  findRecallRoundForUser(userId: number, id: number) {
    return this.prisma.recallRound.findFirst({ where: { id, userId } });
  }

  findRecallResultForUser(userId: number, id: number) {
    return this.prisma.recallResult.findFirst({ where: { id, round: { is: { userId } } } });
  }

  findExamForUser(userId: number, id: number) {
    return this.prisma.exam.findFirst({ where: { id, userId } });
  }
}
