import { NextRequest, NextResponse } from "next/server";

import { requireFriendUser } from "@/features/auth/session.server";
import { extractLabDraft } from "@/features/labs/lab-service.server";
import { jsonError } from "@/lib/http";
import { extractLabReportDraftSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireFriendUser();
    const body = extractLabReportDraftSchema.parse(await request.json());
    const report = await extractLabDraft({
      userId: user.id,
      attachmentId: body.attachmentId,
      conversationId: body.conversationId
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
