"use client";

import { Send } from "lucide-react";
import { FormEvent, KeyboardEvent, useState } from "react";

import buttonStyles from "@/components/ui/Button.module.css";

import styles from "./ChatComposer.module.css";

export function ChatComposer({
  disabled,
  onSend
}: {
  disabled: boolean;
  onSend: (message: string) => Promise<void>;
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

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
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
