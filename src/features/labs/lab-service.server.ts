import { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { sendConfirmedLabReportToConversation } from "@/features/chat/chat-service.server";
import type { LabReportDraft } from "@/features/labs/lab.types";
import { extractLabReportFromAttachment, type ExtractLabReportResponse } from "@/server/clients/health-backend.client";
import {
  attachSourceMessageToLabReport,
  confirmLabReportDraft,
  createAttachment,
  createLabReportDraft,
  getUserAttachment,
  getUserLabReport,
  replaceLabReportDraft,
  type LabResultDraftInput
} from "@/server/repositories/lab.repository";

const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const SUPPORTED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);

function serializeLabReportDraft(report: NonNullable<Awaited<ReturnType<typeof getUserLabReport>>>): LabReportDraft {
  return {
    id: report.id,
    status: report.status === "confirmed" ? "confirmed" : "draft",
    conversationId: report.conversationId,
    sourceAttachmentId: report.sourceAttachmentId,
    measuredAt: report.measuredAt?.toISOString() ?? null,
    reportedAt: report.reportedAt.toISOString(),
    fastingStatus: report.fastingStatus,
    ocrText: report.ocrText,
    confidence: report.confidence,
    results: report.results.map((result) => ({
      id: result.id,
      name: result.name,
      value: result.value,
      unit: result.unit,
      referenceRange: result.referenceRange,
      flag: result.flag,
      confidence: result.confidence
    }))
  };
}

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizeResult(result: LabResultDraftInput): LabResultDraftInput {
  return {
    name: result.name.trim(),
    value: result.value,
    unit: result.unit?.trim() || null,
    referenceRange: result.referenceRange?.trim() || null,
    flag: result.flag?.trim() || null,
    confidence: result.confidence ?? null
  };
}

function normalizeExtractedResults(extraction: ExtractLabReportResponse | null): LabResultDraftInput[] {
  if (!Array.isArray(extraction?.results)) {
    return [];
  }

  return extraction.results
    .filter((result) => typeof result.name === "string" && Number.isFinite(result.value))
    .slice(0, 200)
    .map((result) =>
      normalizeResult({
        name: result.name,
        value: result.value,
        unit: result.unit,
        referenceRange: result.referenceRange,
        flag: result.flag,
        confidence: result.confidence
      })
    );
}

function extractSimpleTextLabs(text: string): LabResultDraftInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^([A-Za-zก-๙][A-Za-zก-๙\s./()%+-]{1,80}?)\s*[:=]?\s*(-?\d+(?:\.\d+)?)\s*([A-Za-z/%ก-๙]+)?(?:\s+(.{1,80}))?$/);
      if (!match) {
        return null;
      }

      return normalizeResult({
        name: match[1],
        value: Number(match[2]),
        unit: match[3] ?? null,
        referenceRange: match[4] ?? null,
        confidence: 0.45
      });
    })
    .filter((result): result is LabResultDraftInput => Boolean(result))
    .slice(0, 80);
}

function extractionRawJson(extraction: ExtractLabReportResponse | null, fallbackReason?: string) {
  return JSON.parse(JSON.stringify({
    provider: extraction ? "lab_extraction_backend" : "local_fallback",
    fallbackReason: fallbackReason ?? null,
    raw: extraction ?? null
  })) as Prisma.InputJsonObject;
}

export async function uploadLabAttachment(input: {
  userId: string;
  conversationId?: string | null;
  file: File;
}) {
  if (!SUPPORTED_ATTACHMENT_TYPES.has(input.file.type)) {
    throw new AppError("รองรับเฉพาะไฟล์ PDF, รูปภาพ JPEG/PNG/WebP หรือ text file", 400);
  }

  if (input.file.size > MAX_ATTACHMENT_BYTES) {
    throw new AppError("ไฟล์ใหญ่เกิน 12MB", 400);
  }

  const data = new Uint8Array(await input.file.arrayBuffer());
  const attachment = await createAttachment({
    userId: input.userId,
    conversationId: input.conversationId,
    fileName: input.file.name,
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    data
  });

  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt.toISOString()
  };
}

export async function createManualLabDraft(input: {
  userId: string;
  conversationId?: string | null;
  measuredAt?: string | null;
  fastingStatus?: string | null;
  ocrText?: string | null;
  results: LabResultDraftInput[];
}) {
  const report = await createLabReportDraft({
    userId: input.userId,
    conversationId: input.conversationId,
    measuredAt: parseDate(input.measuredAt),
    fastingStatus: input.fastingStatus,
    ocrText: input.ocrText,
    extractionRawJson: {
      provider: "manual_entry"
    },
    results: input.results.map(normalizeResult)
  });

  return serializeLabReportDraft(report);
}

export async function extractLabDraft(input: {
  userId: string;
  attachmentId: string;
  conversationId?: string | null;
}) {
  const attachment = await getUserAttachment(input.userId, input.attachmentId);

  if (!attachment) {
    throw new AppError("Attachment not found", 404);
  }

  const extraction = await extractLabReportFromAttachment({
    userId: input.userId,
    attachmentId: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    data: Buffer.from(attachment.data)
  });

  const fallbackText =
    attachment.mimeType === "text/plain" ? Buffer.from(attachment.data).toString("utf8") : "";
  const results = normalizeExtractedResults(extraction);
  const finalResults = results.length > 0 ? results : extractSimpleTextLabs(fallbackText);
  const ocrText = extraction?.ocrText ?? (fallbackText || null);

  const report = await createLabReportDraft({
    userId: input.userId,
    conversationId: input.conversationId ?? attachment.conversationId,
    sourceAttachmentId: attachment.id,
    measuredAt: parseDate(extraction?.measuredAt),
    fastingStatus: extraction?.fastingStatus ?? null,
    extractionRawJson: extractionRawJson(
      extraction,
      finalResults.length > 0 ? "heuristic_text_parse" : "manual_review_required"
    ),
    ocrText,
    confidence: extraction?.confidence ?? (finalResults.length > 0 ? 0.45 : null),
    results: finalResults
  });

  return serializeLabReportDraft(report);
}

export async function updateLabDraft(input: {
  userId: string;
  labReportId: string;
  measuredAt?: string | null;
  fastingStatus?: string | null;
  ocrText?: string | null;
  results: LabResultDraftInput[];
}) {
  const report = await replaceLabReportDraft({
    userId: input.userId,
    labReportId: input.labReportId,
    measuredAt: parseDate(input.measuredAt),
    fastingStatus: input.fastingStatus,
    ocrText: input.ocrText,
    results: input.results.map(normalizeResult)
  });

  if (!report) {
    throw new AppError("Draft lab report not found", 404);
  }

  return serializeLabReportDraft(report);
}

export async function confirmLabDraftAndAnalyze(input: {
  userId: string;
  labReportId: string;
}) {
  const report = await confirmLabReportDraft({
    userId: input.userId,
    labReportId: input.labReportId
  });

  if (!report) {
    throw new AppError("Draft lab report not found or has no lab results", 404);
  }

  const chatResult = await sendConfirmedLabReportToConversation({
    userId: input.userId,
    conversationId: report.conversationId,
    labReport: report
  });

  await attachSourceMessageToLabReport({
    userId: input.userId,
    labReportId: report.id,
    sourceMessageId: chatResult.sourceMessageId,
    conversationId: chatResult.conversation.id
  });

  return {
    labReport: serializeLabReportDraft(report),
    conversation: chatResult.conversation,
    messages: chatResult.messages
  };
}
