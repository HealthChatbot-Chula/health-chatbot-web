import { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors";
import {
  getPatientProfileForUser,
  patientProfileToHealthState
} from "@/features/profile/profile-service.server";
import { createHealthChatCompletion } from "@/server/clients/health-backend.client";
import {
  createConversationMessage,
  createUserConversation,
  getConversationHealthState,
  getLatestUserConversation,
  getUserConversation,
  listConversationMessages,
  listUserConversations,
  touchConversation,
  upsertConversationHealthState
} from "@/server/repositories/conversation.repository";
import type { ChatMessage, HealthState, QuickReplyOption } from "@/features/chat/chat.types";

const SINGLE_CHAT_TITLE = "Health chat";

function titleFromMessage(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= 40) {
    return compact || SINGLE_CHAT_TITLE;
  }

  return `${compact.slice(0, 40)}...`;
}

function serializeMessage(message: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  metadata?: unknown;
}): ChatMessage {
  const metadata = message.metadata;
  const quickReplies =
    metadata &&
    typeof metadata === "object" &&
    "quickReplies" in metadata &&
    Array.isArray(metadata.quickReplies)
      ? metadata.quickReplies.filter(isQuickReplyOption)
      : undefined;

  return {
    id: message.id,
    role: message.role as ChatMessage["role"],
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    quickReplies
  };
}

function isQuickReplyOption(value: unknown): value is QuickReplyOption {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.label === "string" &&
    candidate.label.length > 0 &&
    typeof candidate.value === "string" &&
    candidate.value.length > 0
  );
}

function isHealthState(value: unknown): value is HealthState {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPrismaJsonObject(value: HealthState): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function sanitizeHealthState(value: unknown): HealthState {
  if (!isHealthState(value)) {
    return {};
  }

  const state = value as HealthState;
  const sanitized: HealthState = {};
  const assignIfPresent = (key: keyof HealthState) => {
    if (state[key] !== undefined && state[key] !== null) {
      sanitized[key] = state[key];
    }
  };

  assignIfPresent("age");
  assignIfPresent("gender");
  assignIfPresent("underlying_disease");
  assignIfPresent("current_medications");
  assignIfPresent("current_symptoms");
  assignIfPresent("fasting_status");
  assignIfPresent("extracted_lab_values");
  assignIfPresent("profile_metrics");
  assignIfPresent("pending_slot");
  assignIfPresent("summary");

  return sanitized;
}

function mergeHealthState(
  savedHealthState: unknown,
  profileHealthState: ReturnType<typeof patientProfileToHealthState>,
  overrideHealthState?: HealthState
): HealthState {
  return {
    ...sanitizeHealthState(savedHealthState),
    ...profileHealthState,
    ...(overrideHealthState ? sanitizeHealthState(overrideHealthState) : {})
  };
}

function serializeConversationSummary(conversation: {
  id: string;
  title: string;
  updatedAt: Date;
}) {
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString()
  };
}

async function getOrCreateSingleConversation(userId: string, title = SINGLE_CHAT_TITLE) {
  const existingConversation = await getLatestUserConversation(userId);

  if (existingConversation) {
    return {
      conversation: existingConversation,
      isCreated: false
    };
  }

  const createdConversation = await createUserConversation(userId, title);
  const conversation = await getUserConversation(userId, createdConversation.id);

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  return {
    conversation,
    isCreated: true
  };
}

async function persistHealthState(
  conversationId: string,
  healthState: HealthState | undefined
) {
  const sanitizedHealthState = sanitizeHealthState(healthState);

  if (Object.keys(sanitizedHealthState).length === 0) {
    return;
  }

  await upsertConversationHealthState({
    conversationId,
    state: toPrismaJsonObject(sanitizedHealthState),
    pendingSlot:
      typeof sanitizedHealthState.pending_slot === "string"
        ? sanitizedHealthState.pending_slot
        : null,
    summary:
      typeof sanitizedHealthState.summary === "string"
        ? sanitizedHealthState.summary
        : null
  });
}

async function createAssistantReply(input: {
  conversationId: string;
  userId: string;
  replyToMessageId: string;
  healthStateOverride?: HealthState;
}) {
  const history = await listConversationMessages(input.conversationId);
  const savedHealthState = await getConversationHealthState(input.conversationId);
  const profile = await getPatientProfileForUser(input.userId);
  const healthState = mergeHealthState(
    savedHealthState?.state,
    patientProfileToHealthState(profile),
    input.healthStateOverride
  );
  const assistantResult = await createHealthChatCompletion({
    conversationId: input.conversationId,
    userId: input.userId,
    healthState,
    messages: history.map((message) => ({
      id: message.id,
      role: message.role as ChatMessage["role"],
      content: message.content,
      createdAt: message.createdAt
    }))
  });

  const assistantMessage = await createConversationMessage({
    conversationId: input.conversationId,
    replyToMessageId: input.replyToMessageId,
    role: "assistant",
    content: assistantResult.content,
    metadata: assistantResult.quickReplies
      ? { quickReplies: assistantResult.quickReplies }
      : undefined
  });

  await persistHealthState(input.conversationId, assistantResult.healthState);

  return {
    assistantMessage,
    quickReplies: assistantResult.quickReplies
  };
}

