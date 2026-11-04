import { Router } from 'express';
import type { PlacesService } from '../services/places.service.js';
import { createFlagsController } from '../controllers/flags.controller.js';

export function createFlagsRouter(service: PlacesService): Router {
  const router = Router();
  const controller = createFlagsController(service);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.delete);
  return router;
}
