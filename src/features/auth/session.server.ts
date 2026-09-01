import crypto from "node:crypto";

import { cookies } from "next/headers";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { env, isDevAuthBypassEnabled, isProduction } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";
import { prisma } from "@/server/db";

const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function hashSessionToken(token: string) {
  return crypto.createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function getDevBypassUser() {
  return prisma.user.upsert({
    where: { lineUserId: "dev-auth-bypass-user" },
    create: {
      lineUserId: "dev-auth-bypass-user",
      displayName: "Dev User",
      friendFlag: true,
      lastLoginAt: new Date()
    },
    update: {
      friendFlag: true,
      lastLoginAt: new Date()
    }
  });
}

export async function createUserSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export async function getCurrentSession() {
  if (isDevAuthBypassEnabled) {
    const user = await getDevBypassUser();

    return {
      id: "dev-auth-bypass-session",
      tokenHash: "dev-auth-bypass-token",
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      createdAt: new Date(),
      user
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: { id: session.id }
    });
    return null;
  }

  return session;
}

export async function requireFriendUser() {
  const session = await getCurrentSession();

  if (!session) {
    throw new UnauthorizedError();
  }

  if (!session.user.friendFlag) {
    throw new ForbiddenError();
  }

  return session.user;
}

export async function clearCurrentSession() {
  if (isDevAuthBypassEnabled) {
    return;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session
      .delete({
        where: {
          tokenHash: hashSessionToken(token)
        }
      })
      .catch(() => null);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
