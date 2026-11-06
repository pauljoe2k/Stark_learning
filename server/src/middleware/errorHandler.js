export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error?.name === 'MulterError') {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: error.message });
  }
  if (error?.name === 'ZodError') {
    return res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid request.' });
  }
  if (error?.type === 'entity.parse.failed' && error?.status === 400) {
    return res.status(400).json({
      error: 'Request body must be valid JSON. Include a numeric placeId when creating a flag.',
    });
  }
  console.error(error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
}