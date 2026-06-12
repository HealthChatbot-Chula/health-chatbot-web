"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { getQuickReplySet, QuickReplyChoices } from "@/components/chat/QuickReplyChoices";
import type { ChatMessage } from "@/features/chat/chat.types";

import styles from "./MessageList.module.css";

export function MessageList({
  messages,
  isSending,
  onQuickReply
}: {
  messages: ChatMessage[];
  isSending: boolean;
  onQuickReply: (value: string) => Promise<void>;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const quickReplies = isSending ? null : getQuickReplySet(messages);

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
      {quickReplies ? (
        <QuickReplyChoices choices={quickReplies} disabled={isSending} onSelect={onQuickReply} />
      ) : null}
      {isSending ? (
        <MessageBubble message={{ role: "assistant", content: "กำลังประมวลผล..." }} />
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
