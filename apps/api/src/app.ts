import cors from 'cors';
import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import { errorHandler } from './middleware/error-handler.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { logger } from './logger.js';
import { createAuthRouter } from './routes/auth.routes.js';
import type { AuthService } from './services/auth.service.js';
import { createAuthController } from './controllers/auth.controller.js';
import type { TopicsService } from './services/topics.service.js';
import { createTopicsRouter } from './routes/topics.routes.js';
import { createUnitsRouter } from './routes/units.routes.js';
import type { UploadTicketQuota } from './services/upload-tickets.js';
import type { ExplainService } from './services/explain.service.js';
import { createExplainRouter } from './routes/explain.routes.js';

export interface AppDependencies {
  authService: AuthService;
  readiness: {
    database: () => Promise<void>;
    redis: () => Promise<void>;
  };
  topics?: {
    service: TopicsService;
    uploadTicketQuota: UploadTicketQuota;
    uploadsDirectory: string;
  };
  explain?: ExplainService;
  webOrigin: string;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  app.use(cors({ origin: dependencies.webOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));
  const auth = createAuthMiddleware(dependencies.authService);
  if (dependencies.topics) {
    app.use('/media', express.static(dependencies.topics.uploadsDirectory, {
      dotfiles: 'deny',
      index: false,
      maxAge: '1h',
      fallthrough: false,
    }));
  }
  if (dependencies.explain) {
    app.use('/topics', auth, createExplainRouter(dependencies.explain));
  }

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
  if (dependencies.topics) {
    app.use('/units', auth, createUnitsRouter(dependencies.topics.service));
    app.use('/topics', auth, createTopicsRouter(
      dependencies.topics.service,
      dependencies.topics.uploadTicketQuota,
    ));
  }
  app.use((_req, res) => res.status(404).json({ error: 'Route not found.', code: 'NOT_FOUND' }));
  app.use(errorHandler);
  return app;
}
