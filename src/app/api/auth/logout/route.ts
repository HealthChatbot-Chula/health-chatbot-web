import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { clearCurrentSession } from "@/features/auth/session.server";
import { routes } from "@/lib/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await clearCurrentSession();
  return NextResponse.redirect(new URL(routes.login, env.APP_URL), 303);
}

export async function GET(request: NextRequest) {
  await clearCurrentSession();
  return NextResponse.redirect(new URL(routes.login, env.APP_URL));
}
