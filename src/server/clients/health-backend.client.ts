import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { normalizeBaseUrl } from "@/lib/http";
import type { ChatMessage } from "@/features/chat/chat.types";

type CreateCompletionInput = {
  conversationId: string;
  userId: string;
  messages: ChatMessage[];
};

type CompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function createHealthChatCompletion(input: CreateCompletionInput) {
  const endpoint = `${normalizeBaseUrl(env.CHAT_COMPLETIONS_BASE_URL)}${env.CHAT_COMPLETIONS_PATH}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (env.CHAT_COMPLETIONS_API_KEY) {
    headers.Authorization = `Bearer ${env.CHAT_COMPLETIONS_API_KEY}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      model: env.CHAT_MODEL,
      messages: input.messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      user: input.userId,
      conversation_id: input.conversationId,
      stream: false
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AppError(
      `Health backend request failed (${response.status}): ${detail}`,
      502
    );
  }

  const data = (await response.json()) as CompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new AppError("Health backend returned an empty response", 502);
  }

  return content;
}
