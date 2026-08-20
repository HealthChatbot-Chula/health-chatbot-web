CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "LabReport" ADD COLUMN "sourceAttachmentId" TEXT;
ALTER TABLE "LabReport" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "LabReport" ADD COLUMN "extractionRawJson" JSONB;
ALTER TABLE "LabReport" ADD COLUMN "ocrText" TEXT;
ALTER TABLE "LabReport" ADD COLUMN "confidence" REAL;

ALTER TABLE "LabResult" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "LabResult" ADD COLUMN "confidence" REAL;

CREATE INDEX "Attachment_userId_createdAt_idx" ON "Attachment"("userId", "createdAt");
CREATE INDEX "Attachment_conversationId_createdAt_idx" ON "Attachment"("conversationId", "createdAt");
CREATE INDEX "LabReport_sourceAttachmentId_idx" ON "LabReport"("sourceAttachmentId");
CREATE INDEX "LabReport_status_idx" ON "LabReport"("status");
CREATE INDEX "LabResult_status_idx" ON "LabResult"("status");
