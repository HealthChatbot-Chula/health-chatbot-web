CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Message" ADD COLUMN "chatSessionId" TEXT;

-- Preserve existing messages under one legacy session per conversation. New
-- activity will roll over to a new session after the inactivity timeout.
INSERT INTO "ChatSession" (
    "id",
    "userId",
    "conversationId",
    "startedAt",
    "lastActiveAt",
    "endedAt",
    "createdAt"
)
SELECT
    'legacy_' || conversation."id",
    conversation."userId",
    conversation."id",
    MIN(message."createdAt"),
    MAX(message."createdAt"),
    CASE
        WHEN MAX(message."createdAt") < CURRENT_TIMESTAMP - INTERVAL '60 minutes'
        THEN MAX(message."createdAt") + INTERVAL '60 minutes'
        ELSE NULL
    END,
    MIN(message."createdAt")
FROM "Conversation" AS conversation
INNER JOIN "Message" AS message
    ON message."conversationId" = conversation."id"
GROUP BY conversation."id", conversation."userId";

UPDATE "Message"
SET "chatSessionId" = 'legacy_' || "conversationId";

ALTER TABLE "Message" ALTER COLUMN "chatSessionId" SET NOT NULL;

CREATE INDEX "ChatSession_userId_lastActiveAt_idx"
ON "ChatSession"("userId", "lastActiveAt");

CREATE INDEX "ChatSession_conversationId_startedAt_idx"
ON "ChatSession"("conversationId", "startedAt");

CREATE INDEX "Message_chatSessionId_createdAt_idx"
ON "Message"("chatSessionId", "createdAt");

ALTER TABLE "ChatSession"
ADD CONSTRAINT "ChatSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatSession"
ADD CONSTRAINT "ChatSession_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_chatSessionId_fkey"
FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
