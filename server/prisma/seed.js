import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const password = 'PinpointDemo123!';
const passwordHash = await bcrypt.hash(password, 12);

try {
  const demo = await prisma.user.upsert({
    where: { email: 'demo@pinpoint.app' },
    update: { name: 'Alex', passwordHash },
    create: { name: 'Alex', email: 'demo@pinpoint.app', passwordHash },
  });
  const second = await prisma.user.upsert({
    where: { email: 'demo2@pinpoint.app' },
    update: { name: 'Sam', passwordHash },
    create: { name: 'Sam', email: 'demo2@pinpoint.app', passwordHash },
  });

  let unit = await prisma.unit.findFirst({ where: { userId: demo.id, title: 'Biology' } });
  if (!unit) unit = await prisma.unit.create({ data: { userId: demo.id, title: 'Biology' } });
  const existingTopic = await prisma.topic.findFirst({ where: { userId: demo.id, title: 'Photosynthesis' } });
  const topic = existingTopic ?? await prisma.topic.create({
    data: {
      userId: demo.id,
      unitId: unit.id,
      title: 'Photosynthesis',
      notes: 'Plants convert light energy into chemical energy. Chlorophyll captures light in the chloroplasts. The light-dependent reactions split water and release oxygen, while the Calvin cycle fixes carbon dioxide into sugars.',
      keyPoints: [
        { id: 1, text: 'Chlorophyll absorbs light energy in the chloroplasts.' },
        { id: 2, text: 'Light-dependent reactions use light to split water.' },
        { id: 3, text: 'Oxygen is released when water molecules are split.' },
        { id: 4, text: 'The Calvin cycle fixes carbon dioxide.' },
        { id: 5, text: 'The Calvin cycle uses energy to build glucose.' },
      ],
    },
  });

  let place = await prisma.place.findFirst({ where: { userId: demo.id, name: 'Study garden' } });
  if (!place) {
    place = await prisma.place.create({
      data: {
        userId: demo.id,
        name: 'Study garden',
        imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"%3E%3Crect width="1200" height="800" fill="%2391b0a3"/%3E%3Cpath d="M0 620 310 300l230 240 180-190 480 430H0Z" fill="%23526e5c"/%3E%3C/svg%3E',
        flags: {
          create: [
            { topicId: topic.id, keyPointId: 1, x: 30, y: 58, title: 'Chlorophyll', note: 'Captures sunlight in the leaves.', emoji: '🌿' },
            { topicId: topic.id, keyPointId: 4, x: 69, y: 40, title: 'Carbon cycle', note: 'Carbon dioxide becomes part of sugar.', emoji: '☀️' },
          ],
        },
      },
    });
  }

  const examDate = new Date();
  examDate.setDate(examDate.getDate() + 14);
  if (!(await prisma.exam.findFirst({ where: { userId: demo.id, title: 'Biology review' } }))) {
    await prisma.exam.create({
      data: { userId: demo.id, unitId: unit.id, title: 'Biology review', examDate },
    });
  }
  console.log(`Seeded demo account demo@pinpoint.app and second account demo2@pinpoint.app (id ${second.id}).`);
  console.log('Demo password: PinpointDemo123!');
} finally {
  await prisma.$disconnect();
}