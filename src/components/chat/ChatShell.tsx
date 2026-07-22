"use client";

import { PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { HealthProfilePanel } from "@/components/chat/HealthProfilePanel";
import { LabReportReview } from "@/components/chat/LabReportReview";
import { MessageList } from "@/components/chat/MessageList";
import type { ChatMessage, ConversationSummary } from "@/features/chat/chat.types";
import type { LabReportDraft } from "@/features/labs/lab.types";
import type { PatientProfileForm } from "@/features/profile/profile.types";

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

type ConfirmLabReportResponse = SendMessageResponse & {
  labReport: LabReportDraft;
};

export function ChatShell() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLabBusy, setIsLabBusy] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labDraft, setLabDraft] = useState<LabReportDraft | null>(null);
  const [isHealthProfileOpen, setIsHealthProfileOpen] = useState(false);

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
    setConversations(data);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 820px)");

    function syncSidebarWithViewport() {
      setIsSidebarOpen(!mediaQuery.matches);
      setIsViewportReady(true);
    }

    syncSidebarWithViewport();
    mediaQuery.addEventListener("change", syncSidebarWithViewport);

    return () => mediaQuery.removeEventListener("change", syncSidebarWithViewport);
  }, []);

  function closeSidebarOnMobile() {
    if (window.matchMedia("(max-width: 820px)").matches) {
      setIsSidebarOpen(false);
    }
  }

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
      setConversations((current) => {
        const existing = current.filter((item) => item.id !== data.conversation.id);
        return [data.conversation, ...existing];
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
    setIsHealthProfileOpen(false);

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

      setLabDraft(draft);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not read lab report");
    } finally {
      setIsLabBusy(false);
    }
  }

  async function handleManualLabEntry() {
    setIsLabBusy(true);
    setError(null);
    setIsHealthProfileOpen(false);

    try {
      const draft = await fetchJson<LabReportDraft>("/api/lab/reports/manual", {
        method: "POST",
        body: JSON.stringify({
          conversationId: activeConversationId,
          results: []
        })
      });
      setLabDraft(draft);
    } catch (manualError) {
      setError(manualError instanceof Error ? manualError.message : "Could not create lab draft");
    } finally {
      setIsLabBusy(false);
    }
  }

  async function handleSaveLabDraft(draft: LabReportDraft) {
    setIsLabBusy(true);
    setError(null);

    try {
      const saved = await fetchJson<LabReportDraft>(`/api/lab/reports/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          measuredAt: draft.measuredAt,
          fastingStatus: draft.fastingStatus,
          ocrText: draft.ocrText,
          results: draft.results.filter((result) => result.name.trim().length > 0)
        })
      });
      setLabDraft(saved);
      return saved;
    } finally {
      setIsLabBusy(false);
    }
  }

  async function handleConfirmLabDraft(draft: LabReportDraft) {
    setIsLabBusy(true);
    setIsSending(true);
    setError(null);

    try {
      const data = await fetchJson<ConfirmLabReportResponse>(`/api/lab/reports/${draft.id}/confirm`, {
        method: "POST"
      });

      setLabDraft(null);
      setActiveConversationId(data.conversation.id);
      setMessages((current) => [...current, ...data.messages]);
      setConversations((current) => {
        const existing = current.filter((item) => item.id !== data.conversation.id);
        return [data.conversation, ...existing];
      });
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Could not confirm lab report");
    } finally {
      setIsSending(false);
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

  function handleSelectConversation(conversationId: string) {
    void loadConversation(conversationId).catch((loadError) => setError(loadError.message));
    closeSidebarOnMobile();
  }

  const isPanelOpen = Boolean(labDraft) || isHealthProfileOpen;

  return (
    <div
      className={`${styles.shell} ${isViewportReady ? styles.viewportReady : ""} ${
        isSidebarOpen ? styles.sidebarOpen : styles.sidebarCollapsed
      }`}
    >
      {isViewportReady && isSidebarOpen ? (
        <button
          aria-label="Close conversations"
          className={styles.backdrop}
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}
      <div className={styles.sidebarPane}>
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onCloseSidebar={() => setIsSidebarOpen(false)}
        />
      </div>
      {!isSidebarOpen ? (
        <nav className={styles.rail} aria-label="Chat tools">
          <button
            aria-label="Show conversations"
            className={styles.railButton}
            onClick={() => setIsSidebarOpen(true)}
            title="Show conversations"
            type="button"
          >
            <PanelLeftOpen size={20} aria-hidden="true" />
          </button>
        </nav>
      ) : null}
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
            {labDraft ? (
              <LabReportReview
                key={labDraft.id}
                report={labDraft}
                isBusy={isLabBusy || isSending}
                onCancel={() => setLabDraft(null)}
                onSave={handleSaveLabDraft}
                onConfirm={handleConfirmLabDraft}
              />
            ) : null}
            {isHealthProfileOpen ? (
              <HealthProfilePanel
                isBusy={isLabBusy || isSending}
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
            onManualLabEntry={handleManualLabEntry}
            onHealthProfileOpen={() => {
              setLabDraft(null);
              setIsHealthProfileOpen(true);
            }}
          />
        </div>
      </section>
    </div>
  );
}
