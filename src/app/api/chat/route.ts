import { NextRequest, NextResponse } from "next/server";

import { requireFriendUser } from "@/features/auth/session.server";
import { sendMessageToConversation } from "@/features/chat/chat-service.server";
import { jsonError } from "@/lib/http";
import { sendMessageSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireFriendUser();
    const body = sendMessageSchema.parse(await request.json());
    const result = await sendMessageToConversation({
      userId: user.id,
      conversationId: body.conversationId,
      message: body.message
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
