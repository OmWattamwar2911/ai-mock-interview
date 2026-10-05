-- CreateTable
CREATE TABLE "AssessmentBankQuestion" (
    "id" TEXT NOT NULL,
    "type" "AssessmentQuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "topic" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "source" "QuestionSource" NOT NULL DEFAULT 'BANK',
    "constraints" TEXT,
    "examples" JSONB,
    "starterCode" JSONB,
    "testCases" JSONB,
    "referenceSolution" JSONB,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentBankQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssessmentBankQuestion_type_difficulty_deletedAt_idx" ON "AssessmentBankQuestion"("type", "difficulty", "deletedAt");
ALTER TABLE "AssessmentBankQuestion" ADD CONSTRAINT "AssessmentBankQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
