import type { DashboardResponse } from '@pinpoint/shared';
import { PrismaDashboardRepository, summarizeRoundsPerTopic } from '../repositories/dashboard.repository.js';
import { computeTopicTasks } from './dashboard-tasks.js';

type TopicRow = Awaited<ReturnType<PrismaDashboardRepository['topicsWithCounts']>>[number];

export class DashboardService {
  constructor(private readonly dependencies: { repository: PrismaDashboardRepository }) {}

  async list(userId: number): Promise<DashboardResponse> {
    const [topics, rounds, user] = await Promise.all([
      this.dependencies.repository.topicsWithCounts(userId),
      this.dependencies.repository.finishedRounds(userId),
      this.dependencies.repository.passMark(userId),
    ]);
    const latestPerTopic = summarizeRoundsPerTopic(rounds);
    return {
      topics: topics.map((topic: TopicRow) => {
        const stats = latestPerTopic.get(topic.id);
        return {
          topicId: topic.id,
          title: topic.title,
          tasks: computeTopicTasks({
            fileCount: topic._count.topicFiles,
            latestExplainScore: topic.explanations[0]?.score ?? null,
            passMark: user?.passMark ?? 0,
            flagCount: topic._count.flags,
            latestRoundGreen: stats?.green ?? 0,
            latestRoundTotal: stats?.total ?? 0,
          }),
        };
      }),
    };
  }
}
