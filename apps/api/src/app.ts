import cors from 'cors';
import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import { errorHandler } from './middleware/error-handler.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { logger } from './logger.js';
import { createAuthRouter } from './routes/auth.routes.js';
import type { AuthService } from './services/auth.service.js';
import { createAuthController } from './controllers/auth.controller.js';

export interface AppDependencies {
  authService: AuthService;
  readiness: {
    database: () => Promise<void>;
    redis: () => Promise<void>;
  };
  webOrigin: string;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  app.use(cors({ origin: dependencies.webOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.get('/ready', async (_req, res, next) => {
    try {
      const [database, redis] = await Promise.allSettled([
        dependencies.readiness.database(),
        dependencies.readiness.redis(),
      ]);
      const checks = {
        database: database.status === 'fulfilled',
        redis: redis.status === 'fulfilled',
      };
      const ready = checks.database && checks.redis;
      res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks });
    } catch (error) {
      next(error);
    }
  });
  app.get('/me', createAuthMiddleware(dependencies.authService), createAuthController(dependencies.authService).me);
  app.use('/auth', createAuthRouter(dependencies.authService));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found.', code: 'NOT_FOUND' }));
  app.use(errorHandler);
  return app;
}
