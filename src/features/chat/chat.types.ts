export type ChatRole = "user" | "assistant" | "system";

export type QuickReplyOption = {
  label: string;
  value: string;
};

export type HealthState = {
  age?: number;
  gender?: "male" | "female" | string;
  underlying_disease?: string[];
  current_medications?: string[];
  current_symptoms?: string[];
  fasting_status?: "yes" | "no" | string;
  extracted_lab_values?: Record<string, number>;
  pending_slot?: string | null;
  summary?: string;
  [key: string]: unknown;
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
