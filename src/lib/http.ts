import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors";

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: "Invalid request body",
          issues: error.flatten()
        }
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: error.statusCode }
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: { message: "Something went wrong" } },
    { status: 500 }
  );
}

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}
