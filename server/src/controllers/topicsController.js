import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../services/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { saveFile } from '../services/storage.js';
import { extractMaterial } from '../ai/gemini.js';
import { extractionPrompt } from '../ai/prompts.js';
import { extractionSchema, keyPointSchema } from '../ai/validate.js';

function idParam(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Topic ID must be a positive integer.');
  return id;
}

async function getOwnedTopic(userId, topicId) {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, userId },
    include: { topicFiles: { orderBy: { createdAt: 'asc' } }, unit: true },
  });
  if (!topic) throw new HttpError(404, 'Topic not found.');
  return topic;
}

async function pageCount(file) {
  if (file.mimetype !== 'application/pdf') return 1;
  let count;
  try {
    const document = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
    count = document.getPageCount();
  } catch {
    throw new HttpError(400, `${file.originalname} is not a readable PDF.`);
  }
  if (count < 1) throw new HttpError(400, `${file.originalname} has no pages.`);
  return count;
}

export async function listTopics(req, res) {
  res.json(await prisma.topic.findMany({
    where: { userId: req.user.id },
    include: {
      unit: true,
      topicFiles: true,
      explanations: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  }));
}

export async function getTopic(req, res) {
  res.json(await getOwnedTopic(req.user.id, idParam(req.params.id)));
}

export async function createTopic(req, res) {
  const data = z.object({
    title: z.string().trim().min(1).max(160),
    notes: z.string().max(8000).optional().default(''),
    unitId: z.number().int().positive().nullable().optional(),
    keyPoints: z.array(keyPointSchema).max(8).optional().default([]),
  }).strict().parse(req.body);
  if (data.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: data.unitId, userId: req.user.id }, select: { id: true } });
    if (!unit) throw new HttpError(404, 'Unit not found.');
  }
  const topic = await prisma.topic.create({
    data: {
      userId: req.user.id,
      title: data.title,
      notes: data.notes,
      unitId: data.unitId ?? null,
      keyPoints: data.keyPoints,
    },
    include: { topicFiles: true, unit: true },
  });
  res.status(201).json(topic);
}

export async function updateTopic(req, res) {
  const id = idParam(req.params.id);
  const data = z.object({
    title: z.string().trim().min(1).max(160).optional(),
    notes: z.string().max(8000).optional(),
    keyPoints: z.array(keyPointSchema).max(8).optional(),
    unitId: z.number().int().positive().nullable().optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.').parse(req.body);
  if (data.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: data.unitId, userId: req.user.id }, select: { id: true } });
    if (!unit) throw new HttpError(404, 'Unit not found.');
  }
  const result = await prisma.topic.updateMany({
    where: { id, userId: req.user.id },
    data: {
      ...data,
      ...(data.keyPoints === undefined ? {} : { keyPoints: data.keyPoints }),
    },
  });
  if (!result.count) throw new HttpError(404, 'Topic not found.');
  res.json(await getOwnedTopic(req.user.id, id));
}

export async function deleteTopic(req, res) {
  const result = await prisma.topic.deleteMany({ where: { id: idParam(req.params.id), userId: req.user.id } });
  if (!result.count) throw new HttpError(404, 'Topic not found.');
  res.status(204).end();
}

export async function uploadTopicFiles(req, res) {
  const id = idParam(req.params.id);
  const topic = await getOwnedTopic(req.user.id, id);
  const files = req.files ?? [];
  if (!files.length) throw new HttpError(400, 'Choose at least one PDF or image.');
  const newPages = await Promise.all(files.map(pageCount));
  const existingPages = topic.topicFiles.reduce((sum, item) => sum + item.pageCount, 0);
  const maxPages = Number(process.env.MAX_TOPIC_PAGES || 100);
  if (existingPages + newPages.reduce((sum, count) => sum + count, 0) > maxPages) {
    throw new HttpError(400, `A topic can contain no more than ${maxPages} pages total.`);
  }

  let extractions;
  try {
    extractions = await Promise.all(files.map((file) => extractMaterial(extractionPrompt(), file)));
  } catch (error) {
    console.error('Topic extraction failed:', error.message);
    throw new HttpError(503, 'Study material could not be analyzed. Check the server Gemini configuration and try again.');
  }
  const merged = extractionSchema.parse({
    title: extractions[0].title,
    notes: extractions.map((item) => item.notes).filter(Boolean).join('\n\n').slice(0, 30000),
    keyPoints: extractions.flatMap((item) => item.keyPoints).slice(0, 30).map((point, index) => ({
      id: index + 1,
      text: point.text,
    })),
  });
  const storedFiles = [];
  for (let index = 0; index < files.length; index += 1) {
    const stored = await saveFile(files[index]);
    storedFiles.push({ fileUrl: stored.secure_url, type: files[index].mimetype, pageCount: newPages[index] });
  }
  const updated = await prisma.topic.update({
    where: { id },
    data: {
      title: merged.title,
      notes: merged.notes,
      keyPoints: merged.keyPoints,
      topicFiles: { create: storedFiles },
    },
    include: { topicFiles: true, unit: true },
  });
  res.status(201).json({ topic: updated, extraction: merged });
}

export const extractTopic = uploadTopicFiles;

export async function deleteTopicFile(req, res) {
  const topicId = idParam(req.params.id);
  const fileId = idParam(req.params.fileId);
  const file = await prisma.topicFile.findFirst({
    where: { id: fileId, topic: { id: topicId, userId: req.user.id } },
  });
  if (!file) throw new HttpError(404, 'Topic file not found.');
  await prisma.topicFile.delete({ where: { id: fileId } });
  res.status(204).end();
}

export async function listExplanations(req, res) {
  const topicId = idParam(req.params.id);
  const topic = await prisma.topic.findFirst({ where: { id: topicId, userId: req.user.id }, select: { id: true } });
  if (!topic) throw new HttpError(404, 'Topic not found.');
  res.json(await prisma.explanation.findMany({ where: { topicId }, orderBy: { createdAt: 'desc' } }));
}

export async function getExplanation(req, res) {
  const explanation = await prisma.explanation.findFirst({
    where: { id: idParam(req.params.id), topic: { userId: req.user.id } },
  });
  if (!explanation) throw new HttpError(404, 'Explanation not found.');
  res.json(explanation);
}
