"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import buttonStyles from "@/components/ui/Button.module.css";
import type { LabReportDraft, LabResultDraft } from "@/features/labs/lab.types";

import styles from "./LabReportReview.module.css";

type Props = {
  report: LabReportDraft;
  isBusy: boolean;
  onCancel: () => void;
  onSave: (report: LabReportDraft) => Promise<LabReportDraft>;
  onConfirm: (report: LabReportDraft) => Promise<void>;
};

function emptyResult(): LabResultDraft {
  return {
    name: "",
    value: 0,
    unit: "",
    referenceRange: "",
    flag: "",
    confidence: null
  };
}

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function fromDateInput(value: string) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export function LabReportReview({ report, isBusy, onCancel, onSave, onConfirm }: Props) {
  const [draft, setDraft] = useState(report);
  const [localError, setLocalError] = useState<string | null>(null);

  function updateResult(index: number, patch: Partial<LabResultDraft>) {
    setDraft((current) => ({
      ...current,
      results: current.results.map((result, resultIndex) =>
        resultIndex === index ? { ...result, ...patch } : result
      )
    }));
  }

  function removeResult(index: number) {
    setDraft((current) => ({
      ...current,
      results: current.results.filter((_, resultIndex) => resultIndex !== index)
    }));
  }

  function addResult() {
    setDraft((current) => ({
      ...current,
      results: [...current.results, emptyResult()]
    }));
  }

  async function save() {
    setLocalError(null);
    try {
      const saved = await onSave(draft);
      setDraft(saved);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "บันทึก draft ไม่สำเร็จ");
    }
  }

  async function confirm() {
    setLocalError(null);
    const cleaned = {
      ...draft,
      results: draft.results.filter((result) => result.name.trim().length > 0)
    };

    if (cleaned.results.length === 0) {
      setLocalError("เพิ่มค่าแลปอย่างน้อย 1 รายการก่อนยืนยัน");
      return;
    }

    try {
      const saved = await onSave(cleaned);
      await onConfirm(saved);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "ยืนยันผลตรวจไม่สำเร็จ");
    }
  }

  return (
    <section className={styles.review} aria-label="Review lab report">
      <div className={styles.header}>
        <div>
          <h2>ตรวจทานผลแลป</h2>
          <p>ค่าเหล่านี้ยังเป็น draft จนกว่าจะกดยืนยัน</p>
        </div>
        <button
          aria-label="Close lab review"
          className={styles.closeButton}
          disabled={isBusy}
          onClick={onCancel}
          title="Close"
          type="button"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.metaGrid}>
        <label>
          วันที่ตรวจ
          <input
            type="date"
            value={toDateInput(draft.measuredAt)}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                measuredAt: fromDateInput(event.target.value)
              }))
            }
            disabled={isBusy}
          />
        </label>
        <label>
          การงดอาหาร
          <select
            value={draft.fastingStatus ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                fastingStatus: event.target.value || null
              }))
            }
            disabled={isBusy}
          >
            <option value="">ไม่ระบุ</option>
            <option value="fasting">งดอาหาร</option>
            <option value="non_fasting">ไม่ได้งดอาหาร</option>
          </select>
        </label>
      </div>

      {draft.ocrText ? (
        <details className={styles.ocrBlock}>
          <summary>ข้อความที่อ่านได้จากไฟล์</summary>
          <textarea
            value={draft.ocrText}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                ocrText: event.target.value
              }))
            }
            disabled={isBusy}
          />
        </details>
      ) : null}

      <div className={styles.resultList}>
        {draft.results.map((result, index) => (
          <article className={styles.resultCard} key={result.id ?? index}>
            <div className={styles.cardTop}>
              <strong>รายการที่ {index + 1}</strong>
              <button
                aria-label="Remove lab result"
                className={styles.iconButton}
                disabled={isBusy}
                onClick={() => removeResult(index)}
                title="Remove"
                type="button"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.resultGrid}>
              <label>
                ชื่อค่าแลป
                <input
                  value={result.name}
                  onChange={(event) => updateResult(index, { name: event.target.value })}
                  disabled={isBusy}
                  placeholder="เช่น LDL, HbA1c"
                />
              </label>
              <label>
                ค่า
                <input
                  type="number"
                  step="any"
                  value={result.value}
                  onChange={(event) => updateResult(index, { value: Number(event.target.value) })}
                  disabled={isBusy}
                />
              </label>
              <label>
                หน่วย
                <input
                  value={result.unit ?? ""}
                  onChange={(event) => updateResult(index, { unit: event.target.value })}
                  disabled={isBusy}
                  placeholder="mg/dL"
                />
              </label>
              <label>
                Reference
                <input
                  value={result.referenceRange ?? ""}
                  onChange={(event) => updateResult(index, { referenceRange: event.target.value })}
                  disabled={isBusy}
                  placeholder="เช่น 70-130"
                />
              </label>
              <label>
                Flag
                <input
                  value={result.flag ?? ""}
                  onChange={(event) => updateResult(index, { flag: event.target.value })}
                  disabled={isBusy}
                  placeholder="H, L, normal"
                />
              </label>
              <label>
                Confidence
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={result.confidence ?? ""}
                  onChange={(event) =>
                    updateResult(index, {
                      confidence: event.target.value ? Number(event.target.value) : null
                    })
                  }
                  disabled={isBusy}
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          className={`${buttonStyles.button} ${buttonStyles.secondary}`}
          disabled={isBusy}
          onClick={addResult}
          type="button"
        >
          <Plus size={16} aria-hidden="true" />
          เพิ่มค่า
        </button>
        <button
          className={`${buttonStyles.button} ${buttonStyles.secondary}`}
          disabled={isBusy}
          onClick={() => void save()}
          type="button"
        >
          บันทึก draft
        </button>
        <button
          className={buttonStyles.button}
          disabled={isBusy}
          onClick={() => void confirm()}
          type="button"
        >
          ยืนยันและให้วิเคราะห์
        </button>
      </div>

      {localError ? <p className={styles.errorText}>{localError}</p> : null}
    </section>
  );
}
