import { NextRequest, NextResponse } from "next/server";

import { requireFriendUser } from "@/features/auth/session.server";
import { confirmLabDraftAndAnalyze } from "@/features/labs/lab-service.server";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const user = await requireFriendUser();
    const { reportId } = await params;
    const result = await confirmLabDraftAndAnalyze({
      userId: user.id,
      labReportId: reportId
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
