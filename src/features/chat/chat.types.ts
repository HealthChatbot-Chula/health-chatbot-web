export type ChatRole = "user" | "assistant" | "system";

export type QuickReplyOption = {
  label: string;
  value: string;
};

export type ChatMessage = {
  id?: string;
  role: ChatRole;
  content: string;
  createdAt?: string | Date;
  quickReplies?: QuickReplyOption[];
};

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
};
