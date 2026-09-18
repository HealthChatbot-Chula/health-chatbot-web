"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Save, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import buttonStyles from "@/components/ui/Button.module.css";
import {
  findMetricDefinition,
  metricGroupLabels,
  type MetricGroup
} from "@/features/profile/metric-catalog";
import type { HealthMetric, PatientProfileForm } from "@/features/profile/profile.types";
import {
  calculateBmi,
  emptyPatientProfile,
  hasPatientProfileErrors,
  isHealthMetricEmpty,
  type PatientProfileFieldErrors,
  validatePatientProfile
} from "@/features/profile/profile-rules";

import styles from "./HealthProfilePanel.module.css";

type Props = {
  isBusy: boolean;
  seedMetrics?: HealthMetric[];
  onClose: () => void;
  onSave: (profile: PatientProfileForm) => Promise<PatientProfileForm>;
};

function toLines(values: string[]) {
  return values.join("\n");
}

function fromLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeHealthMetrics(currentMetrics: HealthMetric[], seedMetrics: HealthMetric[]) {
  const merged = [...currentMetrics];

  for (const seedMetric of seedMetrics) {
    const matchingIndex = merged.findIndex((metric) => {
      if (seedMetric.id && metric.id === seedMetric.id) {
        return true;
      }

      return metric.label.trim().toLowerCase() === seedMetric.label.trim().toLowerCase();
    });

    if (matchingIndex >= 0) {
      merged[matchingIndex] = {
        ...merged[matchingIndex],
        ...seedMetric
      };
    } else {
      merged.push(seedMetric);
    }
  }

  return merged;
}

