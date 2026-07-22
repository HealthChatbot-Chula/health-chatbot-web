"use client";

import { Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import buttonStyles from "@/components/ui/Button.module.css";
import type { HealthMetric, PatientProfileForm } from "@/features/profile/profile.types";

import styles from "./HealthProfilePanel.module.css";

type Props = {
  isBusy: boolean;
  onClose: () => void;
  onSave: (profile: PatientProfileForm) => Promise<PatientProfileForm>;
};

const emptyProfile: PatientProfileForm = {
  sex: "",
  age: null,
  underlyingDiseases: [],
  currentMedications: [],
  healthMetrics: [
    { id: "ldl", label: "LDL", value: "", unit: "mg/dL" },
    { id: "bp_systolic", label: "ความดันตัวบน", value: "", unit: "mmHg" },
    { id: "bp_diastolic", label: "ความดันตัวล่าง", value: "", unit: "mmHg" }
  ]
};

function emptyMetric(): HealthMetric {
  return {
    label: "",
    value: "",
    unit: ""
  };
}

function toLines(values: string[]) {
  return values.join("\n");
}

function fromLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function HealthProfilePanel({ isBusy, onClose, onSave }: Props) {
  const [profile, setProfile] = useState<PatientProfileForm>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          setProfile(data);
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
  }, []);

  function updateMetric(index: number, patch: Partial<HealthMetric>) {
    setProfile((current) => ({
      ...current,
      healthMetrics: current.healthMetrics.map((metric, metricIndex) =>
        metricIndex === index ? { ...metric, ...patch } : metric
      )
    }));
  }

  function removeMetric(index: number) {
    setProfile((current) => ({
      ...current,
      healthMetrics: current.healthMetrics.filter((_, metricIndex) => metricIndex !== index)
    }));
  }

  async function saveProfile() {
    setError(null);
    setStatus(null);

    try {
      const saved = await onSave(profile);
      setProfile(saved);
      setStatus("บันทึกข้อมูลสุขภาพแล้ว");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกข้อมูลสุขภาพไม่สำเร็จ");
    }
  }

  const disabled = isBusy || isLoading;

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
          <label>
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
          </label>
          <label>
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
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h3>ค่าแลป / ค่าร่างกาย</h3>
        <div className={styles.metricList}>
          {profile.healthMetrics.map((metric, index) => (
            <article className={styles.metricCard} key={metric.id ?? index}>
              <label>
                ชื่อค่า
                <input
                  value={metric.label}
                  onChange={(event) => updateMetric(index, { label: event.target.value })}
                  disabled={disabled}
                  placeholder="เช่น LDL, HbA1c"
                />
              </label>
              <label>
                ค่า
                <input
                  value={metric.value}
                  onChange={(event) => updateMetric(index, { value: event.target.value })}
                  disabled={disabled}
                  placeholder="เช่น 145"
                />
              </label>
              <label>
                หน่วย
                <input
                  value={metric.unit ?? ""}
                  onChange={(event) => updateMetric(index, { unit: event.target.value })}
                  disabled={disabled}
                  placeholder="mg/dL"
                />
              </label>
              <button
                aria-label="Remove metric"
                className={styles.iconButton}
                disabled={disabled}
                onClick={() => removeMetric(index)}
                title="Remove"
                type="button"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
        <button
          className={`${buttonStyles.button} ${buttonStyles.secondary}`}
          disabled={disabled}
          onClick={() =>
            setProfile((current) => ({
              ...current,
              healthMetrics: [...current.healthMetrics, emptyMetric()]
            }))
          }
          type="button"
        >
          <Plus size={16} aria-hidden="true" />
          เพิ่มค่า
        </button>
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

      {status ? <p className={styles.successText}>{status}</p> : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </section>
  );
}
