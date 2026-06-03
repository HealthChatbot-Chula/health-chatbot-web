"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import type { ChatMessage } from "@/features/chat/chat.types";

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
      <div className="message-list">
        <div className="empty-chat">
          <div>
            <h2>เริ่มคุยเรื่องผลตรวจสุขภาพได้เลย</h2>
            <p>เช่น LDL, HbA1c, ความดัน, ค่าไต หรือคำถามสุขภาพเบื้องต้น</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <MessageBubble key={message.id ?? `${message.role}-${index}`} message={message} />
      ))}
      {isSending ? (
        <div className="message-row assistant">
          <div className="message-bubble">กำลังประมวลผล...</div>
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
