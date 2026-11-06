import { Router } from 'express';
import { createDashboardController } from '../controllers/dashboard.controller.js';
import type { DashboardService } from '../services/dashboard.service.js';

export function createDashboardRouter(service: DashboardService): Router {
  const router = Router();
  const controller = createDashboardController(service);
  router.get('/', controller.list);
  return router;
}
