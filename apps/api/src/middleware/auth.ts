import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors.js';
import type { AuthService } from '../services/auth.service.js';

// Express request augmentation carries the authenticated principal between middleware and controllers.
declare global {
  namespace Express {
    interface Request {
      user?: { id: number };
    }
  }
}

export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      next(new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED'));
      return;
    }
    try {
      req.user = { id: authService.verifyToken(authorization.slice(7)) };
      next();
    } catch (error) {
      next(error);
    }
  };
}