export function HealthProfilePanel({ isBusy, seedMetrics = [], onClose, onSave }: Props) {
  const [profile, setProfile] = useState<PatientProfileForm>(emptyPatientProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PatientProfileFieldErrors>({ metrics: {} });
  const [openGroups, setOpenGroups] = useState<MetricGroup[]>(["vitals"]);
  const closeTimerRef = useRef<number | null>(null);

  const groupedMetrics = useMemo(() => {
    const groups = new Map<MetricGroup, Array<{ metric: HealthMetric; index: number }>>();

    for (const [index, metric] of profile.healthMetrics.entries()) {
      const group = (metric.id ? findMetricDefinition(metric.id)?.group : undefined) ?? "vitals";
      const bucket = groups.get(group) ?? [];
      bucket.push({ metric, index });
      groups.set(group, bucket);
    }

    return groups;
  }, [profile.healthMetrics]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/health-profile", { cache: "no-store" });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error?.message ?? "โหลดข้อมูลสุขภาพไม่สำเร็จ");
        }

        const data = (await response.json()) as PatientProfileForm;
        if (isMounted) {
          const healthMetrics =
            seedMetrics.length > 0
              ? mergeHealthMetrics(data.healthMetrics, seedMetrics)
              : data.healthMetrics;

          const filledGroups = new Set<MetricGroup>();
          for (const metric of healthMetrics) {
            if (isHealthMetricEmpty(metric) || !metric.id) {
              continue;
            }
            const group = findMetricDefinition(metric.id)?.group;
            if (group) {
              filledGroups.add(group);
            }
          }

          setProfile({ ...data, healthMetrics });
          setOpenGroups(filledGroups.size > 0 ? [...filledGroups] : ["vitals"]);
          setFieldErrors({ metrics: {} });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลสุขภาพไม่สำเร็จ");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [seedMetrics]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function updateMetric(index: number, patch: Partial<HealthMetric>) {
    setProfile((current) => {
      const healthMetrics = current.healthMetrics.map((metric, metricIndex) =>
        metricIndex === index ? { ...metric, ...patch } : metric
      );

      const changedId = current.healthMetrics[index]?.id;
      if (changedId === "Weight" || changedId === "Height") {
        const bmiIndex = healthMetrics.findIndex((metric) => metric.id === "BMI");
        if (bmiIndex >= 0) {
          const weightKg = Number(healthMetrics.find((metric) => metric.id === "Weight")?.value);
          const heightCm = Number(healthMetrics.find((metric) => metric.id === "Height")?.value);
          healthMetrics[bmiIndex] = {
            ...healthMetrics[bmiIndex],
            value: calculateBmi(weightKg, heightCm)
          };
        }
      }

      return { ...current, healthMetrics };
    });
  }

  function toggleGroup(group: MetricGroup) {
    setOpenGroups((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group]
    );
  }

  async function saveProfile() {
    setError(null);
    setStatus(null);
    const validationErrors = validatePatientProfile(profile);
    setFieldErrors(validationErrors);

    if (hasPatientProfileErrors(validationErrors)) {
      // Invalid rows are useless to the user inside a collapsed group.
      const invalidGroups = Object.keys(validationErrors.metrics)
        .map((index) => profile.healthMetrics[Number(index)]?.id)
        .map((id) => (id ? findMetricDefinition(id)?.group : undefined))
        .filter((group): group is MetricGroup => Boolean(group));

      setOpenGroups((current) => [...new Set([...current, ...invalidGroups])]);
      setError("กรุณาตรวจช่องที่ถูกไฮไลต์สีแดงก่อนบันทึก");
      return;
    }

    try {
      const saved = await onSave(profile);
      setProfile(saved);
      setStatus("บันทึกข้อมูลสุขภาพแล้ว");
      closeTimerRef.current = window.setTimeout(onClose, 1300);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกข้อมูลสุขภาพไม่สำเร็จ");
    }
  }

  const disabled = isBusy || isLoading || Boolean(status);

  return (
    <section className={styles.panel} aria-label="Health profile form">
      <div className={styles.header}>
        <div>
          <h2>ข้อมูลสุขภาพ</h2>
          <p>กรอกหรือแก้ข้อมูลที่ต้องใช้ประกอบการวิเคราะห์</p>
        </div>
        <button
          aria-label="Close health profile"
          className={styles.iconButton}
          disabled={disabled}
          onClick={onClose}
          title="Close"
          type="button"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {isLoading ? <p className={styles.statusText}>กำลังโหลดข้อมูลเดิม...</p> : null}

      <div className={styles.section}>
        <h3>ข้อมูลส่วนตัว</h3>
        <div className={styles.metaGrid}>
          <label className={fieldErrors.sex ? styles.invalidField : ""}>
            เพศ
            <select
              value={profile.sex ?? ""}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  sex: event.target.value || null
                }))
              }
              disabled={disabled}
            >
              <option value="">ไม่ระบุ</option>
              <option value="female">หญิง</option>
              <option value="male">ชาย</option>
              <option value="other">อื่น ๆ</option>
            </select>
            {fieldErrors.sex ? <span>{fieldErrors.sex}</span> : null}
          </label>
          <label className={fieldErrors.age ? styles.invalidField : ""}>
            อายุ
            <input
              type="number"
              min="0"
              max="130"
              value={profile.age ?? ""}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  age: event.target.value ? Number(event.target.value) : null
                }))
              }
              disabled={disabled}
            />
            {fieldErrors.age ? <span>{fieldErrors.age}</span> : null}
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h3>ค่าแลป / ค่าร่างกาย</h3>
        <div className={styles.metricList}>
          {(Object.keys(metricGroupLabels) as MetricGroup[]).map((group) => {
            const entries = groupedMetrics.get(group) ?? [];

            if (entries.length === 0) {
              return null;
            }

            const isOpen = openGroups.includes(group);
            const filledCount = entries.filter(
              ({ metric }) => !isHealthMetricEmpty(metric)
            ).length;

            return (
              <section className={styles.metricGroup} key={group}>
                <button
                  aria-expanded={isOpen}
                  className={styles.groupToggle}
                  onClick={() => toggleGroup(group)}
                  type="button"
                >
                  {isOpen ? (
                    <ChevronDown size={16} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={16} aria-hidden="true" />
                  )}
                  {metricGroupLabels[group]}
                  <span className={styles.groupCount}>
                    {filledCount > 0 ? `${filledCount}/${entries.length} ค่า` : `${entries.length} ค่า`}
                  </span>
                </button>

                {isOpen ? (
                  <div className={styles.groupBody}>
                    {entries.map(({ metric, index }) => (
                      <div className={styles.metricCard} key={metric.id ?? index}>
                        <span className={styles.metricName}>{metric.label}</span>
                        <label className={fieldErrors.metrics[index]?.value ? styles.invalidField : ""}>
                          <input
                            aria-label={metric.label}
                            inputMode="decimal"
                            value={metric.value}
                            onChange={(event) => updateMetric(index, { value: event.target.value })}
                            disabled={disabled || metric.id === "BMI"}
                            className={metric.id === "BMI" ? styles.readOnlyField : ""}
                            placeholder="-"
                          />
                          {fieldErrors.metrics[index]?.value ? (
                            <span>{fieldErrors.metrics[index]?.value}</span>
                          ) : null}
                        </label>
                        <span className={styles.metricUnit}>{metric.unit ?? ""}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      <div className={styles.section}>
        <h3>โรคประจำตัวและยา</h3>
        <div className={styles.textGrid}>
          <label>
            โรคประจำตัว
            <textarea
              value={toLines(profile.underlyingDiseases)}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  underlyingDiseases: fromLines(event.target.value)
                }))
              }
              disabled={disabled}
            />
          </label>
          <label>
            ยาที่ใช้อยู่
            <textarea
              value={toLines(profile.currentMedications)}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  currentMedications: fromLines(event.target.value)
                }))
              }
              disabled={disabled}
            />
          </label>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={`${buttonStyles.button} ${buttonStyles.secondary}`}
          disabled={disabled}
          onClick={onClose}
          type="button"
        >
          ยกเลิก
        </button>
        <button
          className={buttonStyles.button}
          disabled={disabled}
          onClick={() => void saveProfile()}
          type="button"
        >
          <Save size={16} aria-hidden="true" />
          บันทึกข้อมูล
        </button>
      </div>

      {status ? (
        <div className={styles.successOverlay} role="status">
          <div className={styles.successDialog}>
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>{status}</span>
          </div>
        </div>
      ) : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </section>
  );
}
