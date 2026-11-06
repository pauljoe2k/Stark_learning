import { Router } from 'express';
import type { ExplainService } from '../services/explain.service.js';
import { createExplainController } from '../controllers/explain.controller.js';

export function createExplainRouter(service: ExplainService): Router {
  const router = Router();
  router.post('/:id/explain', createExplainController(service).submit);
  return router;
}
