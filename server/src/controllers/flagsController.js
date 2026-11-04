import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

const fields = {
  placeId: z.number().int().positive(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  title: z.string().trim().min(1, 'Flag title is required.').max(120),
  note: z.string().max(2000).optional(),
  emoji: z.string().max(8).optional(),
  topicId: z.number().int().nullable().optional(),
  keyPointId: z.number().int().nullable().optional(),
};
const createSchema = z.object(fields).strict();
const updateSchema = z.object(Object.fromEntries(
  Object.entries(fields).map(([key, schema]) => [key, schema.optional()]),
)).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

async function validateTopicLink(userId, topicId, keyPointId) {
  if (keyPointId !== undefined && keyPointId !== null && topicId == null) {
    throw new HttpError(400, 'A key point link requires a topic link.');
  }
  if (topicId == null) return;
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, userId },
    select: { id: true, keyPoints: true },
  });
  if (!topic) throw new HttpError(404, 'Topic not found.');
  const keyPoints = Array.isArray(topic.keyPoints) ? topic.keyPoints : [];
  if (keyPointId != null && !keyPoints.some((point) => Number(point.id) === keyPointId)) {
    throw new HttpError(400, 'Key point does not belong to this topic.');
  }
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Flag ID must be a positive integer.');
  return id;
}

export async function createFlag(req, res) {
  const data = createSchema.parse(req.body);
  const place = await prisma.place.findFirst({
    where: { id: data.placeId, userId: req.user.id },
    select: { id: true },
  });
  if (!place) throw new HttpError(404, 'Place not found.');
  await validateTopicLink(req.user.id, data.topicId, data.keyPointId);
  res.status(201).json(await prisma.flag.create({ data }));
}

export async function updateFlag(req, res) {
  const id = parseId(req.params.id);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.flag.findFirst({
    where: { id, place: { userId: req.user.id } },
    select: { id: true, topicId: true },
  });
  if (!existing) throw new HttpError(404, 'Flag not found.');
  const topicId = data.topicId === undefined ? existing.topicId : data.topicId;
  const keyPointId = data.keyPointId === undefined
    ? (data.topicId === undefined ? undefined : null)
    : data.keyPointId;
  await validateTopicLink(req.user.id, topicId, keyPointId);
  if (data.placeId !== undefined) {
    const place = await prisma.place.findFirst({
      where: { id: data.placeId, userId: req.user.id },
      select: { id: true },
    });
    if (!place) throw new HttpError(404, 'Place not found.');
  }
  const { placeId, ...updates } = data;
  if (data.topicId !== undefined && data.keyPointId === undefined) updates.keyPointId = null;
  res.json(await prisma.flag.update({
    where: { id },
    data: { ...updates, ...(placeId === undefined ? {} : { placeId }) },
  }));
}

export async function deleteFlag(req, res) {
  const id = parseId(req.params.id);
  const result = await prisma.flag.deleteMany({
    where: { id, place: { userId: req.user.id } },
  });
  if (!result.count) throw new HttpError(404, 'Flag not found.');
  res.status(204).end();
}