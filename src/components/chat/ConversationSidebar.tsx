"use client";

import { Plus } from "lucide-react";

import type { ConversationSummary } from "@/features/chat/chat.types";

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation
}: {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}) {
  return (
    <aside className="conversation-sidebar">
      <div className="sidebar-top">
        <strong>Conversations</strong>
        <button className="icon-button secondary" type="button" onClick={onNewConversation} title="New chat">
          <Plus size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="conversation-list">
        {conversations.map((conversation) => (
          <button
            className={`conversation-item ${
              activeConversationId === conversation.id ? "active" : ""
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
