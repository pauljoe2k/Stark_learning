import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../errors.js';
import { createTopicsController } from '../controllers/topics.controller.js';
import type { TopicsService } from '../services/topics.service.js';
import type { UploadTicketQuota } from '../services/upload-tickets.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 1, fieldSize: 2048 },
});

const handleSingleFile: RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new HttpError(413, 'Files must be 20 MB or smaller.', 'FILE_TOO_LARGE'));
      return;
    };
    if (error instanceof multer.MulterError) {
      next(new HttpError(400, 'Upload must contain exactly one file and an upload token.', 'INVALID_MULTIPART_UPLOAD'));
      return;
    }
    next(error);
  });
}

export function createTopicsRouter(service: TopicsService, quota: UploadTicketQuota): Router {
  const router = Router();
  const controller = createTopicsController(service, quota);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.post('/:id/upload-ticket', controller.ticket);
  router.post('/:id/files/local', handleSingleFile, controller.localUpload);
  router.post('/:id/files/cloudinary', controller.cloudinaryFinalize);
  router.get('/:id/files/:fileId', controller.fileStatus);
  return router;
}
