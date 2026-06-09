"use client";

import { PanelLeftClose, SquarePen } from "lucide-react";

import type { ConversationSummary } from "@/features/chat/chat.types";

import styles from "./ConversationSidebar.module.css";

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onCloseSidebar
}: {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
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
        <strong>Conversations</strong>
        <button
          aria-label="New chat"
          className={styles.iconButton}
          type="button"
          onClick={onNewConversation}
          title="New chat"
        >
          <SquarePen size={18} aria-hidden="true" />
        </button>
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
