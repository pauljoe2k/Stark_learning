import type { NextFunction, Request, Response } from 'express';
import { dashboardResponseSchema } from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { DashboardService } from '../services/dashboard.service.js';

export function createDashboardController(service: DashboardService) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
        const data = dashboardResponseSchema.parse(await service.list(req.user.id));
        res.status(200).json(data);
      } catch (error) { next(error); }
    },
  };
}
