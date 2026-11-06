import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import type { AuthService } from '../services/auth.service.js';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const controller = createAuthController(authService);
  router.post('/signup', controller.signup);
  router.post('/login', controller.login);
  return router;
}
