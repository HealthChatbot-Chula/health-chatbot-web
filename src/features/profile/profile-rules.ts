import { catalogMetrics, findMetricDefinition } from "@/features/profile/metric-catalog";
import type { HealthMetric, PatientProfileForm } from "@/features/profile/profile.types";

export const defaultHealthMetrics: HealthMetric[] = catalogMetrics();

export const emptyPatientProfile: PatientProfileForm = {
  sex: "",
  age: null,
  underlyingDiseases: [],
  currentMedications: [],
  healthMetrics: defaultHealthMetrics
};

export type PatientProfileFieldErrors = {
  sex?: string;
  age?: string;
  metrics: Record<number, Partial<Record<"label" | "value" | "unit", string>>>;
};

export function isHealthMetricEmpty(metric: HealthMetric) {
  return metric.value.trim().length === 0;
}

/** Shared by the manual form's onChange handler and the chat-write path, so BMI is derived the same way regardless of who last touched Weight/Height. */
export function calculateBmi(weightKg: number, heightCm: number): string {
  if (!(weightKg > 0) || !(heightCm > 0)) {
    return "";
  }
  return (weightKg / (heightCm / 100) ** 2).toFixed(1);
}

export function validatePatientProfile(profile: PatientProfileForm): PatientProfileFieldErrors {
  const errors: PatientProfileFieldErrors = { metrics: {} };

  if (!profile.sex) {
    errors.sex = "กรุณาเลือกเพศ";
  }

  if (profile.age === null || profile.age === undefined || Number.isNaN(profile.age)) {
    errors.age = "กรุณาระบุอายุ";
  } else if (profile.age < 0 || profile.age > 130) {
    errors.age = "กรุณาระบุอายุระหว่าง 0–130 ปี";
  }

  for (const [index, metric] of profile.healthMetrics.entries()) {
    if (isHealthMetricEmpty(metric)) {
      continue;
    }

    const numericValue = Number(metric.value.trim());

    if (!Number.isFinite(numericValue)) {
      errors.metrics[index] = {
        ...errors.metrics[index],
        value: "กรุณาระบุค่าเป็นตัวเลข"
      };
      continue;
    }

    const definition = metric.id ? findMetricDefinition(metric.id) : undefined;

    if (definition && (numericValue < definition.min || numericValue > definition.max)) {
      errors.metrics[index] = {
        ...errors.metrics[index],
        value: `กรุณาระบุค่าระหว่าง ${definition.min}–${definition.max}`
      };
    }
  }

  const systolicIndex = profile.healthMetrics.findIndex((metric) => metric.id === "SBP");
  const diastolicIndex = profile.healthMetrics.findIndex((metric) => metric.id === "DBP");
  const hasSystolic =
    systolicIndex >= 0 && profile.healthMetrics[systolicIndex]?.value.trim().length > 0;
  const hasDiastolic =
    diastolicIndex >= 0 && profile.healthMetrics[diastolicIndex]?.value.trim().length > 0;

  if (hasSystolic !== hasDiastolic) {
    if (!hasSystolic && systolicIndex >= 0) {
      errors.metrics[systolicIndex] = {
        ...errors.metrics[systolicIndex],
        value: "กรุณาระบุค่าความดันตัวบน"
      };
    }

    if (!hasDiastolic && diastolicIndex >= 0) {
      errors.metrics[diastolicIndex] = {
        ...errors.metrics[diastolicIndex],
        value: "กรุณาระบุค่าความดันตัวล่าง"
      };
    }
  }

  return errors;
}

export function hasPatientProfileErrors(errors: PatientProfileFieldErrors) {
  return Boolean(
    errors.sex ||
      errors.age ||
      Object.values(errors.metrics).some((metricErrors) =>
        Object.values(metricErrors).some(Boolean)
      )
  );
}

export function completedHealthMetrics(metrics: HealthMetric[]) {
  return metrics
    .filter((metric) => !isHealthMetricEmpty(metric))
    .map((metric) => ({
      id: metric.id,
      label: metric.label.trim(),
      value: metric.value.trim(),
      unit: metric.unit?.trim() || null
    }));
}
