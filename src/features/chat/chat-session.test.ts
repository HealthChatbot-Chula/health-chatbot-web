import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_SESSION_IDLE_TIMEOUT_MS,
  chatSessionEndedAt,
  isChatSessionActive
} from "./chat-session.ts";

const lastActiveAt = new Date("2026-09-24T08:00:00.000Z");

test("keeps the same chat session at exactly 60 minutes", () => {
  const now = new Date(lastActiveAt.getTime() + CHAT_SESSION_IDLE_TIMEOUT_MS);

  assert.equal(isChatSessionActive(lastActiveAt, now), true);
});

test("starts a new chat session after more than 60 minutes", () => {
  const now = new Date(lastActiveAt.getTime() + CHAT_SESSION_IDLE_TIMEOUT_MS + 1);

  assert.equal(isChatSessionActive(lastActiveAt, now), false);
});

test("ends an inactive session 60 minutes after its last activity", () => {
  assert.equal(
    chatSessionEndedAt(lastActiveAt).toISOString(),
    "2026-09-24T09:00:00.000Z"
  );
});
