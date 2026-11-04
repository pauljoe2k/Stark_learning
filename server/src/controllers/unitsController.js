import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

const titleSchema = z.string().trim().min(1).max(120);
function idParam(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Unit ID must be a positive integer.');
  return id;
}

export async function listUnits(req, res) {
  res.json(await prisma.unit.findMany({
    where: { userId: req.user.id },
    include: { topics: { orderBy: { updatedAt: 'desc' } } },
    orderBy: { title: 'asc' },
  }));
}

export async function createUnit(req, res) {
  const data = z.object({ title: titleSchema }).strict().parse(req.body);
  res.status(201).json(await prisma.unit.create({ data: { ...data, userId: req.user.id } }));
}

export async function updateUnit(req, res) {
  const id = idParam(req.params.id);
  const data = z.object({ title: titleSchema }).strict().parse(req.body);
  const result = await prisma.unit.updateMany({ where: { id, userId: req.user.id }, data });
  if (!result.count) throw new HttpError(404, 'Unit not found.');
  res.json(await prisma.unit.findFirst({ where: { id, userId: req.user.id } }));
}

export async function deleteUnit(req, res) {
  const result = await prisma.unit.deleteMany({ where: { id: idParam(req.params.id), userId: req.user.id } });
  if (!result.count) throw new HttpError(404, 'Unit not found.');
  res.status(204).end();
}
