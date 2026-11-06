import { HttpError } from '../errors.js';
import type { PrismaRecallRepository } from '../repositories/recall.repository.js';
import { keyPointText } from '../repositories/recall.repository.js';
import type { RecallChecker } from './recall-analysis.js';

export interface RecallServiceDependencies {
  repository: PrismaRecallRepository;
  checker: RecallChecker;
  random?: () => number;
}

export class RecallService {
  constructor(private readonly dependencies: RecallServiceDependencies) {}

  async start(userId: number, timeLimitSec: number, speedMode: boolean) {
    const places = await this.dependencies.repository.listPlacesWithFlags(userId);
    if (places.length === 0) {
      throw new HttpError(400, 'Add a place and at least one flag before starting Recall.', 'RECALL_NOT_READY');
    }
    const random = this.dependencies.random ?? Math.random;
    const place = places[Math.min(places.length - 1, Math.floor(random() * places.length))];
    if (!place) throw new HttpError(400, 'Add a place and at least one flag before starting Recall.', 'RECALL_NOT_READY');
    const round = await this.dependencies.repository.createRound(userId, place.id, timeLimitSec, speedMode);
    return {
      roundId: round.id,
      timeLimitSec: round.timeLimitSec,
      speedMode: round.speedMode,
      place: { id: place.id, name: place.name, imageUrl: place.imageUrl },
      flags: place.flags.map(({ id, x, y }) => ({ id, x, y })),
    };
  }

  async reveal(userId: number, roundId: number, flagId: number) {
    const { round, flag } = await this.requireActiveFlag(userId, roundId, flagId);
    return {
      id: flag.id,
      title: flag.title,
      note: flag.note,
      emoji: flag.emoji,
      timeLimitSec: round.timeLimitSec,
    };
  }

  async answerByVoice(userId: number, input: {
    roundId: number;
    flagId: number;
    transcript: string;
    secondsTaken: number;
  }) {
    const { round, flag } = await this.requireActiveFlag(userId, input.roundId, input.flagId);
    const inTime = input.secondsTaken <= round.timeLimitSec;
    const analysis = inTime ? await this.dependencies.checker.check({
      flagTitle: flag.title,
      flagNote: flag.note,
      topicTitle: flag.topic?.title ?? null,
      keyPoint: keyPointText(flag),
      transcript: input.transcript,
    }) : { correct: false, feedback: 'Time limit reached. Review this idea and try again.' };
    const result = inTime && analysis.correct ? 'green' : 'red';
    const saved = await this.dependencies.repository.recordResult(userId, {
      roundId: round.id,
      placeId: round.placeId,
      flagId: flag.id,
      result,
      secondsTaken: input.secondsTaken,
      voiceTranscript: input.transcript,
      aiFeedback: analysis.feedback,
      gradingSource: 'ai',
    });
    if (!saved) throw new HttpError(404, 'Flag not found in this recall round.', 'FLAG_NOT_FOUND');
    return { flagId: flag.id, result, secondsTaken: input.secondsTaken, feedback: analysis.feedback, source: 'ai' as const };
  }

  async answerBySelfGrade(userId: number, input: {
    roundId: number;
    flagId: number;
    result: 'green' | 'red';
    secondsTaken: number;
  }) {
    const { round, flag } = await this.requireActiveFlag(userId, input.roundId, input.flagId);
    const result = input.result === 'green' && input.secondsTaken <= round.timeLimitSec ? 'green' : 'red';
    const saved = await this.dependencies.repository.recordResult(userId, {
      roundId: round.id,
      placeId: round.placeId,
      flagId: flag.id,
      result,
      secondsTaken: input.secondsTaken,
      gradingSource: 'self',
    });
    if (!saved) throw new HttpError(404, 'Flag not found in this recall round.', 'FLAG_NOT_FOUND');
    return { flagId: flag.id, result, secondsTaken: input.secondsTaken };
  }

  async finish(userId: number, roundId: number) {
    const round = await this.dependencies.repository.findRound(userId, roundId);
    if (!round) throw new HttpError(404, 'Recall round not found.', 'ROUND_NOT_FOUND');
    const recorded = new Set(round.results.map((result) => result.flagId));
    for (const flag of round.place.flags) {
      if (recorded.has(flag.id)) continue;
      await this.dependencies.repository.recordResult(userId, {
        roundId: round.id,
        placeId: round.placeId,
        flagId: flag.id,
        result: 'red',
        secondsTaken: round.timeLimitSec,
        gradingSource: 'timeout',
      });
    }
    if (!round.finishedAt) await this.dependencies.repository.finishRound(userId, round.id);
    const finished = await this.dependencies.repository.findRound(userId, roundId);
    if (!finished) throw new HttpError(404, 'Recall round not found.', 'ROUND_NOT_FOUND');
    return {
      roundId: finished.id,
      place: { id: finished.place.id, name: finished.place.name, imageUrl: finished.place.imageUrl },
      flags: finished.place.flags.map(({ id, x, y, title, note, emoji }) => ({ id, x, y, title, note, emoji })),
      results: finished.results.map(({ flagId, result, secondsTaken, aiFeedback, gradingSource }) => ({
        flagId,
        result,
        secondsTaken,
        aiFeedback,
        gradingSource,
      })),
      summary: {
        green: finished.results.filter((item) => item.result === 'green').length,
        red: finished.results.filter((item) => item.result === 'red').length,
      },
    };
  }

  async offlineReview(userId: number) {
    return this.dependencies.repository.offlineReview(userId);
  }

  private async requireActiveFlag(userId: number, roundId: number, flagId: number) {
    const round = await this.dependencies.repository.findRound(userId, roundId);
    if (!round) throw new HttpError(404, 'Recall round not found.', 'ROUND_NOT_FOUND');
    if (round.finishedAt) throw new HttpError(409, 'This recall round is already finished.', 'ROUND_FINISHED');
    if (round.results.some((item) => item.flagId === flagId)) {
      throw new HttpError(409, 'This flag was already recalled.', 'FLAG_ALREADY_RECORDED');
    }
    const flag = round.place.flags.find((item) => item.id === flagId);
    if (!flag) throw new HttpError(404, 'Flag not found in this recall round.', 'FLAG_NOT_FOUND');
    return { round, flag };
  }
}
