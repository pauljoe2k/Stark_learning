import type { NextFunction, Request, Response } from 'express';
import { shareTokenParamsSchema } from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { PlacesService } from '../services/places.service.js';

export function createSharedPlacesController(service: PlacesService) {
  return {
    get: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = shareTokenParamsSchema.safeParse(req.params);
        if (!parsed.success) throw new HttpError(404, 'This shared palace is unavailable.', 'SHARE_NOT_FOUND');
        res.status(200).json({ place: await service.getShared(parsed.data.token) });
      } catch (error) {
        next(error);
      }
    },
  };
}
