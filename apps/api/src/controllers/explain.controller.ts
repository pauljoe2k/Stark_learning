import type { NextFunction, Request, Response } from 'express';
import { explainBodySchema, positiveIdSchema } from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { ExplainService } from '../services/explain.service.js';

function userIdFrom(request: Request): number {
  if (!request.user) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
  return request.user.id;
}

export function createExplainController(service: ExplainService) {
  return {
    submit: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const topicId = positiveIdSchema.safeParse(req.params.id);
        if (!topicId.success) throw new HttpError(400, 'Topic id must be a positive integer.', 'INVALID_TOPIC_ID');
        const input = explainBodySchema.safeParse(req.body);
        if (!input.success) {
          throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid Explain submission.', 'INVALID_EXPLAIN_INPUT');
        }
        res.status(200).json({
          explanation: await service.submit(userIdFrom(req), topicId.data, input.data),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
