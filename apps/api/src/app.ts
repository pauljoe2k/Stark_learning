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
import type { PlacesService } from './services/places.service.js';
import { createPlacesRouter } from './routes/places.routes.js';
import { createFlagsRouter } from './routes/flags.routes.js';
import { createSharedPlacesRouter } from './routes/shared-places.routes.js';
import type { RecallService } from './services/recall.service.js';
import { createRecallRouter } from './routes/recall.routes.js';
import type { DashboardService } from './services/dashboard.service.js';
import { createDashboardRouter } from './routes/dashboard.routes.js';

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
  palace?: PlacesService;
  recall?: RecallService;
  dashboard?: DashboardService;
  webOrigin: string;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  app.use(cors({ origin: dependencies.webOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));
  const auth = createAuthMiddleware(dependencies.authService);
  const apiRouter = express.Router();

  if (dependencies.topics) {
    apiRouter.use('/media', express.static(dependencies.topics.uploadsDirectory, {
      dotfiles: 'deny',
      index: false,
      maxAge: '1h',
      fallthrough: false,
    }));
  }
  if (dependencies.explain) {
    apiRouter.use('/topics', auth, createExplainRouter(dependencies.explain));
  }
  if (dependencies.palace) {
    apiRouter.use('/places', auth, createPlacesRouter(dependencies.palace));
    apiRouter.use('/flags', auth, createFlagsRouter(dependencies.palace));
    apiRouter.use('/shared', createSharedPlacesRouter(dependencies.palace));
  }
  if (dependencies.recall) apiRouter.use('/recall', auth, createRecallRouter(dependencies.recall));
  if (dependencies.dashboard) apiRouter.use('/dashboard', auth, createDashboardRouter(dependencies.dashboard));

  apiRouter.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  apiRouter.get('/ready', async (_req, res, next) => {
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
  apiRouter.get('/me', createAuthMiddleware(dependencies.authService), createAuthController(dependencies.authService).me);
  apiRouter.use('/auth', createAuthRouter(dependencies.authService));
  if (dependencies.topics) {
    apiRouter.use('/units', auth, createUnitsRouter(dependencies.topics.service));
    apiRouter.use('/topics', auth, createTopicsRouter(
      dependencies.topics.service,
      dependencies.topics.uploadTicketQuota,
    ));
  }

  // Mount under /api (for Vercel service rewrites) and root (for direct/local usage)
  app.use('/api', apiRouter);
  app.use(apiRouter);
  app.use((_req, res) => res.status(404).json({ error: 'Route not found.', code: 'NOT_FOUND' }));
  app.use(errorHandler);
  return app;
}
