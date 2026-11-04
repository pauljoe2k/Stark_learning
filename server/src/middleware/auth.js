import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from './errorHandler.js';

function tokenSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new HttpError(500, 'JWT_SECRET is not configured.');
  return secret;
}

function sign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', tokenSecret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verify(token) {
  const [header, body, signature, extra] = token.split('.');
  if (!header || !body || !signature || extra) throw new HttpError(401, 'Invalid or expired token.');
  const expected = createHmac('sha256', tokenSecret()).update(`${header}.${body}`).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    throw new HttpError(401, 'Invalid or expired token.');
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new HttpError(401, 'Invalid or expired token.');
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!Number.isSafeInteger(payload.sub) || payload.sub < 1 || payload.exp <= Date.now() / 1000) {
    throw new HttpError(401, 'Invalid or expired token.');
  }
  return { id: payload.sub };
}

export function createAccessToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, iat: now, exp: now + 60 * 60 * 24 * 7 });
}

export function auth(req, _res, next) {
  try {
    const header = req.get('authorization');
    if (header?.startsWith('Bearer ')) {
      req.user = verify(header.slice(7));
      return next();
    }

    if (process.env.NODE_ENV !== 'production' && req.get('x-dev-user-id') !== undefined) {
      const value = req.get('x-dev-user-id');
      if (!/^[1-9]\d*$/.test(value)) throw new HttpError(400, 'x-dev-user-id must be a positive integer.');
      req.user = { id: Number(value) };
      return next();
    }

    if (process.env.NODE_ENV !== 'production' && process.env.DEV_USER_ID) {
      const value = process.env.DEV_USER_ID;
      if (!/^[1-9]\d*$/.test(value)) throw new HttpError(500, 'DEV_USER_ID must be a positive integer.');
      req.user = { id: Number(value) };
      return next();
    }

    throw new HttpError(401, 'Authentication is required.');
  } catch (error) {
    return next(error);
  }
}