import { Router } from 'express';
import type { PlacesService } from '../services/places.service.js';
import { createSharedPlacesController } from '../controllers/shared-places.controller.js';

export function createSharedPlacesRouter(service: PlacesService): Router {
  const router = Router();
  router.get('/:token', createSharedPlacesController(service).get);
  return router;
}
