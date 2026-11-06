import type { TopicTasks } from '@pinpoint/shared';

export interface TopicTaskInput {
  fileCount: number;
  latestExplainScore: number | null;
  passMark: number;
  flagCount: number;
  latestRoundGreen: number;
  latestRoundTotal: number;
}

export function computeTopicTasks(input: TopicTaskInput): TopicTasks {
  return {
    addMaterial: input.fileCount > 0,
    explain: input.latestExplainScore !== null && input.latestExplainScore >= input.passMark,
    pin: input.flagCount > 0,
    recall: input.latestRoundTotal > 0 && input.latestRoundGreen / input.latestRoundTotal > 0.5,
  };
}
