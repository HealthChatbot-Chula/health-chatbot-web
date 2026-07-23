import { NextResponse } from "next/server";

import { requireFriendUser } from "@/features/auth/session.server";
import {
  getOrCreateConversationForUser,
  listConversationsForUser
} from "@/features/chat/chat-service.server";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireFriendUser();
    const conversations = await listConversationsForUser(user.id);
    return NextResponse.json(conversations);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST() {
  try {
    const user = await requireFriendUser();
    const conversation = await getOrCreateConversationForUser(user.id);
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
