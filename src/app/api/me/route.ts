import { NextResponse } from "next/server";

import { getCurrentSession } from "@/features/auth/session.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      displayName: session.user.displayName,
      pictureUrl: session.user.pictureUrl,
      friendFlag: session.user.friendFlag
    }
  });
}
