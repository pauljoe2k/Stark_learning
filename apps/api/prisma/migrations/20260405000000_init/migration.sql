-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "pass_mark" INTEGER NOT NULL DEFAULT 70,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unit_id" INTEGER,
    "title" VARCHAR(160) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "key_points_json" JSONB NOT NULL DEFAULT '[]',
    "next_key_point_id" INTEGER NOT NULL DEFAULT 1,
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_files" (
    "id" SERIAL NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "page_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "explanations" (
    "id" SERIAL NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "transcript" TEXT NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "points_json" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "next_focus" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "explanations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flags" (
    "id" SERIAL NOT NULL,
    "place_id" INTEGER NOT NULL,
    "topic_id" INTEGER,
    "key_point_id" INTEGER,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "note" VARCHAR(2000),
    "emoji" VARCHAR(8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recall_rounds" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "place_id" INTEGER NOT NULL,
    "time_limit_sec" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "recall_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recall_results" (
    "id" SERIAL NOT NULL,
    "round_id" INTEGER NOT NULL,
    "flag_id" INTEGER NOT NULL,
    "result" VARCHAR(10) NOT NULL,
    "seconds_taken" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recall_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unit_id" INTEGER,
    "title" VARCHAR(160) NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "units_user_id_idx" ON "units"("user_id");

-- CreateIndex
CREATE INDEX "topics_user_id_idx" ON "topics"("user_id");

-- CreateIndex
CREATE INDEX "topics_unit_id_idx" ON "topics"("unit_id");

-- CreateIndex
CREATE INDEX "topic_files_topic_id_idx" ON "topic_files"("topic_id");

-- CreateIndex
CREATE INDEX "explanations_topic_id_created_at_idx" ON "explanations"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "places_user_id_idx" ON "places"("user_id");

-- CreateIndex
CREATE INDEX "flags_place_id_idx" ON "flags"("place_id");

-- CreateIndex
CREATE INDEX "flags_topic_id_idx" ON "flags"("topic_id");

-- CreateIndex
CREATE INDEX "recall_rounds_user_id_started_at_idx" ON "recall_rounds"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "recall_rounds_place_id_idx" ON "recall_rounds"("place_id");

-- CreateIndex
CREATE INDEX "recall_results_flag_id_idx" ON "recall_results"("flag_id");

-- CreateIndex
CREATE UNIQUE INDEX "recall_results_round_id_flag_id_key" ON "recall_results"("round_id", "flag_id");

-- CreateIndex
CREATE INDEX "exams_user_id_exam_date_idx" ON "exams"("user_id", "exam_date");

-- CreateIndex
CREATE INDEX "exams_unit_id_idx" ON "exams"("unit_id");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_files" ADD CONSTRAINT "topic_files_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_rounds" ADD CONSTRAINT "recall_rounds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_rounds" ADD CONSTRAINT "recall_rounds_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_results" ADD CONSTRAINT "recall_results_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "recall_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_results" ADD CONSTRAINT "recall_results_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
