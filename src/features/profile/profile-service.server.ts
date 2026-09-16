import { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors";
import type { HealthMetric, PatientProfileForm } from "@/features/profile/profile.types";
import {
  completedHealthMetrics,
  defaultHealthMetrics,
  hasPatientProfileErrors,
  validatePatientProfile
} from "@/features/profile/profile-rules";
import { acceptMetricValue, findMetricDefinition } from "@/features/profile/metric-catalog";
import {
  getPatientProfile,
  updatePatientProfileMetrics,
  upsertPatientProfile
} from "@/server/repositories/patient-profile.repository";

function calculateAge(birthDate?: Date | null) {
  if (!birthDate) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

function birthDateFromAge(age?: number | null) {
  if (age === undefined || age === null) {
    return null;
  }

  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - age, 0, 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function stringArrayFromJson(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function metricsFromJson(value: Prisma.JsonValue | null): HealthMetric[] {
  if (!Array.isArray(value)) {
    return defaultHealthMetrics;
  }

  const savedMetrics: HealthMetric[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const metric: HealthMetric = {
      id: typeof record.id === "string" ? record.id : undefined,
      label: typeof record.label === "string" ? record.label : "",
      value: typeof record.value === "string" ? record.value : "",
      unit: typeof record.unit === "string" ? record.unit : null
    };

    if (metric.label.length > 0) {
      savedMetrics.push(metric);
    }
  }

  const merged = [...defaultHealthMetrics];
  for (const metric of savedMetrics) {
    const canonicalId = metric.id ? findMetricDefinition(metric.id)?.id : undefined;
    const index = canonicalId ? merged.findIndex((item) => item.id === canonicalId) : -1;
    if (index >= 0) {
      // Only the value is owned by storage; the catalog owns label and unit, so
      // renaming a field shows up immediately on profiles saved before the rename.
      merged[index] = { ...merged[index], value: metric.value };
    }
  }

  return merged;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function serializeProfile(profile: Awaited<ReturnType<typeof getPatientProfile>>): PatientProfileForm {
  return {
    sex: profile?.sex ?? null,
    age: calculateAge(profile?.birthDate),
    underlyingDiseases: stringArrayFromJson(profile?.underlyingDiseases ?? null),
    currentMedications: stringArrayFromJson(profile?.currentMedications ?? null),
    healthMetrics: metricsFromJson(profile?.healthMetrics ?? null)
  };
}

export async function getPatientProfileForUser(userId: string) {
  const profile = await getPatientProfile(userId);
  return serializeProfile(profile);
}

export function patientProfileToHealthState(profile: PatientProfileForm): Partial<{
  age: number;
  gender: string;
  underlying_disease: string[];
  current_medications: string[];
  extracted_lab_values: Record<string, number>;
  profile_metrics: Array<{
    label: string;
    value: string;
    unit?: string | null;
  }>;
}> {
  const labValues: Record<string, number> = {};
  const completedMetrics = completedHealthMetrics(profile.healthMetrics);

  for (const metric of completedMetrics) {
    const numericValue = Number(metric.value);
    if (Number.isFinite(numericValue)) {
      // Key by catalog id — the agent matches on canonical names like "SBP", not Thai labels.
      labValues[metric.id ?? metric.label] = numericValue;
    }
  }

  return {
    ...(profile.age !== null && profile.age !== undefined ? { age: profile.age } : {}),
    ...(profile.sex ? { gender: profile.sex } : {}),
    underlying_disease: profile.underlyingDiseases,
    current_medications: profile.currentMedications,
    extracted_lab_values: labValues,
    profile_metrics: completedMetrics.map((metric) => ({
      label: metric.label,
      value: metric.value,
      unit: metric.unit
    }))
  };
}

/**
 * Writes values the chat agent reported back onto the stored profile.
 * Only ids present in `values` are touched, so a chat that mentions two labs
 * never clears the rest of the page.
 */
export async function mergeAgentMetricsIntoProfile(
  userId: string,
  values: Record<string, unknown>
) {
  const profile = await getPatientProfileForUser(userId);
  const metricsById = new Map<string | undefined, HealthMetric>(
    completedHealthMetrics(profile.healthMetrics).map((metric) => [metric.id, metric])
  );

  let changed = false;

  for (const [rawId, rawValue] of Object.entries(values)) {
    const accepted = acceptMetricValue(rawId, rawValue);
    if (!accepted || metricsById.get(accepted.id)?.value === accepted.value) {
      continue;
    }

    metricsById.set(accepted.id, accepted);
    changed = true;
  }

  if (!changed) {
    return;
  }

  await updatePatientProfileMetrics(userId, toPrismaJson([...metricsById.values()]));
}

export async function updatePatientProfileForUser(
  userId: string,
  input: PatientProfileForm
) {
  const validationErrors = validatePatientProfile(input);

  if (hasPatientProfileErrors(validationErrors)) {
    throw new AppError("กรุณาตรวจข้อมูลสุขภาพให้ครบก่อนบันทึก", 400);
  }

  const profile = await upsertPatientProfile({
    userId,
    sex: input.sex?.trim() || null,
    birthDate: birthDateFromAge(input.age),
    underlyingDiseases: toPrismaJson(input.underlyingDiseases),
    currentMedications: toPrismaJson(input.currentMedications),
    healthMetrics: toPrismaJson(completedHealthMetrics(input.healthMetrics))
  });

  return serializeProfile(profile);
}
