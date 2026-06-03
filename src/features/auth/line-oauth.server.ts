import crypto from "node:crypto";

import { cookies } from "next/headers";

import { env, isProduction } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { routes } from "@/lib/routes";
import type { LineProfile } from "@/features/auth/auth.types";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_ID_TOKEN_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

const STATE_COOKIE = "line_oauth_state";
const NONCE_COOKIE = "line_oauth_nonce";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

type LineTokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

type LineIdTokenVerifyResponse = {
  sub?: string;
  name?: string;
  picture?: string;
  nonce?: string;
};

function randomUrlToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function redirectUri() {
  return new URL(routes.apiLineCallback, env.APP_URL).toString();
}

function timingSafeEqualString(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function createLineAuthorizationUrl() {
  const state = randomUrlToken();
  const nonce = randomUrlToken();
  const cookieStore = await cookies();

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS
  };

  cookieStore.set(STATE_COOKIE, state, cookieOptions);
  cookieStore.set(NONCE_COOKIE, nonce, cookieOptions);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.LINE_CHANNEL_ID,
    redirect_uri: redirectUri(),
    state,
    scope: "profile openid",
    nonce,
    bot_prompt: env.LINE_BOT_PROMPT
  });

  return `${LINE_AUTH_URL}?${params.toString()}`;
}

export async function consumeAndVerifyLineState(returnedState: string | null) {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  const storedNonce = cookieStore.get(NONCE_COOKIE)?.value;

  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(NONCE_COOKIE);

  if (!returnedState || !storedState || !storedNonce) {
    throw new AppError("LINE login state is missing", 400);
  }

  if (!timingSafeEqualString(returnedState, storedState)) {
    throw new AppError("LINE login state is invalid", 400);
  }

  return storedNonce;
}

export async function exchangeLineCodeForToken(code: string) {
  const response = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    cache: "no-store",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      client_id: env.LINE_CHANNEL_ID,
      client_secret: env.LINE_CHANNEL_SECRET
    })
  });

  if (!response.ok) {
    throw new AppError(`LINE token exchange failed: ${await response.text()}`, 502);
  }

  const token = (await response.json()) as LineTokenResponse;

  if (!token.access_token || !token.id_token) {
    throw new AppError("LINE token response is missing access_token or id_token", 502);
  }

  return {
    accessToken: token.access_token,
    idToken: token.id_token
  };
}

export async function verifyLineIdToken(idToken: string, expectedNonce: string): Promise<LineProfile> {
  const response = await fetch(LINE_ID_TOKEN_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    cache: "no-store",
    body: new URLSearchParams({
      id_token: idToken,
      client_id: env.LINE_CHANNEL_ID
    })
  });

  if (!response.ok) {
    throw new AppError(`LINE id_token verification failed: ${await response.text()}`, 502);
  }

  const payload = (await response.json()) as LineIdTokenVerifyResponse;

  if (!payload.sub) {
    throw new AppError("LINE id_token payload is missing subject", 502);
  }

  if (payload.nonce !== expectedNonce) {
    throw new AppError("LINE id_token nonce is invalid", 400);
  }

  return {
    lineUserId: payload.sub,
    displayName: payload.name ?? null,
    pictureUrl: payload.picture ?? null
  };
}
