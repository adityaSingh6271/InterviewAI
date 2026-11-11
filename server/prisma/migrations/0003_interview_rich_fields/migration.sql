-- Interview rich-profile fields + round details + interview notes.
-- Adds the student-portal wizard payload (target role, company, category,
-- industry, seniority, session duration, eligibility, progress, and the
-- jsonb artifacts: resume reference, extracted job data, match analysis),
-- round detail columns (description, estimated duration, client taxonomy),
-- and the interview_notes table for free-form notes (author id is stored
-- without a FK - the author may live in either portal's table).

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "category" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "eligibility_status" TEXT,
ADD COLUMN     "experience_level" TEXT,
ADD COLUMN     "extracted_job_data" JSONB,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "match_analysis" JSONB,
ADD COLUMN     "overall_progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "resume" JSONB,
ADD COLUMN     "session_duration_minutes" INTEGER,
ADD COLUMN     "target_role" TEXT;

-- AlterTable
ALTER TABLE "rounds" ADD COLUMN     "client_type" TEXT,
ADD COLUMN     "description" TEXT DEFAULT '',
ADD COLUMN     "estimated_duration_minutes" INTEGER;

-- CreateTable
CREATE TABLE "interview_notes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" TEXT NOT NULL,
    "round_id" TEXT,
    "content" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interview_notes_interview_id_idx" ON "interview_notes"("interview_id");

-- AddForeignKey
ALTER TABLE "interview_notes" ADD CONSTRAINT "interview_notes_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_notes" ADD CONSTRAINT "interview_notes_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
