import type { NextFunction, Request, Response } from 'express';
import {
  positiveIdSchema,
  createFlagBodySchema,
  reviewFlagBodySchema,
  updateFlagBodySchema,
} from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { PlacesService } from '../services/places.service.js';

function userIdFrom(request: Request): number {
  if (!request.user) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
  return request.user.id;
}

function flagIdFrom(request: Request): number {
  const parsed = positiveIdSchema.safeParse(request.params.id);
  if (!parsed.success) throw new HttpError(400, 'Flag id must be a positive integer.', 'INVALID_FLAG_ID');
  return parsed.data;
}

export function createFlagsController(service: PlacesService) {
  return {
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = createFlagBodySchema.safeParse(req.body);
        if (!input.success) {
          throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid flag details.', 'INVALID_FLAG');
        }
        const data = input.data;
        res.status(201).json({
          flag: await service.createFlag(userIdFrom(req), {
            placeId: data.placeId,
            x: data.x,
            y: data.y,
            title: data.title,
            ...(data.topicId !== undefined ? { topicId: data.topicId } : {}),
            ...(data.keyPointId !== undefined ? { keyPointId: data.keyPointId } : {}),
            ...(data.note !== undefined ? { note: data.note } : {}),
            ...(data.emoji !== undefined ? { emoji: data.emoji } : {}),
          }),
        });
      } catch (error) {
        next(error);
      }
    },
    update: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = updateFlagBodySchema.safeParse(req.body);
        if (!input.success) {
          throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid flag details.', 'INVALID_FLAG');
        }
        const data = input.data;
        res.status(200).json({
          flag: await service.updateFlag(userIdFrom(req), flagIdFrom(req), {
            ...(data.topicId !== undefined ? { topicId: data.topicId } : {}),
            ...(data.keyPointId !== undefined ? { keyPointId: data.keyPointId } : {}),
            ...(data.x !== undefined ? { x: data.x } : {}),
            ...(data.y !== undefined ? { y: data.y } : {}),
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(data.note !== undefined ? { note: data.note } : {}),
            ...(data.emoji !== undefined ? { emoji: data.emoji } : {}),
          }),
        });
      } catch (error) {
        next(error);
      }
    },
    delete: async (req: Request, res: Response, next: NextFunction) => {
      try {
        await service.deleteFlag(userIdFrom(req), flagIdFrom(req));
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },
    due: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(200).json({ flags: await service.dueFlags(userIdFrom(req)) });
      } catch (error) {
        next(error);
      }
    },
    review: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = reviewFlagBodySchema.safeParse(req.body);
        if (!input.success) {
          throw new HttpError(400, input.error.issues[0]?.message ?? 'Choose a review grade.', 'INVALID_REVIEW_GRADE');
        }
        res.status(200).json({
          flag: await service.reviewFlag(userIdFrom(req), flagIdFrom(req), input.data.grade),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
