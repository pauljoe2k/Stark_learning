-- Add review scheduling to palace flags.
ALTER TABLE "flags"
ADD COLUMN "review_interval_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "review_ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN "next_review_at" TIMESTAMP(3),
ADD COLUMN "last_reviewed_at" TIMESTAMP(3);

CREATE INDEX "flags_next_review_at_idx" ON "flags"("next_review_at");

-- Share links store only a hash of the unguessable bearer token.
CREATE TABLE "place_shares" (
    "id" SERIAL NOT NULL,
    "place_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "place_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "place_shares_token_hash_key" ON "place_shares"("token_hash");
CREATE INDEX "place_shares_place_id_idx" ON "place_shares"("place_id");
ALTER TABLE "place_shares" ADD CONSTRAINT "place_shares_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep recall settings and spoken-answer feedback with each round/result.
ALTER TABLE "recall_rounds"
ADD COLUMN "speed_mode" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "recall_results"
ADD COLUMN "voice_transcript" TEXT,
ADD COLUMN "ai_feedback" TEXT,
ADD COLUMN "grading_source" VARCHAR(12);
