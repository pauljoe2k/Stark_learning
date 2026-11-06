import { Router } from 'express';
import { createUnitsController } from '../controllers/units.controller.js';
import type { TopicsService } from '../services/topics.service.js';

export function createUnitsRouter(service: TopicsService): Router {
  const router = Router();
  const controller = createUnitsController(service);
  router.get('/', controller.list);
  router.post('/', controller.create);
  return router;
}
