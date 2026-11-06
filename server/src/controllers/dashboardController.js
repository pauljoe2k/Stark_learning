import { prisma } from '../services/prisma.js';
import { daysUntil, countdownTone } from '../services/countdown.js';
import { buildTopicTasks, calculateRecallStreak } from '../services/tasks.js';

export async function getDashboard(req, res) {
  const [user, units, topics, exams, recallRounds] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, passMark: true } }),
    prisma.unit.findMany({ where: { userId: req.user.id }, orderBy: { title: 'asc' } }),
    prisma.topic.findMany({
      where: { userId: req.user.id },
      include: {
        unit: true,
        topicFiles: true,
        explanations: { orderBy: { createdAt: 'desc' }, take: 1 },
        flags: { select: { id: true, topicId: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.exam.findMany({
      where: { userId: req.user.id, examDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      include: { unit: true },
      orderBy: { examDate: 'asc' },
    }),
    prisma.recallRound.findMany({
      where: { userId: req.user.id, finishedAt: { not: null } },
      include: { results: { include: { flag: { select: { topicId: true } } } } },
      orderBy: { startedAt: 'desc' },
    }),
  ]);
  if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
  const nearest = exams[0] ?? null;
  const daysLeft = nearest ? daysUntil(nearest.examDate) : null;
  res.json({
    greeting: `Hey ${user.name}`,
    user,
    units: units.map((unit) => ({
      ...unit,
      topics: topics.filter((topic) => topic.unitId === unit.id),
    })),
    topics: topics.filter((topic) => topic.unitId === null),
    tasks: buildTopicTasks(topics, recallRounds, user.passMark),
    exams,
    nearest_exam: nearest ? {
      ...nearest,
      days_left: daysLeft,
      tone: countdownTone(daysLeft),
    } : null,
    pass_mark: user.passMark,
    streak_days: calculateRecallStreak(recallRounds),
  });
}
