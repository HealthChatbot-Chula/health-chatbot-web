import { NextRequest, NextResponse } from "next/server";

import { requireFriendUser } from "@/features/auth/session.server";
import { getConversationForUser } from "@/features/chat/chat-service.server";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await requireFriendUser();
    const { conversationId } = await params;
    const conversation = await getConversationForUser(user.id, conversationId);
    return NextResponse.json(conversation);
  } catch (error) {
    return jsonError(error);
  }
}
