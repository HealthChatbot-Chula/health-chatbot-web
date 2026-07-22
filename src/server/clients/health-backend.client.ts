import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { normalizeBaseUrl } from "@/lib/http";
import type { ChatMessage, HealthState, QuickReplyOption } from "@/features/chat/chat.types";

type CreateCompletionInput = {
  conversationId: string;
  userId: string;
  messages: ChatMessage[];
  healthState?: HealthState;
};

export type ExtractedLabResult = {
  name: string;
  value: number;
  unit?: string | null;
  referenceRange?: string | null;
  flag?: string | null;
  confidence?: number | null;
};

export type ExtractLabReportResponse = {
  measuredAt?: string | null;
  fastingStatus?: string | null;
  ocrText?: string | null;
  confidence?: number | null;
  results?: ExtractedLabResult[];
  raw?: unknown;
};

type CompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      metadata?: {
        choices?: QuickReplyOption[];
        health_state?: HealthState;
        pending_slot?: string;
      };
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
      health_state: input.healthState,
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
  const message = data.choices?.[0]?.message;
  const content = message?.content?.trim();

  if (!content) {
    throw new AppError("Health backend returned an empty response", 502);
  }

  return {
    content,
    healthState: message?.metadata?.health_state,
    quickReplies: Array.isArray(message?.metadata?.choices)
      ? message.metadata.choices.filter(
          (choice) =>
            typeof choice?.label === "string" &&
            choice.label.length > 0 &&
            typeof choice?.value === "string" &&
            choice.value.length > 0
        )
      : undefined
  };
}

export async function extractLabReportFromAttachment(input: {
  userId: string;
  attachmentId: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
}): Promise<ExtractLabReportResponse | null> {
  if (!env.LAB_EXTRACTION_PATH) {
    return null;
  }

  const endpoint = `${normalizeBaseUrl(env.CHAT_COMPLETIONS_BASE_URL)}${env.LAB_EXTRACTION_PATH}`;
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
      user: input.userId,
      attachment_id: input.attachmentId,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_base64: input.data.toString("base64")
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AppError(
      `Lab extraction backend request failed (${response.status}): ${detail}`,
      502
    );
  }

  return (await response.json()) as ExtractLabReportResponse;
}
