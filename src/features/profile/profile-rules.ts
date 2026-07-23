import type { HealthMetric, PatientProfileForm } from "@/features/profile/profile.types";

export const defaultHealthMetrics: HealthMetric[] = [
  { id: "ldl", label: "LDL", value: "", unit: "mg/dL" },
  { id: "bp_systolic", label: "ความดันตัวบน", value: "", unit: "mmHg" },
  { id: "bp_diastolic", label: "ความดันตัวล่าง", value: "", unit: "mmHg" }
];

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

export function emptyHealthMetric(): HealthMetric {
  return {
    label: "",
    value: "",
    unit: ""
  };
}

export function isHealthMetricEmpty(metric: HealthMetric) {
  return (
    metric.label.trim().length === 0 &&
    metric.value.trim().length === 0 &&
    (!metric.unit || metric.unit.trim().length === 0)
  );
}

export function validatePatientProfile(profile: PatientProfileForm): PatientProfileFieldErrors {
  const errors: PatientProfileFieldErrors = { metrics: {} };

  if (!profile.sex) {
    errors.sex = "กรุณาเลือกเพศ";
  }

  if (profile.age === null || profile.age === undefined || Number.isNaN(profile.age)) {
    errors.age = "กรุณากรอกอายุ";
  } else if (profile.age < 0 || profile.age > 130) {
    errors.age = "อายุต้องอยู่ระหว่าง 0-130";
  }

  for (const [index, metric] of profile.healthMetrics.entries()) {
    if (isHealthMetricEmpty(metric)) {
      continue;
    }

    if (!metric.label.trim()) {
      errors.metrics[index] = {
        ...errors.metrics[index],
        label: "กรุณากรอกชื่อค่า"
      };
    }

    if (!metric.value.trim()) {
      errors.metrics[index] = {
        ...errors.metrics[index],
        value: "กรุณากรอกค่า"
      };
    }
  }

  const systolicIndex = profile.healthMetrics.findIndex((metric) => metric.id === "bp_systolic");
  const diastolicIndex = profile.healthMetrics.findIndex((metric) => metric.id === "bp_diastolic");
  const hasSystolic =
    systolicIndex >= 0 && profile.healthMetrics[systolicIndex]?.value.trim().length > 0;
  const hasDiastolic =
    diastolicIndex >= 0 && profile.healthMetrics[diastolicIndex]?.value.trim().length > 0;

  if (hasSystolic !== hasDiastolic) {
    if (!hasSystolic && systolicIndex >= 0) {
      errors.metrics[systolicIndex] = {
        ...errors.metrics[systolicIndex],
        value: "กรอกความดันตัวบนด้วย"
      };
    }

    if (!hasDiastolic && diastolicIndex >= 0) {
      errors.metrics[diastolicIndex] = {
        ...errors.metrics[diastolicIndex],
        value: "กรอกความดันตัวล่างด้วย"
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
