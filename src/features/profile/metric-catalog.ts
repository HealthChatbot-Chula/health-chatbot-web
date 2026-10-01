import type { HealthMetric } from "@/features/profile/profile.types";

export type MetricGroup = "vitals" | "glycemic" | "lipid" | "kidney" | "liver";

export type MetricDefinition = {
  /** Must match the canonical name the Python agent emits in extracted_lab_values. */
  id: string;
  label: string;
  unit: string | null;
  group: MetricGroup;
  /** Storage bounds agreed with the clinician (0–10000, % fields 0–100), not a clinical reference range. */
  min: number;
  max: number;
};

export const metricGroupLabels: Record<MetricGroup, string> = {
  vitals: "สัญญาณชีพและร่างกาย (Vitals)",
  glycemic: "น้ำตาลในเลือด (Glycemic)",
  lipid: "ไขมันในเลือด (Lipid)",
  kidney: "การทำงานของไต (Kidney)",
  liver: "การทำงานของตับ (Liver)"
};

export const metricCatalog: MetricDefinition[] = [
  { id: "SBP", label: "ความดันตัวบน (SBP)", unit: "มม.ปรอท", group: "vitals", min: 0, max: 10000 },
  { id: "DBP", label: "ความดันตัวล่าง (DBP)", unit: "มม.ปรอท", group: "vitals", min: 0, max: 10000 },
  { id: "HeartRate", label: "ชีพจร (Heart Rate)", unit: "ครั้ง/นาที", group: "vitals", min: 0, max: 10000 },
  { id: "Weight", label: "น้ำหนัก (Weight)", unit: "กก.", group: "vitals", min: 0, max: 10000 },
  { id: "Height", label: "ส่วนสูง (Height)", unit: "ซม.", group: "vitals", min: 0, max: 10000 },
  { id: "BMI", label: "ดัชนีมวลกาย (BMI)", unit: "กก./ม.²", group: "vitals", min: 0, max: 10000 },
  { id: "WaistCircumference", label: "รอบเอว (Waist)", unit: "ซม.", group: "vitals", min: 0, max: 10000 },

  { id: "FBS", label: "น้ำตาลในเลือด (FBS)", unit: "มก./ดล.", group: "glycemic", min: 0, max: 10000 },
  { id: "HbA1c", label: "น้ำตาลสะสม (HbA1c)", unit: "%", group: "glycemic", min: 0, max: 100 },

  { id: "Total Cholesterol", label: "คอเลสเตอรอลรวม (Total Cholesterol)", unit: "มก./ดล.", group: "lipid", min: 0, max: 10000 },
  { id: "LDL", label: "แอล ดี แอล คอเลสเตอรอล (LDL-C)", unit: "มก./ดล.", group: "lipid", min: 0, max: 10000 },
  { id: "HDL", label: "เอช ดี แอล คอเลสเตอรอล (HDL-C)", unit: "มก./ดล.", group: "lipid", min: 0, max: 10000 },
  { id: "Triglycerides", label: "ไตรกลีเซอไรด์ (Triglycerides)", unit: "มก./ดล.", group: "lipid", min: 0, max: 10000 },

  { id: "Hemoglobin", label: "ฮีโมโกลบิน (Hemoglobin)", unit: "ก./ดล.", group: "kidney", min: 0, max: 10000 },
  { id: "eGFR", label: "อัตราการกรองของไต (eGFR)", unit: "มล./นาที/1.73 ม.²", group: "kidney", min: 0, max: 10000 },
  { id: "Creatinine", label: "ครีแอตินีน (Creatinine)", unit: "มก./ดล.", group: "kidney", min: 0, max: 10000 },
  { id: "BUN", label: "ยูเรียไนโตรเจนในเลือด (BUN)", unit: "มก./ดล.", group: "kidney", min: 0, max: 10000 },
  { id: "UACR", label: "อัลบูมินต่อครีแอตินีน (UACR)", unit: "มก./ก.", group: "kidney", min: 0, max: 10000 },
  { id: "Potassium", label: "โพแทสเซียม (Potassium)", unit: "มิลลิโมล/ล.", group: "kidney", min: 0, max: 10000 },
  { id: "Calcium", label: "แคลเซียม (Calcium)", unit: "มก./ดล.", group: "kidney", min: 0, max: 10000 },
  { id: "Phosphate", label: "ฟอสเฟต (Phosphate)", unit: "มก./ดล.", group: "kidney", min: 0, max: 10000 },

  { id: "AST", label: "เอนไซม์ตับ (AST)", unit: "ยูนิต/ล.", group: "liver", min: 0, max: 10000 },
  { id: "ALT", label: "เอนไซม์ตับ (ALT)", unit: "ยูนิต/ล.", group: "liver", min: 0, max: 10000 }
];

const catalogById = new Map(metricCatalog.map((metric) => [metric.id, metric]));

/** Ids used by the three hardcoded defaults that preceded this catalog. */
const legacyIds: Record<string, string> = {
  ldl: "LDL",
  bp_systolic: "SBP",
  bp_diastolic: "DBP"
};

export function findMetricDefinition(id: string) {
  return catalogById.get(id) ?? catalogById.get(legacyIds[id] ?? "");
}

/**
 * Guards a value reported by the chat agent before it reaches the profile.
 * Returns null for unknown ids, non-numbers, and values outside the field's
 * bounds, so a model slip cannot overwrite a real measurement. Values are
 * stored with at most two decimal places.
 */
export function acceptMetricValue(id: string, raw: unknown): HealthMetric | null {
  const definition = catalogById.get(id);
  if (!definition) {
    return null;
  }

  // Number("") is 0, which the 0 lower bound would now accept.
  if (typeof raw !== "number" && (typeof raw !== "string" || raw.trim() === "")) {
    return null;
  }

  const value = Math.round(Number(raw) * 100) / 100;
  if (!Number.isFinite(value) || value < definition.min || value > definition.max) {
    return null;
  }

  return {
    id: definition.id,
    label: definition.label,
    value: String(value),
    unit: definition.unit
  };
}

export function catalogMetrics(): HealthMetric[] {
  return metricCatalog.map((metric) => ({
    id: metric.id,
    label: metric.label,
    value: "",
    unit: metric.unit
  }));
}
