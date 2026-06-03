import { prisma } from "@/server/db";

export async function listUserConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1
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
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function createUserConversation(userId: string, title = "New chat") {
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
