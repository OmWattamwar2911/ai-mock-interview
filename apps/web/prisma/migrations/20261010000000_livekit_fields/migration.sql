-- Migration: add LiveKit real-time bot fields to InterviewSession
-- Safe to apply to existing data: all columns are nullable

ALTER TABLE "InterviewSession"
  ADD COLUMN IF NOT EXISTS "livekitRoom" TEXT,
  ADD COLUMN IF NOT EXISTS "transcript"  JSONB,
  ADD COLUMN IF NOT EXISTS "botSummary"  JSONB;
