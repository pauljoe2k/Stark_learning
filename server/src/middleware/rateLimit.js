import { HttpError } from './errorHandler.js';

export function rateLimit({ windowMs = 60_000, max = 30 } = {}) {
  const requests = new Map();
  return (req, _res, next) => {
    const key = `${req.user?.id ?? req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const entry = requests.get(key);
    if (!entry || now >= entry.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return next(new HttpError(429, 'Too many requests. Please try again shortly.'));
    return next();
  };
}