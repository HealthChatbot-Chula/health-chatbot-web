import { NextRequest, NextResponse } from "next/server";

import { routes } from "@/lib/routes";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const protectedPrefixes = ["/chat", "/profile"];

export function proxy(request: NextRequest) {
  const devAuthBypass =
    process.env.DEV_AUTH_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!hasSessionCookie && !devAuthBypass) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/profile/:path*"]
};
