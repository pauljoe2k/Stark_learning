import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { explainResultSchema, type ExplainResult, type WorkerSocketMessage } from '@pinpoint/shared';
import { logger } from '../logger.js';
import { HttpError } from '../errors.js';
import {
  calculateExplainScore,
  explainAnalysisSchema,
  keywordExplain,
  validateAnalysisForKeyPoints,
  type ExplainAnalysis,
  type ExplainAnalysisInput,
  type ExplainKeyPoint,
} from './explain-analysis.js';

interface ExplainTopic {
  id: number;
  title: string;
  notes: string;
  keyPointsJson: Prisma.JsonValue;
}

interface SavedExplanation {
  id: number;
  topicId: number;
  transcript: string;
  durationSec: number;
  score: number;
  pointsJson: Prisma.JsonValue;
  summary: string;
  nextFocus: Prisma.JsonValue;
  createdAt: Date;
}

export interface ExplanationsRepository {
  findTopicForExplain(userId: number, topicId: number): Promise<ExplainTopic | null>;
  createForTopic(userId: number, input: {
    topicId: number;
    transcript: string;
    durationSec: number;
    score: number;
    points: Prisma.InputJsonValue;
    summary: string;
    nextFocus: Prisma.InputJsonValue;
  }): Promise<SavedExplanation | null>;
}

export interface ExplainAnalyzer {
  analyze(input: ExplainAnalysisInput): Promise<ExplainAnalysis>;
}

export interface ExplainQuota {
  consume(userId: number): Promise<boolean>;
}

export interface ExplainCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

type ExplainSocketMessage =
  | Extract<WorkerSocketMessage, { event: 'explain:analyzing' }>
  | Extract<WorkerSocketMessage, { event: 'explain:result' }>
  | Extract<WorkerSocketMessage, { event: 'dashboard:updated' }>;

export interface ExplainServiceDependencies {
  repository: ExplanationsRepository;
  analyzer: ExplainAnalyzer;
  quota: ExplainQuota;
  cache: ExplainCache;
  publish?: (message: ExplainSocketMessage) => Promise<void>;
  nodeEnv: string;
}

const keyPointsSchema = z.array(z.object({
  id: z.number().int().positive(),
  text: z.string().trim().min(1).max(1000),
}).strict()).max(30);

function parseKeyPoints(value: Prisma.JsonValue): ExplainKeyPoint[] {
  const parsed = keyPointsSchema.safeParse(value);
  if (!parsed.success) {
    throw new HttpError(409, 'This topic does not have valid key points. Review its study material and try again.', 'INVALID_TOPIC_KEY_POINTS');
  }
  if (new Set(parsed.data.map((point) => point.id)).size !== parsed.data.length) {
    throw new HttpError(409, 'This topic contains duplicate key-point identifiers. Review its study material and try again.', 'INVALID_TOPIC_KEY_POINTS');
  }
  return parsed.data;
}

export class ExplainService {
  constructor(private readonly dependencies: ExplainServiceDependencies) {}

