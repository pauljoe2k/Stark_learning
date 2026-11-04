import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../errors.js';
import type { PlacesService } from '../services/places.service.js';
import { createPlacesController } from '../controllers/places.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1, fieldSize: 1024 },
});

const handlePlaceImage: RequestHandler = (req, res, next) => {
  upload.single('image')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new HttpError(413, 'Place photos must be smaller than 10 MB.', 'PLACE_IMAGE_SIZE'));
      return;
    }
    if (error instanceof multer.MulterError) {
      next(new HttpError(400, 'Upload one image and a place name.', 'INVALID_PLACE_UPLOAD'));
      return;
    }
    next(error);
  });
};

export function createPlacesRouter(service: PlacesService): Router {
  const router = Router();
  const controller = createPlacesController(service);
  router.get('/', controller.list);
  router.post('/', handlePlaceImage, controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.rename);
  router.delete('/:id', controller.delete);
  return router;
}
