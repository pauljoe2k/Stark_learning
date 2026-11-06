import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { saveImage } from '../services/storage.js';
import { HttpError } from '../middleware/errorHandler.js';

const placeNameSchema = z.string().trim().min(1, 'Place name is required.').max(80, 'Place name must be 80 characters or fewer.');

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Place ID must be a positive integer.');
  return id;
}

export async function listPlaces(req, res) {
  const places = await prisma.place.findMany({
    where: { userId: req.user.id },
    include: { _count: { select: { flags: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(places);
}

export async function getPlace(req, res) {
  const place = await prisma.place.findFirst({
    where: { id: parseId(req.params.id), userId: req.user.id },
    include: { flags: { orderBy: { createdAt: 'asc' } } },
  });
  if (!place) throw new HttpError(404, 'Place not found.');
  res.json(place);
}

export async function createPlace(req, res) {
  const name = placeNameSchema.parse(req.body.name ?? '');
  if (!req.file) throw new HttpError(400, 'An image file is required.');
  const image = await saveImage(req.file);
  const place = await prisma.place.create({
    data: { name, imageUrl: image.secure_url, userId: req.user.id },
    include: { flags: true, _count: { select: { flags: true } } },
  });
  res.status(201).json(place);
}

export async function renamePlace(req, res) {
  const id = parseId(req.params.id);
  const body = z.object({ name: placeNameSchema }).strict().parse(req.body);
  const result = await prisma.place.updateMany({
    where: { id, userId: req.user.id },
    data: { name: body.name },
  });
  if (!result.count) throw new HttpError(404, 'Place not found.');
  res.json(await prisma.place.findFirst({
    where: { id, userId: req.user.id },
    include: { flags: true, _count: { select: { flags: true } } },
  }));
}

export async function deletePlace(req, res) {
  const result = await prisma.place.deleteMany({
    where: { id: parseId(req.params.id), userId: req.user.id },
  });
  if (!result.count) throw new HttpError(404, 'Place not found.');
  res.status(204).end();
}