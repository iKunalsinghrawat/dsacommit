-- CreateEnum
CREATE TYPE "ChangeRequestEntityType" AS ENUM ('TOPIC', 'ROADMAP_ITEM', 'PROBLEM');

-- CreateEnum
CREATE TYPE "ChangeRequestOperationType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "Problem_topicId_difficulty_idx";

-- DropIndex
DROP INDEX "Topic_level_sortOrder_idx";

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RoadmapItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "level" "RoadmapLevel" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "topicId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "entityType" "ChangeRequestEntityType" NOT NULL,
    "operationType" "ChangeRequestOperationType" NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "requestedData" JSONB NOT NULL,
    "currentData" JSONB,
    "rejectionReason" TEXT,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequestReview" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeRequestReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapItem_slug_key" ON "RoadmapItem"("slug");

-- CreateIndex
CREATE INDEX "RoadmapItem_level_sortOrder_isArchived_idx" ON "RoadmapItem"("level", "sortOrder", "isArchived");

-- CreateIndex
CREATE INDEX "RoadmapItem_topicId_isArchived_idx" ON "RoadmapItem"("topicId", "isArchived");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_entityType_createdAt_idx" ON "ChangeRequest"("status", "entityType", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeRequest_requestedById_createdAt_idx" ON "ChangeRequest"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeRequest_entityType_entityId_idx" ON "ChangeRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ChangeRequestReview_requestId_createdAt_idx" ON "ChangeRequestReview"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeRequestReview_reviewerId_createdAt_idx" ON "ChangeRequestReview"("reviewerId", "createdAt");

-- CreateIndex
CREATE INDEX "Problem_topicId_difficulty_isArchived_idx" ON "Problem"("topicId", "difficulty", "isArchived");

-- CreateIndex
CREATE INDEX "Topic_level_sortOrder_isArchived_idx" ON "Topic"("level", "sortOrder", "isArchived");

-- AddForeignKey
ALTER TABLE "RoadmapItem" ADD CONSTRAINT "RoadmapItem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestReview" ADD CONSTRAINT "ChangeRequestReview_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestReview" ADD CONSTRAINT "ChangeRequestReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
