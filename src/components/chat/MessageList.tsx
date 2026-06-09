"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import type { ChatMessage } from "@/features/chat/chat.types";

import styles from "./MessageList.module.css";

export function MessageList({
  messages,
  isSending
}: {
  messages: ChatMessage[];
  isSending: boolean;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  if (messages.length === 0) {
    return (
      <div className={styles.list}>
        <div className={styles.empty}>
          <div>
            <h2>เริ่มคุยเรื่องผลตรวจสุขภาพได้เลย</h2>
            <p>เช่น LDL, HbA1c, ความดัน, ค่าไต หรือคำถามสุขภาพเบื้องต้น</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {messages.map((message, index) => (
        <MessageBubble key={message.id ?? `${message.role}-${index}`} message={message} />
      ))}
      {isSending ? (
        <MessageBubble message={{ role: "assistant", content: "กำลังประมวลผล..." }} />
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
