import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().optional().nullable(),
  message: z.string().trim().min(1).max(8000)
});

export const labResultDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  value: z.coerce.number().finite(),
  unit: z.string().trim().max(40).optional().nullable(),
  referenceRange: z.string().trim().max(120).optional().nullable(),
  flag: z.string().trim().max(40).optional().nullable(),
  confidence: z.coerce.number().min(0).max(1).optional().nullable()
});

export const extractLabReportDraftSchema = z.object({
  attachmentId: z.string().min(1),
  conversationId: z.string().optional().nullable()
});

export const updateLabReportDraftSchema = z.object({
  measuredAt: z.string().datetime().optional().nullable(),
  fastingStatus: z.string().trim().max(40).optional().nullable(),
  ocrText: z.string().max(30000).optional().nullable(),
  results: z.array(labResultDraftSchema).max(200)
});

export const createManualLabReportDraftSchema = updateLabReportDraftSchema.extend({
  conversationId: z.string().optional().nullable()
});

export const healthMetricSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(80),
  unit: z.string().trim().max(40).optional().nullable()
});

export const updatePatientProfileSchema = z.object({
  sex: z.string().trim().max(40).optional().nullable(),
  age: z.coerce.number().int().min(0).max(130).optional().nullable(),
  underlyingDiseases: z.array(z.string().trim().min(1).max(120)).max(50),
  currentMedications: z.array(z.string().trim().min(1).max(120)).max(50),
  healthMetrics: z.array(healthMetricSchema).max(100)
});
