-- CreateEnum
CREATE TYPE "CodeLanguage" AS ENUM ('TYPESCRIPT', 'JAVASCRIPT');

-- CreateEnum
CREATE TYPE "CodeExecutionStatus" AS ENUM ('PASSED', 'PARTIAL', 'FAILED', 'RUNTIME_ERROR', 'SYNTAX_ERROR', 'TIMEOUT');

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "codeExecutionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "starterCode" TEXT,
ADD COLUMN     "starterLanguage" "CodeLanguage" NOT NULL DEFAULT 'TYPESCRIPT';

-- CreateTable
CREATE TABLE "ProblemTestCase" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "label" TEXT,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "language" "CodeLanguage" NOT NULL,
    "code" TEXT NOT NULL,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CodeExecutionStatus" NOT NULL,
    "runtimeMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemTestCase_problemId_isHidden_sortOrder_idx" ON "ProblemTestCase"("problemId", "isHidden", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemTestCase_problemId_sortOrder_key" ON "ProblemTestCase"("problemId", "sortOrder");

-- CreateIndex
CREATE INDEX "CodeSubmission_userId_problemId_createdAt_idx" ON "CodeSubmission"("userId", "problemId", "createdAt");

-- CreateIndex
CREATE INDEX "CodeSubmission_problemId_createdAt_idx" ON "CodeSubmission"("problemId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProblemTestCase" ADD CONSTRAINT "ProblemTestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
