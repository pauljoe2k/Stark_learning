import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { HttpError } from '../errors.js';

const ticketClaimsSchema = z.object({
  sub: z.string().regex(/^[1-9]\d*$/),
  topicId: z.number().int().positive(),
  jti: z.string().uuid(),
  iss: z.literal('pinpoint-upload'),
  iat: z.number().int().positive().optional(),
  exp: z.number().int().positive(),
}).strict();

export interface UploadTicketPersistence {
  issue: (ticketId: string, userId: number, topicId: number, ttlSeconds: number) => Promise<void>;
  consume: (ticketId: string, userId: number, topicId: number) => Promise<boolean>;
}

export class UploadTickets {
  constructor(
    private readonly jwtSecret: string,
    private readonly persistence: UploadTicketPersistence,
  ) {}

  async issue(userId: number, topicId: number): Promise<{ token: string; nonce: string; expiresIn: number }> {
    const nonce = randomUUID();
    const expiresIn = 10 * 60;
    await this.persistence.issue(nonce, userId, topicId, expiresIn);
    const token = jwt.sign(
      { sub: String(userId), topicId, jti: nonce, iss: 'pinpoint-upload' },
      this.jwtSecret,
      { algorithm: 'HS256', expiresIn },
    );
    return { token, nonce, expiresIn };
  }

  async consumeToken(token: string, userId: number, topicId: number): Promise<void> {
    let claims: unknown;
    try {
      claims = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'], issuer: 'pinpoint-upload' });
    } catch {
      throw new HttpError(401, 'Upload ticket is invalid or expired.', 'INVALID_UPLOAD_TICKET');
    }
    const parsed = ticketClaimsSchema.safeParse(claims);
    if (!parsed.success || parsed.data.sub !== String(userId) || parsed.data.topicId !== topicId) {
      throw new HttpError(403, 'Upload ticket does not match this topic or user.', 'UPLOAD_TICKET_SCOPE_MISMATCH');
    }
    await this.consumeNonce(parsed.data.jti, userId, topicId);
  }

  async consumeNonce(nonce: string, userId: number, topicId: number): Promise<void> {
    const validNonce = z.string().uuid().safeParse(nonce);
    if (!validNonce.success || !(await this.persistence.consume(nonce, userId, topicId))) {
      throw new HttpError(401, 'Upload ticket is invalid, expired, or already used.', 'INVALID_UPLOAD_TICKET');
    }
  }
}

export interface UploadTicketQuota {
  consume: (userId: number) => Promise<boolean>;
}
