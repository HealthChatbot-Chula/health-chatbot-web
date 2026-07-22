import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";

export type LabResultDraftInput = {
  name: string;
  value: number;
  unit?: string | null;
  referenceRange?: string | null;
  flag?: string | null;
  confidence?: number | null;
};

export async function createAttachment(input: {
  userId: string;
  conversationId?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: Uint8Array<ArrayBuffer>;
}) {
  return prisma.attachment.create({
    data: {
      userId: input.userId,
      conversationId: input.conversationId ?? null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      data: input.data
    }
  });
}

export async function getUserAttachment(userId: string, attachmentId: string) {
  return prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      userId
    }
  });
}

export async function getUserLabReport(userId: string, labReportId: string) {
  return prisma.labReport.findFirst({
    where: {
      id: labReportId,
      userId
    },
    include: {
      results: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function createLabReportDraft(input: {
  userId: string;
  conversationId?: string | null;
  sourceAttachmentId?: string | null;
  measuredAt?: Date | null;
  fastingStatus?: string | null;
  extractionRawJson?: Prisma.InputJsonValue;
  ocrText?: string | null;
  confidence?: number | null;
  results: LabResultDraftInput[];
}) {
  return prisma.labReport.create({
    data: {
      userId: input.userId,
      conversationId: input.conversationId ?? null,
      sourceAttachmentId: input.sourceAttachmentId ?? null,
      status: "draft",
      measuredAt: input.measuredAt ?? null,
      fastingStatus: input.fastingStatus ?? null,
      extractionRawJson: input.extractionRawJson ?? undefined,
      ocrText: input.ocrText ?? null,
      confidence: input.confidence ?? null,
      results: {
        create: input.results.map((result) => ({
          ...result,
          status: "draft"
        }))
      }
    },
    include: {
      results: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function replaceLabReportDraft(input: {
  userId: string;
  labReportId: string;
  measuredAt?: Date | null;
  fastingStatus?: string | null;
  ocrText?: string | null;
  results: LabResultDraftInput[];
}) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.labReport.findFirst({
      where: {
        id: input.labReportId,
        userId: input.userId,
        status: "draft"
      }
    });

    if (!report) {
      return null;
    }

    await tx.labResult.deleteMany({
      where: { labReportId: input.labReportId }
    });

    return tx.labReport.update({
      where: { id: input.labReportId },
      data: {
        measuredAt: input.measuredAt ?? null,
        fastingStatus: input.fastingStatus ?? null,
        ocrText: input.ocrText ?? null,
        results: {
          create: input.results.map((result) => ({
            ...result,
            status: "draft"
          }))
        }
      },
      include: {
        results: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
  });
}

export async function confirmLabReportDraft(input: {
  userId: string;
  labReportId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.labReport.findFirst({
      where: {
        id: input.labReportId,
        userId: input.userId,
        status: "draft"
      },
      include: {
        results: true
      }
    });

    if (!report || report.results.length === 0) {
      return null;
    }

    await tx.labResult.updateMany({
      where: { labReportId: input.labReportId },
      data: { status: "confirmed" }
    });

    return tx.labReport.update({
      where: { id: input.labReportId },
      data: { status: "confirmed" },
      include: {
        results: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
  });
}

export async function attachSourceMessageToLabReport(input: {
  userId: string;
  labReportId: string;
  sourceMessageId: string;
  conversationId: string;
}) {
  return prisma.labReport.updateMany({
    where: {
      id: input.labReportId,
      userId: input.userId
    },
    data: {
      sourceMessageId: input.sourceMessageId,
      conversationId: input.conversationId
    }
  });
}
