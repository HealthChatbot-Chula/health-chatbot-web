-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LabReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "sourceMessageId" TEXT,
    "sourceAttachmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "measuredAt" DATETIME,
    "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fastingStatus" TEXT,
    "extractionRawJson" JSONB,
    "ocrText" TEXT,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LabReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LabReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LabReport_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LabReport_sourceAttachmentId_fkey" FOREIGN KEY ("sourceAttachmentId") REFERENCES "Attachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LabReport" ("confidence", "conversationId", "createdAt", "extractionRawJson", "fastingStatus", "id", "measuredAt", "ocrText", "reportedAt", "sourceAttachmentId", "sourceMessageId", "status", "updatedAt", "userId") SELECT "confidence", "conversationId", "createdAt", "extractionRawJson", "fastingStatus", "id", "measuredAt", "ocrText", "reportedAt", "sourceAttachmentId", "sourceMessageId", "status", "updatedAt", "userId" FROM "LabReport";
DROP TABLE "LabReport";
ALTER TABLE "new_LabReport" RENAME TO "LabReport";
CREATE INDEX "LabReport_userId_reportedAt_idx" ON "LabReport"("userId", "reportedAt");
CREATE INDEX "LabReport_conversationId_reportedAt_idx" ON "LabReport"("conversationId", "reportedAt");
CREATE INDEX "LabReport_sourceAttachmentId_idx" ON "LabReport"("sourceAttachmentId");
CREATE INDEX "LabReport_status_idx" ON "LabReport"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
