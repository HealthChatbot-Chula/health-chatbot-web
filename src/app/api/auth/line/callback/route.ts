import { NextRequest, NextResponse } from "next/server";

import { getLineFriendshipStatus } from "@/features/auth/friendship.server";
import {
  consumeAndVerifyLineState,
  exchangeLineCodeForToken,
  verifyLineIdToken
} from "@/features/auth/line-oauth.server";
import { createUserSession } from "@/features/auth/session.server";
import { jsonError } from "@/lib/http";
import { routes } from "@/lib/routes";
import { upsertLineUser } from "@/server/repositories/user.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(routes.login, request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL(routes.login, request.url));
    }

    const nonce = await consumeAndVerifyLineState(state);
    const token = await exchangeLineCodeForToken(code);
    const profile = await verifyLineIdToken(token.idToken, nonce);
    const friendFlag = await getLineFriendshipStatus(token.accessToken);
    const user = await upsertLineUser({
      ...profile,
      friendFlag
    });

    await createUserSession(user.id);

    const nextPath = friendFlag ? routes.chat : routes.lineRequired;
    return NextResponse.redirect(new URL(nextPath, request.url));
  } catch (caughtError) {
    return jsonError(caughtError);
  }
}
