import { NextRequest, NextResponse } from "next/server";

import { requireFriendUser } from "@/features/auth/session.server";
import { updateLabDraft } from "@/features/labs/lab-service.server";
import { jsonError } from "@/lib/http";
import { updateLabReportDraftSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const user = await requireFriendUser();
    const { reportId } = await params;
    const body = updateLabReportDraftSchema.parse(await request.json());
    const report = await updateLabDraft({
      userId: user.id,
      labReportId: reportId,
      measuredAt: body.measuredAt,
      fastingStatus: body.fastingStatus,
      ocrText: body.ocrText,
      results: body.results
    });

    return NextResponse.json(report);
  } catch (error) {
    return jsonError(error);
  }
}
