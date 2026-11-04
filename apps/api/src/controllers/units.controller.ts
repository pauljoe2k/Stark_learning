import type { NextFunction, Request, Response } from 'express';
import { createUnitBodySchema } from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { TopicsService } from '../services/topics.service.js';

export function createUnitsController(service: TopicsService) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
        res.status(200).json({ units: await service.listUnits(req.user.id) });
      } catch (error) { next(error); }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
        const input = createUnitBodySchema.safeParse(req.body);
        if (!input.success) throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid unit details.');
        res.status(201).json({ unit: await service.createUnit(req.user.id, input.data.title) });
      } catch (error) { next(error); }
    },
  };
}
