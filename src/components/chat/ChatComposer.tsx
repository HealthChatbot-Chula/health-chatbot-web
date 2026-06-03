"use client";

import { Send } from "lucide-react";
import { FormEvent, KeyboardEvent, useState } from "react";

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
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="พิมพ์คำถามสุขภาพของคุณ..."
        disabled={disabled}
      />
      <button className="icon-button" type="submit" disabled={disabled || !message.trim()} title="Send">
        <Send size={18} aria-hidden="true" />
      </button>
    </form>
  );
}
