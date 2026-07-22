import { NextRequest, NextResponse } from "next/server";

import { requireFriendUser } from "@/features/auth/session.server";
import { createManualLabDraft } from "@/features/labs/lab-service.server";
import { jsonError } from "@/lib/http";
import { createManualLabReportDraftSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireFriendUser();
    const body = createManualLabReportDraftSchema.parse(await request.json());
    const report = await createManualLabDraft({
      userId: user.id,
      conversationId: body.conversationId,
      measuredAt: body.measuredAt,
      fastingStatus: body.fastingStatus,
      ocrText: body.ocrText,
      results: body.results
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
