-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMPTZ,
ADD COLUMN     "refresh_token_hash" TEXT,
ALTER COLUMN "email" SET DATA TYPE CITEXT;

-- AlterTable
ALTER TABLE "institutes" ADD COLUMN     "join_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMPTZ,
ADD COLUMN     "refresh_token_hash" TEXT,
ALTER COLUMN "email" SET DATA TYPE CITEXT;

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "UserRole";

-- CreateIndex
CREATE UNIQUE INDEX "institutes_join_code_key" ON "institutes"("join_code");

