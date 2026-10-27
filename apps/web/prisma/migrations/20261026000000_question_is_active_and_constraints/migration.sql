-- Migration: Add isActive flag and constraints to Question
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Question_isActive_idx" ON "Question"("isActive");

-- Enforce title is not whitespace if present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_title_not_empty'
  ) THEN
    ALTER TABLE "Question" ADD CONSTRAINT "question_title_not_empty" CHECK (title IS NULL OR length(trim(title)) > 0);
  END IF;
END $$;
