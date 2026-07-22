import { NextRequest, NextResponse } from "next/server";

import { requireFriendUser } from "@/features/auth/session.server";
import {
  getPatientProfileForUser,
  updatePatientProfileForUser
} from "@/features/profile/profile-service.server";
import { jsonError } from "@/lib/http";
import { updatePatientProfileSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireFriendUser();
    const profile = await getPatientProfileForUser(user.id);
    return NextResponse.json(profile);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireFriendUser();
    const body = updatePatientProfileSchema.parse(await request.json());
    const profile = await updatePatientProfileForUser(user.id, body);
    return NextResponse.json(profile);
  } catch (error) {
    return jsonError(error);
  }
}