function labReportToHealthState(input: {
  fastingStatus?: string | null;
  results: Array<{
    name: string;
    value: number;
    unit?: string | null;
  }>;
}): HealthState {
  const extractedLabValues: Record<string, number> = {};

  for (const result of input.results) {
    const name = result.name.trim();
    if (name && Number.isFinite(result.value)) {
      extractedLabValues[name] = result.value;
    }
  }

  return {
    ...(Object.keys(extractedLabValues).length > 0
      ? { extracted_lab_values: extractedLabValues }
      : {}),
    ...(input.fastingStatus ? { fasting_status: input.fastingStatus } : {}),
    profile_metrics: input.results.map((result) => ({
      label: result.name,
      value: String(result.value),
      unit: result.unit ?? null
    })),
    pending_slot: null
  };
}

export async function getConversationForUser(userId: string, conversationId: string) {
  const conversation = await getUserConversation(userId, conversationId);

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map(serializeMessage)
  };
}

export async function listConversationsForUser(userId: string) {
  let conversations = await listUserConversations(userId);

  if (conversations.length === 0) {
    const { conversation } = await getOrCreateSingleConversation(userId);
    conversations = [conversation];
  }

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString()
  }));
}

export async function getOrCreateConversationForUser(userId: string) {
  const { conversation } = await getOrCreateSingleConversation(userId);

  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map(serializeMessage)
  };
}

export async function sendMessageToConversation(input: {
  userId: string;
  conversationId?: string | null;
  message: string;
}) {
  const singleConversation = input.conversationId
    ? {
        conversation: await getUserConversation(input.userId, input.conversationId),
        isCreated: false
      }
    : await getOrCreateSingleConversation(input.userId, titleFromMessage(input.message));
  const conversation = singleConversation.conversation;

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const userMessage = await createConversationMessage({
    conversationId: conversation.id,
    role: "user",
    content: input.message
  });

  const assistantReply = await createAssistantReply({
    conversationId: conversation.id,
    userId: input.userId,
    replyToMessageId: userMessage.id
  });

  const updatedConversation = await touchConversation(
    conversation.id,
    singleConversation.isCreated ? titleFromMessage(input.message) : undefined
  );

  return {
    conversation: serializeConversationSummary(updatedConversation),
    messages: [
      serializeMessage(userMessage),
      {
        ...serializeMessage(assistantReply.assistantMessage),
        quickReplies: assistantReply.quickReplies
      }
    ]
  };
}

export async function sendConfirmedLabReportToConversation(input: {
  userId: string;
  conversationId?: string | null;
  labReport: {
    id: string;
    measuredAt?: Date | null;
    fastingStatus?: string | null;
    confidence?: number | null;
    results: Array<{
      name: string;
      value: number;
      unit?: string | null;
      referenceRange?: string | null;
      flag?: string | null;
      confidence?: number | null;
    }>;
  };
}) {
  const singleConversation = input.conversationId
    ? {
        conversation: await getUserConversation(input.userId, input.conversationId),
        isCreated: false
      }
    : await getOrCreateSingleConversation(input.userId, "ผลตรวจสุขภาพ");
  const conversation = singleConversation.conversation;

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const structuredLab = {
    labReportId: input.labReport.id,
    measuredAt: input.labReport.measuredAt?.toISOString() ?? null,
    fastingStatus: input.labReport.fastingStatus ?? null,
    confidence: input.labReport.confidence ?? null,
    results: input.labReport.results.map((result) => ({
      name: result.name,
      value: result.value,
      unit: result.unit ?? null,
      referenceRange: result.referenceRange ?? null,
      flag: result.flag ?? null,
      confidence: result.confidence ?? null
    }))
  };

  const userContent = [
    "ผู้ใช้ยืนยันผลตรวจสุขภาพแล้ว กรุณาวิเคราะห์ค่าแลปจากข้อมูล structured นี้",
    JSON.stringify(structuredLab, null, 2)
  ].join("\n\n");

  const userMessage = await createConversationMessage({
    conversationId: conversation.id,
    role: "user",
    content: userContent,
    metadata: {
      kind: "confirmed_lab_report",
      labReportId: input.labReport.id,
      structuredLab
    } as Prisma.InputJsonObject
  });

  const assistantReply = await createAssistantReply({
    conversationId: conversation.id,
    userId: input.userId,
    replyToMessageId: userMessage.id,
    healthStateOverride: labReportToHealthState(input.labReport)
  });

  const updatedConversation = await touchConversation(
    conversation.id,
    singleConversation.isCreated ? "ผลตรวจสุขภาพ" : undefined
  );

  return {
    sourceMessageId: userMessage.id,
    conversation: serializeConversationSummary(updatedConversation),
    messages: [
      serializeMessage(userMessage),
      {
        ...serializeMessage(assistantReply.assistantMessage),
        quickReplies: assistantReply.quickReplies
      }
    ]
  };
}
