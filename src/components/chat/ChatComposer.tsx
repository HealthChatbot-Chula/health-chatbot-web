"use client";

import { HeartPulse, Send } from "lucide-react";
import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useState } from "react";

import styles from "./ChatComposer.module.css";

export function ChatComposer({
  disabled,
  onSend,
  onHealthProfileOpen
}: {
  disabled: boolean;
  onSend: (message: string) => Promise<void>;
  onHealthProfileOpen: () => void;
}) {
  const [message, setMessage] = useState("");

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

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <button
        aria-label="แก้ไขข้อมูลสุขภาพ"
        className={styles.profileButton}
        disabled={disabled}
        onClick={onHealthProfileOpen}
        title="แก้ไขข้อมูลสุขภาพ"
        type="button"
      >
        <HeartPulse size={19} aria-hidden="true" />
      </button>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="พิมพ์คำถามสุขภาพของคุณ..."
        disabled={disabled}
      />
      <button className={styles.sendButton} type="submit" disabled={disabled || !message.trim()} title="ส่งข้อความ">
        <Send size={19} aria-hidden="true" />
      </button>
    </form>
  );
}
