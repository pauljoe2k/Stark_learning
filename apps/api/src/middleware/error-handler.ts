import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../errors.js';
import { logger } from '../logger.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  if (
    error instanceof SyntaxError
    && 'status' in error
    && error.status === 400
    && 'type' in error
    && error.type === 'entity.parse.failed'
  ) {
    res.status(400).json({ error: 'Request body must be valid JSON.', code: 'INVALID_JSON' });
    return;
  }
  logger.error({ err: error }, 'Unhandled request error');
  res.status(500).json({ error: 'An unexpected server error occurred.', code: 'INTERNAL_ERROR' });
};
