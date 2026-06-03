import type { ChatMessage } from "@/features/chat/chat.types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const role = message.role === "user" ? "user" : "assistant";

  return (
    <div className={`message-row ${role}`}>
      <div className="message-bubble">{message.content}</div>
    </div>
  );
}
