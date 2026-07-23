import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";

export async function listUserConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 1,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1
      }
    }
  });
}

export async function getLatestUserConversation(userId: string) {
  return prisma.conversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      healthState: true,
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function getUserConversation(userId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId
    },
    include: {
      healthState: true,
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function createUserConversation(userId: string, title = "Health chat") {
  return prisma.conversation.create({
    data: {
      userId,
      title
    }
  });
}

export async function createConversationMessage(input: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.message.create({
    data: input
  });
}

export async function listConversationMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" }
  });
}

export async function touchConversation(conversationId: string, title?: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(title ? { title } : {}),
      updatedAt: new Date()
    }
  });
}

export async function getConversationHealthState(conversationId: string) {
  return prisma.conversationHealthState.findUnique({
    where: { conversationId }
  });
}

export async function upsertConversationHealthState(input: {
  conversationId: string;
  state: Prisma.InputJsonValue;
  pendingSlot?: string | null;
  summary?: string | null;
}) {
  return prisma.conversationHealthState.upsert({
    where: { conversationId: input.conversationId },
    create: {
      conversationId: input.conversationId,
      state: input.state,
      pendingSlot: input.pendingSlot ?? null,
      summary: input.summary ?? null
    },
    update: {
      state: input.state,
      pendingSlot: input.pendingSlot ?? null,
      summary: input.summary ?? null
    }
  });
}
