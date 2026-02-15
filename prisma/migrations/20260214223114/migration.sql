CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source" TEXT NOT NULL,
  "props" JSONB NOT NULL,
  "time" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "logs_pkey" PRIMARY KEY ("time", "id")
) PARTITION BY RANGE ("time");

CREATE INDEX "logs_source_idx" ON "logs"("source");

CREATE INDEX "logs_time_idx" ON "logs"("time");