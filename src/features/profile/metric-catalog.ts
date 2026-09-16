import type { HealthMetric } from "@/features/profile/profile.types";

export type MetricGroup = "vitals" | "glycemic" | "lipid" | "kidney" | "liver";

export type MetricDefinition = {
  /** Must match the canonical name the Python agent emits in extracted_lab_values. */
  id: string;
  label: string;
  unit: string | null;
  group: MetricGroup;
  /** Plausible-range guard, not a clinical reference range. */
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
  { id: "SBP", label: "ความดันตัวบน (SBP)", unit: "มม.ปรอท", group: "vitals", min: 50, max: 260 },
  { id: "DBP", label: "ความดันตัวล่าง (DBP)", unit: "มม.ปรอท", group: "vitals", min: 30, max: 180 },
  { id: "HeartRate", label: "ชีพจร (Heart Rate)", unit: "ครั้ง/นาที", group: "vitals", min: 25, max: 220 },
  { id: "Weight", label: "น้ำหนัก (Weight)", unit: "กก.", group: "vitals", min: 10, max: 400 },
  { id: "Height", label: "ส่วนสูง (Height)", unit: "ซม.", group: "vitals", min: 50, max: 250 },
  { id: "BMI", label: "ดัชนีมวลกาย (BMI)", unit: "กก./ม.²", group: "vitals", min: 8, max: 100 },
  { id: "WaistCircumference", label: "รอบเอว (Waist)", unit: "ซม.", group: "vitals", min: 30, max: 250 },

  { id: "FBS", label: "น้ำตาลในเลือดขณะอดอาหาร (FPG)", unit: "มก./ดล.", group: "glycemic", min: 20, max: 900 },
  { id: "Glucose", label: "น้ำตาลในเลือด (Glucose)", unit: "มก./ดล.", group: "glycemic", min: 20, max: 900 },
  { id: "2-hr PG", label: "น้ำตาลในเลือดที่ 2 ชั่วโมง (2-hr PG)", unit: "มก./ดล.", group: "glycemic", min: 20, max: 900 },
  { id: "HbA1c", label: "น้ำตาลสะสม (HbA1c)", unit: "%", group: "glycemic", min: 3, max: 20 },
  { id: "Ketone", label: "คีโตนในเลือด (Ketone)", unit: "มิลลิโมล/ล.", group: "glycemic", min: 0, max: 30 },

  { id: "Total Cholesterol", label: "คอเลสเตอรอลรวม (Total Cholesterol)", unit: "มก./ดล.", group: "lipid", min: 50, max: 600 },
  { id: "LDL", label: "แอล ดี แอล คอเลสเตอรอล (LDL-C)", unit: "มก./ดล.", group: "lipid", min: 10, max: 500 },
  { id: "HDL", label: "เอช ดี แอล คอเลสเตอรอล (HDL-C)", unit: "มก./ดล.", group: "lipid", min: 5, max: 150 },
  { id: "non-HDL", label: "นอน-เอช ดี แอล คอเลสเตอรอล (non-HDL-C)", unit: "มก./ดล.", group: "lipid", min: 10, max: 550 },
  { id: "Triglycerides", label: "ไตรกลีเซอไรด์ (Triglycerides)", unit: "มก./ดล.", group: "lipid", min: 20, max: 2000 },

  { id: "eGFR", label: "อัตราการกรองของไต (eGFR)", unit: "มล./นาที/1.73 ม.²", group: "kidney", min: 1, max: 200 },
  { id: "Creatinine", label: "ครีแอตินีน (Creatinine)", unit: "มก./ดล.", group: "kidney", min: 0.1, max: 25 },
  { id: "BUN", label: "ยูเรียไนโตรเจนในเลือด (BUN)", unit: "มก./ดล.", group: "kidney", min: 1, max: 200 },
  { id: "UACR", label: "อัลบูมินต่อครีแอตินีน (UACR)", unit: "มก./ก.", group: "kidney", min: 0, max: 10000 },
  { id: "Potassium", label: "โพแทสเซียม (Potassium)", unit: "มิลลิโมล/ล.", group: "kidney", min: 1, max: 10 },
  { id: "Calcium", label: "แคลเซียม (Calcium)", unit: "มก./ดล.", group: "kidney", min: 3, max: 20 },
  { id: "Phosphate", label: "ฟอสเฟต (Phosphate)", unit: "มก./ดล.", group: "kidney", min: 0.5, max: 15 },
  { id: "Hemoglobin", label: "ฮีโมโกลบิน (Hemoglobin)", unit: "ก./ดล.", group: "kidney", min: 3, max: 25 },

  { id: "AST", label: "เอนไซม์ตับ (AST)", unit: "ยูนิต/ล.", group: "liver", min: 1, max: 5000 },
  { id: "ALT", label: "เอนไซม์ตับ (ALT)", unit: "ยูนิต/ล.", group: "liver", min: 1, max: 5000 }
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
 * Returns null for unknown ids, non-numbers, and physiologically impossible
 * readings, so a model slip cannot overwrite a real measurement.
 */
export function acceptMetricValue(id: string, raw: unknown): HealthMetric | null {
  const definition = catalogById.get(id);
  if (!definition) {
    return null;
  }

  if (typeof raw !== "number" && typeof raw !== "string") {
    return null;
  }

  const value = Number(raw);
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
