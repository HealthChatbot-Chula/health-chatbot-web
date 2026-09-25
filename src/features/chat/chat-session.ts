export const CHAT_SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

export function isChatSessionActive(lastActiveAt: Date, now: Date) {
  return now.getTime() - lastActiveAt.getTime() <= CHAT_SESSION_IDLE_TIMEOUT_MS;
}

export function chatSessionEndedAt(lastActiveAt: Date) {
  return new Date(lastActiveAt.getTime() + CHAT_SESSION_IDLE_TIMEOUT_MS);
}
