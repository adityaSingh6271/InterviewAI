-- Interview creator id (no FK: the author may live in either portal's
-- table, mirroring interview_notes.created_by). Nullable because
-- pre-existing rows have no recorded owner. Lets a student keep and edit
-- their own DRAFT wizard rows while everyone else still cannot see them.

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN IF NOT EXISTS "created_by" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "interviews_created_by_idx" ON "interviews"("created_by");
