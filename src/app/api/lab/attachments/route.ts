import { NextRequest, NextResponse } from "next/server";

import { requireFriendUser } from "@/features/auth/session.server";
import { uploadLabAttachment } from "@/features/labs/lab-service.server";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireFriendUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const conversationId = formData.get("conversationId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { message: "File is required" } },
        { status: 400 }
      );
    }

    const attachment = await uploadLabAttachment({
      userId: user.id,
      conversationId: typeof conversationId === "string" ? conversationId : null,
      file
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
