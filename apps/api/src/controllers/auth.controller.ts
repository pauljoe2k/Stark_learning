import type { NextFunction, Request, Response } from 'express';
import { loginBodySchema, signupBodySchema } from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { AuthService } from '../services/auth.service.js';

export function createAuthController(authService: AuthService) {
  return {
    signup: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = signupBodySchema.safeParse(req.body);
        if (!input.success) throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid signup details.');
        res.status(201).json(await authService.signup(input.data));
      } catch (error) {
        next(error);
      }
    },
    login: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = loginBodySchema.safeParse(req.body);
        if (!input.success) throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid login details.');
        res.status(200).json(await authService.login(input.data));
      } catch (error) {
        next(error);
      }
    },
    me: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) throw new HttpError(401, 'Authentication is required.');
        res.status(200).json({ user: await authService.getUser(req.user.id) });
      } catch (error) {
        next(error);
      }
    },
  };
}
