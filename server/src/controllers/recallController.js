import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { chooseRandomPlace } from '../services/recallSelection.js';

const roundIdParam = (value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Recall round ID must be a positive integer.');
  return id;
};

async function ownedRound(userId, roundId) {
  const round = await prisma.recallRound.findFirst({
    where: { id: roundId, userId },
    include: { place: { include: { flags: true } }, results: true },
  });
  if (!round) throw new HttpError(404, 'Recall round not found.');
  return round;
}

export async function startRecall(req, res) {
  const { time_limit_sec: timeLimitSec } = z.object({
    time_limit_sec: z.number().int().min(5).max(600).default(30),
  }).strict().parse(req.body ?? {});
  const places = await prisma.place.findMany({
    where: { userId: req.user.id, flags: { some: {} } },
    include: { flags: { select: { id: true, x: true, y: true } } },
  });
  const place = chooseRandomPlace(places);
  if (!place) throw new HttpError(400, 'Add a place and at least one flag before starting Recall.');
  const round = await prisma.recallRound.create({
    data: { userId: req.user.id, placeId: place.id, timeLimitSec },
  });
  res.status(201).json({
    roundId: round.id,
    time_limit_sec: round.timeLimitSec,
    place: { id: place.id, name: place.name, imageUrl: place.imageUrl },
    flags: place.flags,
  });
}

export async function revealFlag(req, res) {
  const round = await ownedRound(req.user.id, roundIdParam(req.params.roundId));
  if (round.finishedAt) throw new HttpError(409, 'This recall round is already finished.');
  const { flag_id: flagId } = z.object({ flag_id: z.number().int().positive() }).strict().parse(req.body);
  if (round.results.some((item) => item.flagId === flagId)) throw new HttpError(409, 'This flag was already recalled.');
  const flag = round.place.flags.find((item) => item.id === flagId);
  if (!flag) throw new HttpError(404, 'Flag not found in this recall round.');
  res.json({ id: flag.id, title: flag.title, note: flag.note, emoji: flag.emoji });
}

export async function saveRecallResult(req, res) {
  const round = await ownedRound(req.user.id, roundIdParam(req.params.roundId));
  if (round.finishedAt) throw new HttpError(409, 'This recall round is already finished.');
  const data = z.object({
    flag_id: z.number().int().positive(),
    result: z.enum(['green', 'red']),
    seconds_taken: z.number().int().min(0).max(3600),
  }).strict().parse(req.body);
  if (!round.place.flags.some((flag) => flag.id === data.flag_id)) {
    throw new HttpError(404, 'Flag not found in this recall round.');
  }
  if (round.results.some((item) => item.flagId === data.flag_id)) {
    throw new HttpError(409, 'A result for this flag has already been saved.');
  }
  const result = data.result === 'green' && data.seconds_taken <= round.timeLimitSec ? 'green' : 'red';
  try {
    const saved = await prisma.recallResult.create({
      data: {
        roundId: round.id,
        flagId: data.flag_id,
        result,
        secondsTaken: data.seconds_taken,
      },
    });
    res.status(201).json({ id: saved.id, flag_id: saved.flagId, result: saved.result, seconds_taken: saved.secondsTaken });
  } catch (error) {
    if (error?.code === 'P2002') throw new HttpError(409, 'A result for this flag has already been saved.');
    throw error;
  }
}

export async function finishRecall(req, res) {
  const round = await ownedRound(req.user.id, roundIdParam(req.params.roundId));
  if (round.finishedAt) {
    return res.json({
      roundId: round.id,
      place: { id: round.place.id, name: round.place.name, imageUrl: round.place.imageUrl },
      flags: round.place.flags,
      results: round.results.map((item) => ({ flag_id: item.flagId, result: item.result, seconds_taken: item.secondsTaken })),
      summary: {
        green: round.results.filter((item) => item.result === 'green').length,
        red: round.results.filter((item) => item.result === 'red').length,
      },
    });
  }
  const recorded = new Set(round.results.map((item) => item.flagId));
  const missed = round.place.flags
    .filter((flag) => !recorded.has(flag.id))
    .map((flag) => ({ roundId: round.id, flagId: flag.id, result: 'red', secondsTaken: round.timeLimitSec }));
  if (missed.length) await prisma.recallResult.createMany({ data: missed, skipDuplicates: true });
  const updated = await prisma.recallRound.update({
    where: { id: round.id },
    data: { finishedAt: new Date() },
    include: { results: true },
  });
  res.json({
    roundId: updated.id,
    place: { id: round.place.id, name: round.place.name, imageUrl: round.place.imageUrl },
    flags: round.place.flags,
    results: updated.results.map((item) => ({
      flag_id: item.flagId,
      result: item.result,
      seconds_taken: item.secondsTaken,
    })),
    summary: {
      green: updated.results.filter((item) => item.result === 'green').length,
      red: updated.results.filter((item) => item.result === 'red').length,
    },
  });
}

export async function recallHistory(req, res) {
  const rounds = await prisma.recallRound.findMany({
    where: { userId: req.user.id },
    include: { place: { select: { id: true, name: true, imageUrl: true } }, results: true },
    orderBy: { startedAt: 'desc' },
    take: 30,
  });
  res.json(rounds);
}