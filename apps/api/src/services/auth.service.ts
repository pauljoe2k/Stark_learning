import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import { HttpError } from '../errors.js';
import type { AuthRepository, PublicUser } from '../repositories/auth.repository.js';

const claimsSchema = z.object({
  sub: z.string().regex(/^[1-9]\d*$/),
  exp: z.number(),
});

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtSecret: string,
  ) {}

  async signup(input: { name: string; email: string; password: string }): Promise<{ user: PublicUser; token: string }> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) throw new HttpError(409, 'An account with this email already exists.', 'EMAIL_IN_USE');

    let user: PublicUser;
    try {
      user = await this.repository.create({
        name: input.name,
        email: input.email,
        passwordHash: await argon2.hash(input.password),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'An account with this email already exists.', 'EMAIL_IN_USE');
      }
      throw error;
    }
    return { user, token: this.createToken(user.id) };
  }

  async login(input: { email: string; password: string }): Promise<{ user: PublicUser; token: string }> {
    const stored = await this.repository.findByEmail(input.email);
    if (!stored || !(await argon2.verify(stored.passwordHash, input.password))) {
      throw new HttpError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
    }

    const { passwordHash: _passwordHash, ...user } = stored;
    return { user, token: this.createToken(user.id) };
  }

  async getUser(id: number): Promise<PublicUser> {
    const user = await this.repository.findById(id);
    if (!user) throw new HttpError(401, 'This account no longer exists.', 'ACCOUNT_NOT_FOUND');
    return user;
  }

  createToken(userId: number): string {
    return jwt.sign({ sub: String(userId) }, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });
  }

  verifyToken(token: string): number {
    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      throw new HttpError(401, 'Invalid or expired access token.', 'INVALID_TOKEN');
    }
    if (typeof payload === 'string') throw new HttpError(401, 'Invalid access token.', 'INVALID_TOKEN');
    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) throw new HttpError(401, 'Invalid access token.', 'INVALID_TOKEN');
    return Number(claims.data.sub);
  }
}
