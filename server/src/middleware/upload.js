import multer from 'multer';
import { HttpError } from './errorHandler.js';

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new HttpError(400, 'Please upload an image file.'));
    }
    return callback(null, true);
  },
});

export const materialUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 2 },
  fileFilter(_req, file, callback) {
    if (file.mimetype !== 'application/pdf' && !file.mimetype.startsWith('image/')) {
      return callback(new HttpError(400, 'Upload a PDF or image file.'));
    }
    return callback(null, true);
  },
});