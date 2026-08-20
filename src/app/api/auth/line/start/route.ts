import { NextResponse } from "next/server";

import { createLineAuthorizationUrl } from "@/features/auth/line-oauth.server";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = await createLineAuthorizationUrl();
    return NextResponse.redirect(url, {
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
