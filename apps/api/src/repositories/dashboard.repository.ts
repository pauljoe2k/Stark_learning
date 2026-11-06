import { PrismaClient } from '@prisma/client';

export interface TopicRoundStats {
  green: number;
  total: number;
}

export interface RoundWithResults {
  results: Array<{ result: string; flag: { topicId: number | null } }>;
}

export function summarizeRoundsPerTopic(rounds: readonly RoundWithResults[]): Map<number, TopicRoundStats> {
  const latestPerTopic = new Map<number, TopicRoundStats>();
  for (const round of rounds) {
    const perTopic = new Map<number, TopicRoundStats>();
    for (const item of round.results) {
      if (item.flag.topicId === null) continue;
      const stats = perTopic.get(item.flag.topicId) ?? { green: 0, total: 0 };
      stats.total += 1;
      if (item.result === 'green') stats.green += 1;
      perTopic.set(item.flag.topicId, stats);
    }
    for (const [topicId, stats] of perTopic) {
      if (!latestPerTopic.has(topicId)) latestPerTopic.set(topicId, stats);
    }
  }
  return latestPerTopic;
}

export class PrismaDashboardRepository {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  topicsWithCounts(userId: number) {
    return this.prisma.topic.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        _count: { select: { topicFiles: true, flags: true } },
        explanations: { select: { score: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  finishedRounds(userId: number) {
    return this.prisma.recallRound.findMany({
      where: { userId, finishedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      select: { results: { select: { result: true, flag: { select: { topicId: true } } } } },
    });
  }

  passMark(userId: number) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: { passMark: true } });
  }
}
