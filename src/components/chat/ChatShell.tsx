"use client";

import { PanelLeftOpen, SquarePen } from "lucide-react";
import { useEffect, useState } from "react";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { SafetyNotice } from "@/components/chat/SafetyNotice";
import type { ChatMessage, ConversationSummary } from "@/features/chat/chat.types";

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

export function ChatShell() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function handleNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    closeSidebarOnMobile();
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

  function handleSelectConversation(conversationId: string) {
    void loadConversation(conversationId).catch((loadError) => setError(loadError.message));
    closeSidebarOnMobile();
  }

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
          onNewConversation={handleNewConversation}
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
          <button
            aria-label="New chat"
            className={styles.railButton}
            onClick={handleNewConversation}
            title="New chat"
            type="button"
          >
            <SquarePen size={20} aria-hidden="true" />
          </button>
        </nav>
      ) : null}
      <section className={styles.main}>
        <SafetyNotice />
        {isLoading ? (
          <div className={styles.loadingList}>
            <p className={styles.statusText}>Loading conversations...</p>
          </div>
        ) : (
          <MessageList messages={messages} isSending={isSending} onQuickReply={handleSend} />
        )}
        {error ? <div className={styles.errorText}>{error}</div> : null}
        <ChatComposer disabled={isSending || isLoading} onSend={handleSend} />
      </section>
    </div>
  );
}
