import { AppError } from "@/lib/errors";
import { createHealthChatCompletion } from "@/server/clients/health-backend.client";
import {
  createConversationMessage,
  createUserConversation,
  getUserConversation,
  listConversationMessages,
  listUserConversations,
  touchConversation
} from "@/server/repositories/conversation.repository";
import type { ChatMessage } from "@/features/chat/chat.types";

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
}): ChatMessage {
  return {
    id: message.id,
    role: message.role as ChatMessage["role"],
    content: message.content,
    createdAt: message.createdAt.toISOString()
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
  const conversations = await listUserConversations(userId);

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString()
  }));
}

export async function createBlankConversation(userId: string) {
  const conversation = await createUserConversation(userId);

  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    messages: []
  };
}

export async function sendMessageToConversation(input: {
  userId: string;
  conversationId?: string | null;
  message: string;
}) {
  const isNewConversation = !input.conversationId;
  const conversation = input.conversationId
    ? await getUserConversation(input.userId, input.conversationId)
    : await createUserConversation(input.userId, titleFromMessage(input.message));

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const userMessage = await createConversationMessage({
    conversationId: conversation.id,
    role: "user",
    content: input.message
  });

  const history = await listConversationMessages(conversation.id);
  const assistantResult = await createHealthChatCompletion({
    conversationId: conversation.id,
    userId: input.userId,
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
    content: assistantResult.content
  });

  const updatedConversation = await touchConversation(
    conversation.id,
    isNewConversation ? titleFromMessage(input.message) : undefined
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
