export type LabReportStatus = "draft" | "confirmed";

export type LabResultDraft = {
  id?: string;
  name: string;
  value: number;
  unit?: string | null;
  referenceRange?: string | null;
  flag?: string | null;
  confidence?: number | null;
};

export type LabReportDraft = {
  id: string;
  status: LabReportStatus;
  conversationId?: string | null;
  sourceAttachmentId?: string | null;
  measuredAt?: string | null;
  reportedAt: string;
  fastingStatus?: string | null;
  ocrText?: string | null;
  confidence?: number | null;
  results: LabResultDraft[];
};
