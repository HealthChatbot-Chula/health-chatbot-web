"use client";

import type { ChatMessage, QuickReplyOption } from "@/features/chat/chat.types";

import styles from "./QuickReplyChoices.module.css";

type QuickReplySet = {
  id: string;
  options: QuickReplyOption[];
};

const genderChoices: QuickReplyOption[] = [
  { label: "ชาย", value: "ชาย" },
  { label: "หญิง", value: "หญิง" }
];

const fastingChoices: QuickReplyOption[] = [
  { label: "ใช่", value: "ใช่" },
  { label: "ไม่ใช่", value: "ไม่ใช่" }
];

function latestAssistantMessage(messages: ChatMessage[]) {
  const latest = messages.at(-1);
  return latest?.role === "assistant" ? latest : null;
}

export function getQuickReplySet(messages: ChatMessage[]): QuickReplySet | null {
  const latest = latestAssistantMessage(messages);

  if (!latest) {
    return null;
  }

  if (latest.quickReplies?.length) {
    return {
      id: latest.id ?? "backend",
      options: latest.quickReplies
    };
  }

  const content = latest.content;
  const compactContent = content.replace(/\s+/g, " ").trim();

  if (
    compactContent.includes("เพศของผู้ที่เป็นเจ้าของผลตรวจ") &&
    compactContent.includes("ชายหรือหญิง")
  ) {
    return {
      id: "gender",
      options: genderChoices
    };
  }

  if (
    compactContent.includes("ตรวจหลังงดอาหารหรือไม่") &&
    compactContent.includes("กรุณาตอบว่าใช่หรือไม่ใช่")
  ) {
    return {
      id: "fasting",
      options: fastingChoices
    };
  }

  return null;
}

export function QuickReplyChoices({
  choices,
  disabled,
  onSelect
}: {
  choices: QuickReplySet;
  disabled: boolean;
  onSelect: (value: string) => Promise<void>;
}) {
  return (
    <div className={styles.choices}>
      {choices.options.map((option) => (
        <button
          className={styles.choice}
          disabled={disabled}
          key={`${choices.id}-${option.value}`}
          onClick={() => {
            void onSelect(option.value);
          }}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
