import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

const examSchema = z.object({
  title: z.string().trim().min(1).max(160),
  exam_date: z.string().datetime({ offset: true }),
  unitId: z.number().int().positive().nullable().optional(),
}).strict();

function idParam(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Exam ID must be a positive integer.');
  return id;
}

async function validateUnit(userId, unitId) {
  if (!unitId) return;
  const unit = await prisma.unit.findFirst({ where: { id: unitId, userId }, select: { id: true } });
  if (!unit) throw new HttpError(404, 'Unit not found.');
}

export async function listExams(req, res) {
  res.json(await prisma.exam.findMany({
    where: { userId: req.user.id },
    include: { unit: true },
    orderBy: { examDate: 'asc' },
  }));
}

export async function createExam(req, res) {
  const data = examSchema.parse(req.body);
  await validateUnit(req.user.id, data.unitId);
  res.status(201).json(await prisma.exam.create({
    data: {
      userId: req.user.id,
      title: data.title,
      examDate: new Date(data.exam_date),
      unitId: data.unitId ?? null,
    },
  }));
}

export async function updateExam(req, res) {
  const id = idParam(req.params.id);
  const data = examSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required.').parse(req.body);
  await validateUnit(req.user.id, data.unitId);
  const result = await prisma.exam.updateMany({
    where: { id, userId: req.user.id },
    data: {
      ...(data.title === undefined ? {} : { title: data.title }),
      ...(data.exam_date === undefined ? {} : { examDate: new Date(data.exam_date) }),
      ...(data.unitId === undefined ? {} : { unitId: data.unitId }),
    },
  });
  if (!result.count) throw new HttpError(404, 'Exam not found.');
  res.json(await prisma.exam.findFirst({ where: { id, userId: req.user.id }, include: { unit: true } }));
}

export async function deleteExam(req, res) {
  const result = await prisma.exam.deleteMany({ where: { id: idParam(req.params.id), userId: req.user.id } });
  if (!result.count) throw new HttpError(404, 'Exam not found.');
  res.status(204).end();
}