  async submit(userId: number, topicId: number, input: { transcript: string; durationSec: number }): Promise<ExplainResult> {
    const topic = await this.dependencies.repository.findTopicForExplain(userId, topicId);
    if (!topic) throw new HttpError(404, 'Topic not found.', 'TOPIC_NOT_FOUND');
    const keyPoints = parseKeyPoints(topic.keyPointsJson);
    if (keyPoints.length === 0) {
      throw new HttpError(409, 'Add study material and key points to this topic before explaining it.', 'TOPIC_HAS_NO_KEY_POINTS');
    }
    if (!(await this.dependencies.quota.consume(userId))) {
      throw new HttpError(429, 'Explain limit reached. Wait a minute before trying again.', 'EXPLAIN_RATE_LIMIT');
    }

    await this.publish({
      userId,
      event: 'explain:analyzing',
      payload: { topicId },
    });

    const analysisInput: ExplainAnalysisInput = {
      topicTitle: topic.title,
      notes: topic.notes,
      keyPoints,
      transcript: input.transcript,
    };
    const cacheKey = this.cacheKey(userId, topicId, analysisInput);
    let analysis: ExplainAnalysis | null = null;
    let source: 'ai' | 'keyword' = 'ai';

    if (this.dependencies.nodeEnv === 'development') {
      try {
        const cached = await this.dependencies.cache.get(cacheKey);
        if (cached) {
          analysis = validateAnalysisForKeyPoints(
            explainAnalysisSchema.parse(JSON.parse(cached)),
            keyPoints,
          );
        }
      } catch (error) {
        logger.warn({ err: error, topicId }, 'Could not read development Explain cache');
      }
    }

    if (!analysis) {
      try {
        analysis = validateAnalysisForKeyPoints(await this.dependencies.analyzer.analyze(analysisInput), keyPoints);
      } catch (error) {
        source = 'keyword';
        logger.warn({ err: error, userId, topicId }, 'Gemini Explain analysis failed; using keyword estimate');
        analysis = keywordExplain(analysisInput);
      }
      if (this.dependencies.nodeEnv === 'development' && source === 'ai') {
        try {
          await this.dependencies.cache.set(cacheKey, JSON.stringify(analysis), 300);
        } catch (error) {
          logger.warn({ err: error, topicId }, 'Could not cache Explain analysis in development');
        }
      }
    }

    const score = calculateExplainScore(analysis.points);
    const nonGapIds = new Set(
      analysis.points.filter((point) => point.status === 'covered').map((point) => point.keyPointId),
    );
    const nextFocus = analysis.nextFocus.filter((id) => !nonGapIds.has(id)).slice(0, 2);
    if (nextFocus.length === 0) {
      nextFocus.push(...analysis.points
        .filter((point) => point.status !== 'covered')
        .slice(0, 2)
        .map((point) => point.keyPointId));
    }
    const completed = await this.dependencies.repository.createForTopic(userId, {
      topicId,
      transcript: input.transcript,
      durationSec: input.durationSec,
      score,
      points: analysis.points,
      summary: analysis.summary,
      nextFocus,
    });
    if (!completed) throw new HttpError(404, 'Topic not found.', 'TOPIC_NOT_FOUND');
    const pointResults = explainResultSchema.shape.points.parse(completed.pointsJson);
    const result = explainResultSchema.parse({
      id: completed.id,
      topicId: completed.topicId,
      transcript: completed.transcript,
      durationSec: completed.durationSec,
      score: completed.score,
      points: pointResults,
      summary: completed.summary,
      nextFocus: parseNextFocus(completed.nextFocus),
      source,
      createdAt: completed.createdAt.toISOString(),
    });
    await this.publish({
      userId,
      event: 'dashboard:updated',
      payload: { reason: 'explanation', occurredAt: new Date().toISOString() },
    });
    await this.publishResults(userId, result);
    return result;
  }

  private cacheKey(userId: number, topicId: number, input: ExplainAnalysisInput): string {
    const digest = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return `explain-cache:${userId}:${topicId}:${digest}`;
  }

  private async publish(message: ExplainSocketMessage): Promise<void> {
    if (!this.dependencies.publish) return;
    try {
      await this.dependencies.publish(message);
    } catch (error) {
      logger.warn({ err: error, event: message.event }, 'Could not publish Explain socket event');
    }
  }

  private async publishResults(userId: number, result: ExplainResult): Promise<void> {
    for (const [index, point] of result.points.entries()) {
      await this.publish({
        userId,
        event: 'explain:result',
        payload: {
          topicId: result.topicId,
          index,
          total: result.points.length,
          point,
          ...(index === result.points.length - 1
            ? { score: result.score, summary: result.summary, nextFocus: result.nextFocus }
            : {}),
        },
      });
    }
  }
}

function parseNextFocus(value: Prisma.JsonValue): number[] {
  if (!Array.isArray(value)) {
    throw new HttpError(500, 'Saved Explain result contains invalid focus points.', 'INVALID_SAVED_EXPLANATION');
  }
  return value.map((id) => {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
      throw new HttpError(500, 'Saved Explain result contains invalid focus points.', 'INVALID_SAVED_EXPLANATION');
    }
    return id;
  });
}
