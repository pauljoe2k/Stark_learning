/**
 * Pinpoint seed — demo account with a non-empty dashboard.
 *
 * Run:  npm run seed        (or: node prisma/seed.js)
 *
 * Idempotent: the demo user is deleted (cascading to all their data) and rebuilt,
 * so you can re-run this as often as you like. It touches nothing else in the DB.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@pinpoint.app";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "Aarav";

/** Dates relative to today, so the countdown and calendar always look live. */
const daysFromNow = (days, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000);

async function main() {
  // --- 0. Reset the demo account only -------------------------------------
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  // --- 1. User -------------------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      passwordHash,
      passMark: 70,
    },
  });

  // --- 2. Unit -------------------------------------------------------------
  const unit = await prisma.unit.create({
    data: { userId: user.id, title: "Biology · Unit 3 — Plant Processes" },
  });

  // --- 3. Topic with stable key-point ids ----------------------------------
  const keyPoints = [
    { id: 1, text: "Chlorophyll in the chloroplast absorbs light energy" },
    { id: 2, text: "Light reactions split water, releasing oxygen" },
    { id: 3, text: "ATP and NADPH carry energy to the Calvin cycle" },
    { id: 4, text: "The Calvin cycle fixes CO2 into glucose" },
    { id: 5, text: "Stomata let CO2 in and water vapour out" },
    { id: 6, text: "Limiting factors: light intensity, CO2 concentration, temperature" },
  ];

  const topic = await prisma.topic.create({
    data: {
      userId: user.id,
      unitId: unit.id,
      title: "Photosynthesis",
      notes:
        "Plants convert light energy into chemical energy. Light reactions happen in the thylakoid membranes; the Calvin cycle happens in the stroma.",
      keyPoints,
      notesSource: "generated",
      mastery: 63,
    },
  });

  // --- 4. Uploaded material (2 pages, so the Add-material task is done) ----
  await prisma.topicFile.create({
    data: {
      topicId: topic.id,
      url: "https://res.cloudinary.com/demo/image/upload/pinpoint/seed-photosynthesis.pdf",
      storageKey: "pinpoint/seed-photosynthesis",
      type: "pdf",
      pageCount: 2,
    },
  });

  // --- 5. Two Explain attempts (progress over time) ------------------------
  await prisma.explanation.create({
    data: {
      topicId: topic.id,
      transcript:
        "Photosynthesis is how plants make food. They use sunlight and chlorophyll to turn carbon dioxide and water into glucose. Oxygen is released.",
      durationSec: 120,
      score: 38,
      points: [
        { id: 1, status: "covered", feedback: "Chlorophyll mentioned." },
        { id: 2, status: "incorrect", feedback: "Oxygen comes from splitting water, not from CO2." },
        { id: 3, status: "missing", feedback: "Name the energy carriers ATP and NADPH." },
        { id: 4, status: "partial", feedback: "Glucose mentioned but the Calvin cycle was not named." },
        { id: 5, status: "missing", feedback: "Explain how gases enter and leave the leaf." },
        { id: 6, status: "missing", feedback: "No limiting factors discussed." },
      ],
      nextFocus: [2, 3, 5, 6],
      createdAt: minutesAgo(90),
    },
  });

  await prisma.explanation.create({
    data: {
      topicId: topic.id,
      transcript:
        "Chlorophyll absorbs light in the chloroplast. The light reactions split water, which releases oxygen, and produce ATP and NADPH. Those drive the Calvin cycle, which fixes carbon dioxide into glucose. Stomata control gas exchange.",
      durationSec: 150,
      score: 83,
      points: [
        { id: 1, status: "covered", feedback: "Clear." },
        { id: 2, status: "covered", feedback: "Water splitting and oxygen release both correct." },
        { id: 3, status: "covered", feedback: "ATP and NADPH named correctly." },
        { id: 4, status: "covered", feedback: "CO2 fixation into glucose explained." },
        { id: 5, status: "covered", feedback: "Stomata covered." },
        { id: 6, status: "missing", feedback: "Still missing the limiting factors." },
      ],
      nextFocus: [6],
      createdAt: minutesAgo(20),
    },
  });

  // --- 6. A second topic, no material yet (so a task is visibly incomplete) -
  const topic2 = await prisma.topic.create({
    data: {
      userId: user.id,
      unitId: unit.id,
      title: "Cell Respiration",
      notes: "Glycolysis, the Krebs cycle, and the electron transport chain.",
      keyPoints: [
        { id: 1, text: "Glycolysis breaks glucose into pyruvate in the cytoplasm" },
        { id: 2, text: "The Krebs cycle runs in the mitochondrial matrix" },
        { id: 3, text: "The electron transport chain builds most of the ATP" },
        { id: 4, text: "Oxygen is the final electron acceptor" },
        { id: 5, text: "Anaerobic respiration produces lactate in animals" },
      ],
      notesSource: "uploaded",
      mastery: 0,
    },
  });

  // --- 7. Palace: one place with three flags -------------------------------
  const place = await prisma.place.create({
    data: {
      userId: user.id,
      name: "Study desk",
      imageUrl: "https://res.cloudinary.com/demo/image/upload/pinpoint/seed-desk.jpg",
      storageKey: "pinpoint/seed-desk",
    },
  });

  const [flag1, flag2, flag3] = await Promise.all([
    prisma.flag.create({
      data: {
        placeId: place.id,
        topicId: topic.id,
        keyPointId: 1,
        x: 22.5,
        y: 31.0,
        title: "Lamp = light energy",
        note: "Chlorophyll absorbs it in the chloroplast.",
        emoji: "💡",
      },
    }),
    prisma.flag.create({
      data: {
        placeId: place.id,
        topicId: topic.id,
        keyPointId: 3,
        x: 61.2,
        y: 48.7,
        title: "Water bottle = water splitting",
        note: "Oxygen leaves here; ATP and NADPH carry the energy away.",
        emoji: "💧",
      },
    }),
    prisma.flag.create({
      data: {
        placeId: place.id,
        topicId: topic.id,
        keyPointId: 6,
        x: 84.0,
        y: 72.4,
        title: "Window = limiting factors",
        note: "Less light through the glass, less photosynthesis.",
        emoji: "🪟",
      },
    }),
  ]);

  // --- 8. One finished recall round: 2 green, 1 red (mostly green) ---------
  const round = await prisma.recallRound.create({
    data: {
      userId: user.id,
      placeId: place.id,
      timeLimitSec: 15,
      startedAt: minutesAgo(10),
      finishedAt: minutesAgo(8),
      greenCount: 2,
      redCount: 1,
    },
  });

  await prisma.recallResult.createMany({
    data: [
      { roundId: round.id, flagId: flag1.id, outcome: "green", secondsTaken: 6.4 },
      { roundId: round.id, flagId: flag2.id, outcome: "green", secondsTaken: 11.9 },
      { roundId: round.id, flagId: flag3.id, outcome: "red", secondsTaken: 15.0 },
    ],
  });

  // --- 9. Exams: one close, one later (drives the countdown + calendar) ----
  await prisma.exam.createMany({
    data: [
      { userId: user.id, unitId: unit.id, title: "Biology Mid-term", examDate: daysFromNow(12) },
      { userId: user.id, unitId: unit.id, title: "Unit 3 Class Test", examDate: daysFromNow(26) },
    ],
  });

  console.log("Seed complete.");
  console.log(`  login: ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log(
    `  topics: ${topic.title} (mastery 63, 2 attempts, 3 flags), ${topic2.title} (no material yet)`
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
