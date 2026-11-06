import type { User } from '@prisma/client';
import { prisma } from './prisma.js';

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'passMark'>;
export type StoredUser = PublicUser & Pick<User, 'passwordHash'>;

export interface AuthRepository {
  findByEmail(email: string): Promise<StoredUser | null>;
  findById(id: number): Promise<PublicUser | null>;
  create(input: { name: string; email: string; passwordHash: string }): Promise<PublicUser>;
}

export class PrismaAuthRepository implements AuthRepository {
  async findByEmail(email: string): Promise<StoredUser | null> {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, passMark: true, passwordHash: true },
    });
  }

  async findById(id: number): Promise<PublicUser | null> {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, passMark: true },
    });
  }

  async create(input: { name: string; email: string; passwordHash: string }): Promise<PublicUser> {
    return prisma.user.create({
      data: input,
      select: { id: true, name: true, email: true, passMark: true },
    });
  }
}
