-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'DEACTIVATED', 'DELETED');

-- CreateEnum
CREATE TYPE "UserPortal" AS ENUM (
  'DASHBOARD',
  'ROADMAP',
  'TOPICS',
  'PROBLEMS',
  'COMPANIES',
  'MENTORS',
  'COMMUNITY',
  'PROFILE',
  'COMPANY_PORTAL',
  'ADMIN_PORTAL',
  'MODERATION',
  'POSTING'
);

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "accessGrants" "UserPortal"[] NOT NULL DEFAULT ARRAY[]::"UserPortal"[],
ADD COLUMN "githubUrl" TEXT,
ADD COLUMN "linkedinUrl" TEXT,
ADD COLUMN "portfolioUrl" TEXT,
ADD COLUMN "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Backfill access grants for existing accounts
UPDATE "User"
SET "accessGrants" = CASE
  WHEN "role" = 'STUDENT' THEN ARRAY[
    'DASHBOARD',
    'ROADMAP',
    'TOPICS',
    'PROBLEMS',
    'COMPANIES',
    'MENTORS',
    'COMMUNITY',
    'PROFILE',
    'POSTING'
  ]::"UserPortal"[]
  WHEN "role" = 'MENTOR' THEN ARRAY[
    'DASHBOARD',
    'TOPICS',
    'PROBLEMS',
    'COMPANIES',
    'MENTORS',
    'COMMUNITY',
    'PROFILE',
    'POSTING'
  ]::"UserPortal"[]
  WHEN "role" = 'COMPANY' THEN ARRAY[
    'DASHBOARD',
    'COMPANIES',
    'COMMUNITY',
    'PROFILE',
    'COMPANY_PORTAL',
    'POSTING'
  ]::"UserPortal"[]
  ELSE ARRAY[
    'DASHBOARD',
    'ROADMAP',
    'TOPICS',
    'PROBLEMS',
    'COMPANIES',
    'MENTORS',
    'COMMUNITY',
    'PROFILE',
    'COMPANY_PORTAL',
    'ADMIN_PORTAL',
    'MODERATION',
    'POSTING'
  ]::"UserPortal"[]
END;

-- CreateIndex
CREATE INDEX "User_status_role_idx" ON "User"("status", "role");
