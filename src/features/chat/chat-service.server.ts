import { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors";
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
    return compact || "New chat";
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

export async function createBlankConversation(userId: string) {
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

  const history = await listConversationMessages(conversation.id);
  const savedHealthState = await getConversationHealthState(conversation.id);
  const assistantResult = await createHealthChatCompletion({
    conversationId: conversation.id,
    userId: input.userId,
    healthState: isHealthState(savedHealthState?.state) ? savedHealthState.state : undefined,
    messages: history.map((message) => ({
      id: message.id,
      role: message.role as ChatMessage["role"],
      content: message.content,
      createdAt: message.createdAt
    }))
  });

  const assistantMessage = await createConversationMessage({
    conversationId: conversation.id,
    role: "assistant",
    content: assistantResult.content,
    metadata: assistantResult.quickReplies
      ? { quickReplies: assistantResult.quickReplies }
      : undefined
  });

  if (assistantResult.healthState) {
    await upsertConversationHealthState({
      conversationId: conversation.id,
      state: toPrismaJsonObject(assistantResult.healthState),
      pendingSlot:
        typeof assistantResult.healthState.pending_slot === "string"
          ? assistantResult.healthState.pending_slot
          : null,
      summary:
        typeof assistantResult.healthState.summary === "string"
          ? assistantResult.healthState.summary
          : null
    });
  }

  const updatedConversation = await touchConversation(
    conversation.id,
    singleConversation.isCreated ? titleFromMessage(input.message) : undefined
  );

  return {
    conversation: {
      id: updatedConversation.id,
      title: updatedConversation.title,
      updatedAt: updatedConversation.updatedAt.toISOString()
    },
    messages: [
      serializeMessage(userMessage),
      {
        ...serializeMessage(assistantMessage),
        quickReplies: assistantResult.quickReplies
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

  const history = await listConversationMessages(conversation.id);
  const savedHealthState = await getConversationHealthState(conversation.id);
  const assistantResult = await createHealthChatCompletion({
    conversationId: conversation.id,
    userId: input.userId,
    healthState: isHealthState(savedHealthState?.state) ? savedHealthState.state : undefined,
    messages: history.map((message) => ({
      id: message.id,
      role: message.role as ChatMessage["role"],
      content: message.content,
      createdAt: message.createdAt
    }))
  });

  const assistantMessage = await createConversationMessage({
    conversationId: conversation.id,
    role: "assistant",
    content: assistantResult.content,
    metadata: assistantResult.quickReplies
      ? { quickReplies: assistantResult.quickReplies }
      : undefined
  });

  if (assistantResult.healthState) {
    await upsertConversationHealthState({
      conversationId: conversation.id,
      state: toPrismaJsonObject(assistantResult.healthState),
      pendingSlot:
        typeof assistantResult.healthState.pending_slot === "string"
          ? assistantResult.healthState.pending_slot
          : null,
      summary:
        typeof assistantResult.healthState.summary === "string"
          ? assistantResult.healthState.summary
          : null
    });
  }

  const updatedConversation = await touchConversation(
    conversation.id,
    singleConversation.isCreated ? "ผลตรวจสุขภาพ" : undefined
  );

  return {
    sourceMessageId: userMessage.id,
    conversation: {
      id: updatedConversation.id,
      title: updatedConversation.title,
      updatedAt: updatedConversation.updatedAt.toISOString()
    },
    messages: [
      serializeMessage(userMessage),
      {
        ...serializeMessage(assistantMessage),
        quickReplies: assistantResult.quickReplies
      }
    ]
  };
}
