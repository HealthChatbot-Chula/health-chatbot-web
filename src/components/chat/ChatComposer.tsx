"use client";

import { FilePlus2, HeartPulse, Send } from "lucide-react";
import { ChangeEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, useRef, useState } from "react";

import buttonStyles from "@/components/ui/Button.module.css";

import styles from "./ChatComposer.module.css";

export function ChatComposer({
  disabled,
  onSend,
  onLabFileSelected,
  onHealthProfileOpen
}: {
  disabled: boolean;
  onSend: (message: string) => Promise<void>;
  onLabFileSelected: (file: File) => Promise<void>;
  onHealthProfileOpen: () => void;
}) {
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed || disabled) {
      return;
    }

    setMessage("");
    await onSend(trimmed);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || disabled) {
      return;
    }

    await onLabFileSelected(file);
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
        onChange={(event) => {
          void handleFileChange(event);
        }}
      />
      <div className={styles.labTools} aria-label="Lab report tools">
        <button
          aria-label="Edit health profile"
          className={`${buttonStyles.iconButton} ${buttonStyles.secondary}`}
          disabled={disabled}
          onClick={onHealthProfileOpen}
          title="Edit health profile"
          type="button"
        >
          <HeartPulse size={18} aria-hidden="true" />
        </button>
        <button
          aria-label="Upload lab report"
          className={`${buttonStyles.iconButton} ${buttonStyles.secondary}`}
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          title="Upload lab report"
          type="button"
        >
          <FilePlus2 size={18} aria-hidden="true" />
        </button>
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="พิมพ์คำถามสุขภาพของคุณ..."
        disabled={disabled}
      />
      <button className={buttonStyles.iconButton} type="submit" disabled={disabled || !message.trim()} title="Send">
        <Send size={18} aria-hidden="true" />
      </button>
    </form>
  );
}
