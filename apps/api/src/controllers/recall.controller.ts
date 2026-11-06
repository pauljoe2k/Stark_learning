import type { NextFunction, Request, Response } from 'express';
import {
  positiveIdSchema,
  recallResultBodySchema,
  recallVoiceAnswerBodySchema,
  startRecallBodySchema,
} from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { RecallService } from '../services/recall.service.js';

function userIdFrom(request: Request): number {
  if (!request.user) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
  return request.user.id;
}

function roundIdFrom(request: Request): number {
  const parsed = positiveIdSchema.safeParse(request.params.roundId);
  if (!parsed.success) throw new HttpError(400, 'Recall round id must be a positive integer.', 'INVALID_ROUND_ID');
  return parsed.data;
}

export function createRecallController(service: RecallService) {
  return {
    start: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = startRecallBodySchema.safeParse(req.body);
        if (!input.success) {
          throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid recall settings.', 'INVALID_RECALL_SETTINGS');
        }
        res.status(201).json(await service.start(userIdFrom(req), input.data.timeLimitSec, input.data.speedMode));
      } catch (error) {
        next(error);
      }
    },
    offline: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(200).json({ places: await service.offlineReview(userIdFrom(req)) });
      } catch (error) {
        next(error);
      }
    },
    reveal: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = positiveIdSchema.safeParse(req.body?.flagId);
        if (!body.success) throw new HttpError(400, 'Flag id must be a positive integer.', 'INVALID_FLAG_ID');
        res.status(200).json({
          flag: await service.reveal(userIdFrom(req), roundIdFrom(req), body.data),
        });
      } catch (error) {
        next(error);
      }
    },
    selfGrade: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = recallResultBodySchema.safeParse(req.body);
        if (!input.success) {
          throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid recall result.', 'INVALID_RECALL_RESULT');
        }
        res.status(201).json({
          result: await service.answerBySelfGrade(userIdFrom(req), { roundId: roundIdFrom(req), ...input.data }),
        });
      } catch (error) {
        next(error);
      }
    },
    voiceAnswer: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = recallVoiceAnswerBodySchema.safeParse(req.body);
        if (!input.success) {
          throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid voice answer.', 'INVALID_VOICE_ANSWER');
        }
        res.status(201).json({
          result: await service.answerByVoice(userIdFrom(req), { roundId: roundIdFrom(req), ...input.data }),
        });
      } catch (error) {
        next(error);
      }
    },
    finish: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(200).json(await service.finish(userIdFrom(req), roundIdFrom(req)));
      } catch (error) {
        next(error);
      }
    },
  };
}
