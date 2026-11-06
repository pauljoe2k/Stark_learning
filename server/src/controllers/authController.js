import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { createAccessToken } from '../middleware/auth.js';

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});
const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});
const publicFields = { id: true, name: true, email: true, passMark: true, createdAt: true };

export async function signup(req, res) {
  const data = signupSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: publicFields,
    });
  } catch (error) {
    if (error?.code === 'P2002') throw new HttpError(409, 'An account with this email already exists.');
    throw error;
  }
  res.status(201).json({ user, token: createAccessToken(user.id) });
}

export async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  const { passwordHash: _passwordHash, ...safeUser } = user;
  res.json({ user: safeUser, token: createAccessToken(user.id) });
}

export async function resetPassword(req, res) {
  const data = resetPasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new HttpError(404, 'No account found with this email address.');
  }
  const passwordHash = await bcrypt.hash(data.password, 12);
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
    select: publicFields,
  });
  const token = createAccessToken(updatedUser.id);
  res.json({
    message: 'Password reset successfully.',
    user: updatedUser,
    token,
  });
}

export async function getMe(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: publicFields });
  if (!user) throw new HttpError(401, 'Account no longer exists.');
  res.json(user);
}

export async function updateMe(req, res) {
  const data = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    passMark: z.number().int().min(1).max(100).optional(),
    password: z.string().min(8).max(128).optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.').parse(req.body);

  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.passMark) updateData.passMark = data.passMark;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

  const result = await prisma.user.updateMany({ where: { id: req.user.id }, data: updateData });
  if (!result.count) throw new HttpError(404, 'Account not found.');
  res.json(await prisma.user.findUnique({ where: { id: req.user.id }, select: publicFields }));
}
