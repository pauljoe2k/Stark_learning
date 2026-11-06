import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { config } from '../src/config.js';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  const passwordHash = await argon2.hash(config.DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: 'demo@pinpoint.app' },
    update: { name: 'Alex', passwordHash, passMark: 70 },
    create: { name: 'Alex', email: 'demo@pinpoint.app', passwordHash, passMark: 70 },
  });

  let unit = await prisma.unit.findFirst({ where: { userId: user.id, title: 'Biology' } });
  if (!unit) unit = await prisma.unit.create({ data: { userId: user.id, title: 'Biology' } });

  let topic = await prisma.topic.findFirst({ where: { userId: user.id, title: 'Photosynthesis' } });
  if (!topic) {
    topic = await prisma.topic.create({
      data: {
        userId: user.id,
        unitId: unit.id,
        title: 'Photosynthesis',
        notes: 'Plants convert light energy into chemical energy.',
        keyPointsJson: [
          { id: 1, text: 'Chlorophyll absorbs light energy.' },
          { id: 2, text: 'Light-dependent reactions split water.' },
          { id: 3, text: 'Oxygen is released from water.' },
          { id: 4, text: 'The Calvin cycle fixes carbon dioxide.' },
          { id: 5, text: 'The Calvin cycle helps build sugars.' },
          { id: 6, text: 'Chloroplasts contain the photosynthetic machinery.' },
        ],
        nextKeyPointId: 7,
      },
    });
  }

  let place = await prisma.place.findFirst({ where: { userId: user.id, name: 'Study garden' } });
  if (!place) {
    place = await prisma.place.create({
      data: {
        userId: user.id,
        name: 'Study garden',
        imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"%3E%3Crect width="1200" height="800" fill="%2391b0a3"/%3E%3Cpath d="M0 620 310 300l230 240 180-190 480 430H0Z" fill="%23526e5c"/%3E%3C/svg%3E',
        flags: {
          create: [
            { topicId: topic.id, keyPointId: 1, x: 30, y: 58, title: 'Chlorophyll', note: 'Captures sunlight in leaves.' },
            { topicId: topic.id, keyPointId: 4, x: 69, y: 40, title: 'Carbon cycle', note: 'Carbon dioxide becomes part of sugar.' },
          ],
        },
      },
    });
  }

  const examDate = new Date();
  examDate.setDate(examDate.getDate() + 14);
  const existingExam = await prisma.exam.findFirst({ where: { userId: user.id, title: 'Biology review' } });
  if (!existingExam) {
    await prisma.exam.create({
      data: { userId: user.id, unitId: unit.id, title: 'Biology review', examDate },
    });
  }

  console.info(`Seeded demo account ${user.email}, topic ${topic.id}, and place ${place.id}.`);
}

seed()
  .catch((error: unknown) => {
    console.error('Database seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
