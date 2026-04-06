-- AlterEnum
ALTER TYPE "CodeLanguage" ADD VALUE IF NOT EXISTS 'C';
ALTER TYPE "CodeLanguage" ADD VALUE IF NOT EXISTS 'CPP';
ALTER TYPE "CodeLanguage" ADD VALUE IF NOT EXISTS 'JAVA';
ALTER TYPE "CodeLanguage" ADD VALUE IF NOT EXISTS 'PYTHON';
ALTER TYPE "CodeLanguage" ADD VALUE IF NOT EXISTS 'GO';
ALTER TYPE "CodeLanguage" ADD VALUE IF NOT EXISTS 'CSHARP';
ALTER TYPE "CodeLanguage" ADD VALUE IF NOT EXISTS 'KOTLIN';
ALTER TYPE "CodeLanguage" ADD VALUE IF NOT EXISTS 'RUST';

-- CreateTable
CREATE TABLE "CodeDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "language" "CodeLanguage" NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeDraft_userId_problemId_language_key" ON "CodeDraft"("userId", "problemId", "language");

-- CreateIndex
CREATE INDEX "CodeDraft_userId_updatedAt_idx" ON "CodeDraft"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "CodeDraft_problemId_language_idx" ON "CodeDraft"("problemId", "language");

-- AddForeignKey
ALTER TABLE "CodeDraft" ADD CONSTRAINT "CodeDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeDraft" ADD CONSTRAINT "CodeDraft_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
