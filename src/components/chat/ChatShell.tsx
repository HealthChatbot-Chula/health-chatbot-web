"use client";

import { useEffect, useState } from "react";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { HealthProfilePanel } from "@/components/chat/HealthProfilePanel";
import { MessageList } from "@/components/chat/MessageList";
import type { ChatMessage, ConversationSummary } from "@/features/chat/chat.types";
import type { LabReportDraft } from "@/features/labs/lab.types";
import type { HealthMetric, PatientProfileForm } from "@/features/profile/profile.types";

import styles from "./ChatShell.module.css";

type ConversationResponse = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

type SendMessageResponse = {
  conversation: ConversationSummary;
  messages: ChatMessage[];
};

type AttachmentResponse = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function metricIdFromLabName(name: string) {
  const normalizedName = name.trim().toLowerCase();

  if (normalizedName === "ldl" || normalizedName.includes("ldl")) {
    return "ldl";
  }

  if (
    normalizedName.includes("systolic") ||
    normalizedName.includes("sbp") ||
    normalizedName.includes("ตัวบน")
  ) {
    return "bp_systolic";
  }

  if (
    normalizedName.includes("diastolic") ||
    normalizedName.includes("dbp") ||
    normalizedName.includes("ตัวล่าง")
  ) {
    return "bp_diastolic";
  }

  return undefined;
}

function labResultToHealthMetric(result: LabReportDraft["results"][number]): HealthMetric {
  return {
    id: metricIdFromLabName(result.name),
    label: result.name,
    value: String(result.value),
    unit: result.unit ?? ""
  };
}

export function ChatShell() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLabBusy, setIsLabBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHealthProfileOpen, setIsHealthProfileOpen] = useState(false);
  const [seedHealthMetrics, setSeedHealthMetrics] = useState<HealthMetric[]>([]);
  const [healthProfileKey, setHealthProfileKey] = useState(0);

  async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error?.message ?? "Request failed");
    }

    return response.json() as Promise<T>;
  }

  async function loadConversations() {
    const data = await fetchJson<ConversationSummary[]>("/api/conversations");

    if (data.length > 0) {
      await loadConversation(data[0].id);
    }
  }

  async function loadConversation(conversationId: string) {
    setError(null);
    const data = await fetchJson<ConversationResponse>(`/api/conversations/${conversationId}`);
    setActiveConversationId(data.id);
    setMessages(data.messages);
  }

  useEffect(() => {
    // Loading initial conversations is the external sync for this client-only shell.
    loadConversations()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend(message: string) {
    setIsSending(true);
    setError(null);

    const optimisticMessage: ChatMessage = {
      role: "user",
      content: message,
      createdAt: new Date().toISOString()
    };

    setMessages((current) => [...current, optimisticMessage]);

    try {
      const data = await fetchJson<SendMessageResponse>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          conversationId: activeConversationId,
          message
        })
      });

      setActiveConversationId(data.conversation.id);
      setMessages((current) => {
        const withoutOptimistic = current.filter((item) => item !== optimisticMessage);
        return [...withoutOptimistic, ...data.messages];
      });
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item !== optimisticMessage));
      setError(sendError instanceof Error ? sendError.message : "Could not send message");
    } finally {
      setIsSending(false);
    }
  }

  async function handleLabFileSelected(file: File) {
    setIsLabBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (activeConversationId) {
        formData.append("conversationId", activeConversationId);
      }

      const uploadResponse = await fetch("/api/lab/attachments", {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Upload failed");
      }

      const attachment = (await uploadResponse.json()) as AttachmentResponse;
      const draft = await fetchJson<LabReportDraft>("/api/lab/reports/extract", {
        method: "POST",
        body: JSON.stringify({
          attachmentId: attachment.id,
          conversationId: activeConversationId
        })
      });

      setSeedHealthMetrics(draft.results.map(labResultToHealthMetric));
      setHealthProfileKey((current) => current + 1);
      setIsHealthProfileOpen(true);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not read lab report");
    } finally {
      setIsLabBusy(false);
    }
  }

  async function handleSaveHealthProfile(profile: PatientProfileForm) {
    setIsLabBusy(true);
    setError(null);

    try {
      return await fetchJson<PatientProfileForm>("/api/health-profile", {
        method: "PATCH",
        body: JSON.stringify(profile)
      });
    } finally {
      setIsLabBusy(false);
    }
  }

  const isPanelOpen = isHealthProfileOpen;

  return (
    <div className={styles.shell}>
      <section className={`${styles.main} ${isPanelOpen ? styles.panelMode : ""}`}>
        {!isPanelOpen ? (
          <div className={styles.messageRegion}>
            {isLoading ? (
              <div className={styles.loadingList}>
                <p className={styles.statusText}>Loading conversations...</p>
              </div>
            ) : (
              <MessageList messages={messages} isSending={isSending} onQuickReply={handleSend} />
            )}
          </div>
        ) : (
          <div className={styles.panelRegion}>
            {isHealthProfileOpen ? (
              <HealthProfilePanel
                key={healthProfileKey}
                isBusy={isLabBusy || isSending}
                seedMetrics={seedHealthMetrics}
                onClose={() => setIsHealthProfileOpen(false)}
                onSave={handleSaveHealthProfile}
              />
            ) : null}
          </div>
        )}
        {error ? <div className={styles.errorText}>{error}</div> : null}
        <div className={styles.composerRegion}>
          <ChatComposer
            disabled={isSending || isLoading || isLabBusy}
            onSend={handleSend}
            onLabFileSelected={handleLabFileSelected}
            onHealthProfileOpen={() => {
              setSeedHealthMetrics([]);
              setHealthProfileKey((current) => current + 1);
              setIsHealthProfileOpen(true);
            }}
          />
        </div>
      </section>
    </div>
  );
}
