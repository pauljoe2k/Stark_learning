-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passMark" INTEGER NOT NULL DEFAULT 70,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "title" VARCHAR(160) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "keyPoints" JSONB NOT NULL DEFAULT '[]',
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicFile" (
    "id" SERIAL NOT NULL,
    "topicId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Explanation" (
    "id" SERIAL NOT NULL,
    "topicId" INTEGER NOT NULL,
    "transcript" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "points" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "nextFocus" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Explanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" SERIAL NOT NULL,
    "placeId" INTEGER NOT NULL,
    "topicId" INTEGER,
    "keyPointId" INTEGER,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "note" VARCHAR(2000),
    "emoji" VARCHAR(8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallRound" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "placeId" INTEGER NOT NULL,
    "timeLimitSec" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RecallRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallResult" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "flagId" INTEGER NOT NULL,
    "result" VARCHAR(10) NOT NULL,
    "secondsTaken" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "title" VARCHAR(160) NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Unit_userId_idx" ON "Unit"("userId");

-- CreateIndex
CREATE INDEX "Topic_userId_idx" ON "Topic"("userId");

-- CreateIndex
CREATE INDEX "Topic_unitId_idx" ON "Topic"("unitId");

-- CreateIndex
CREATE INDEX "TopicFile_topicId_idx" ON "TopicFile"("topicId");

-- CreateIndex
CREATE INDEX "Explanation_topicId_createdAt_idx" ON "Explanation"("topicId", "createdAt");

-- CreateIndex
CREATE INDEX "Place_userId_idx" ON "Place"("userId");

-- CreateIndex
CREATE INDEX "Flag_placeId_idx" ON "Flag"("placeId");

-- CreateIndex
CREATE INDEX "Flag_topicId_idx" ON "Flag"("topicId");

-- CreateIndex
CREATE INDEX "RecallRound_userId_startedAt_idx" ON "RecallRound"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "RecallResult_flagId_idx" ON "RecallResult"("flagId");

-- CreateIndex
CREATE UNIQUE INDEX "RecallResult_roundId_flagId_key" ON "RecallResult"("roundId", "flagId");

-- CreateIndex
CREATE INDEX "Exam_userId_examDate_idx" ON "Exam"("userId", "examDate");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicFile" ADD CONSTRAINT "TopicFile_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Explanation" ADD CONSTRAINT "Explanation_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallRound" ADD CONSTRAINT "RecallRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallRound" ADD CONSTRAINT "RecallRound_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallResult" ADD CONSTRAINT "RecallResult_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RecallRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallResult" ADD CONSTRAINT "RecallResult_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "Flag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
