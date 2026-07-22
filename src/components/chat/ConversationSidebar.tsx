"use client";

import { PanelLeftClose } from "lucide-react";

import type { ConversationSummary } from "@/features/chat/chat.types";

import styles from "./ConversationSidebar.module.css";

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCloseSidebar
}: {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onCloseSidebar: () => void;
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        <button
          aria-label="Hide conversations"
          className={styles.iconButton}
          type="button"
          onClick={onCloseSidebar}
          title="Hide conversations"
        >
          <PanelLeftClose size={18} aria-hidden="true" />
        </button>
        <strong>Chat</strong>
      </div>
      <div className={styles.list}>
        {conversations.map((conversation) => (
          <button
            className={`${styles.item} ${
              activeConversationId === conversation.id ? styles.active : ""
            }`}
            key={conversation.id}
            type="button"
            onClick={() => onSelectConversation(conversation.id)}
          >
            <span>{conversation.title}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
