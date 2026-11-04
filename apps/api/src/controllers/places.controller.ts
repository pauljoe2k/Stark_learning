import type { NextFunction, Request, Response } from 'express';
import {
  positiveIdSchema,
  createPlaceUploadBodySchema,
  updatePlaceBodySchema,
} from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { PlacesService } from '../services/places.service.js';

function userIdFrom(request: Request): number {
  if (!request.user) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
  return request.user.id;
}

function placeIdFrom(request: Request): number {
  const parsed = positiveIdSchema.safeParse(request.params.id);
  if (!parsed.success) throw new HttpError(400, 'Place id must be a positive integer.', 'INVALID_PLACE_ID');
  return parsed.data;
}

export function createPlacesController(service: PlacesService) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(200).json({ places: await service.list(userIdFrom(req)) });
      } catch (error) {
        next(error);
      }
    },
    get: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(200).json({ place: await service.get(userIdFrom(req), placeIdFrom(req)) });
      } catch (error) {
        next(error);
      }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = createPlaceUploadBodySchema.safeParse(req.body);
        if (!input.success) {
          throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid place name.', 'INVALID_PLACE');
        }
        if (!req.file) throw new HttpError(400, 'Choose a photo for this place.', 'PLACE_IMAGE_REQUIRED');
        res.status(201).json({
          place: await service.create(userIdFrom(req), input.data.name, {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype,
          }),
        });
      } catch (error) {
        next(error);
      }
    },
    rename: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = updatePlaceBodySchema.safeParse(req.body);
        if (!input.success) {
          throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid place name.', 'INVALID_PLACE');
        }
        res.status(200).json({
          place: await service.rename(userIdFrom(req), placeIdFrom(req), input.data.name),
        });
      } catch (error) {
        next(error);
      }
    },
    delete: async (req: Request, res: Response, next: NextFunction) => {
      try {
        await service.delete(userIdFrom(req), placeIdFrom(req));
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  };
}
