-- Link each assistant response to the user message that prompted it.
ALTER TABLE "Message" ADD COLUMN "replyToMessageId" TEXT;

-- Backfill existing assistant messages from the closest earlier user message
-- in the same conversation. New messages are linked by the application.
UPDATE "Message" AS assistant
SET "replyToMessageId" = (
  SELECT candidate."id"
  FROM "Message" AS candidate
  WHERE candidate."conversationId" = assistant."conversationId"
    AND candidate."role" = 'user'
    AND candidate."createdAt" <= assistant."createdAt"
  ORDER BY candidate."createdAt" DESC, candidate."id" DESC
  LIMIT 1
)
WHERE assistant."role" = 'assistant';

CREATE TYPE "ExpertReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED');
CREATE TYPE "ExpertReviewVerdict" AS ENUM ('APPROVED', 'NEEDS_IMPROVEMENT', 'UNSAFE');

CREATE TABLE "ExpertReviewer" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "displayName" TEXT NOT NULL,
    "specialty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpertReviewer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpertReview" (
    "id" TEXT NOT NULL,
    "assistantMessageId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" "ExpertReviewStatus" NOT NULL DEFAULT 'PENDING',
    "verdict" "ExpertReviewVerdict",
    "accuracyScore" INTEGER,
    "safetyScore" INTEGER,
    "relevanceScore" INTEGER,
    "clarityScore" INTEGER,
    "feedback" TEXT,
    "suggestedAnswer" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpertReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExpertReview_accuracyScore_check" CHECK ("accuracyScore" IS NULL OR "accuracyScore" BETWEEN 1 AND 5),
    CONSTRAINT "ExpertReview_safetyScore_check" CHECK ("safetyScore" IS NULL OR "safetyScore" BETWEEN 1 AND 5),
    CONSTRAINT "ExpertReview_relevanceScore_check" CHECK ("relevanceScore" IS NULL OR "relevanceScore" BETWEEN 1 AND 5),
    CONSTRAINT "ExpertReview_clarityScore_check" CHECK ("clarityScore" IS NULL OR "clarityScore" BETWEEN 1 AND 5)
);

CREATE INDEX "Message_replyToMessageId_idx" ON "Message"("replyToMessageId");
CREATE UNIQUE INDEX "ExpertReviewer_externalId_key" ON "ExpertReviewer"("externalId");
CREATE UNIQUE INDEX "ExpertReview_assistantMessageId_reviewerId_key" ON "ExpertReview"("assistantMessageId", "reviewerId");
CREATE INDEX "ExpertReview_status_createdAt_idx" ON "ExpertReview"("status", "createdAt");
CREATE INDEX "ExpertReview_reviewerId_status_idx" ON "ExpertReview"("reviewerId", "status");

ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpertReview" ADD CONSTRAINT "ExpertReview_assistantMessageId_fkey" FOREIGN KEY ("assistantMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpertReview" ADD CONSTRAINT "ExpertReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "ExpertReviewer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
