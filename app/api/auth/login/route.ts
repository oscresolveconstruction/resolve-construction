import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "../../../../src/prisma/db";
import { createSession } from "../../../lib/auth";
import {
  checkLoginRateLimit,
  clearSuccessfulLogin,
} from "../../../lib/login-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID_CREDENTIALS = "Invalid email or password.";

export async function POST(request: Request) {
  try {
    const contentLength = Number(
      request.headers.get("content-length")
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > 4096
    ) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 413 }
      );
    }

    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS },
        { status: 401 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;

    if (
      !email ||
      email.length > 254 ||
      !password ||
      password.length > 1024
    ) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS },
        { status: 401 }
      );
    }

    // Count each attempt atomically before checking the password.
    // If PostgreSQL is unavailable, login is denied.
    const limit = await checkLoginRateLimit(email);

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many login attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, limit.retryAfterSeconds)
            ),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const user = await db.orm.public.AppUser.first({
      email,
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS },
        { status: 401 }
      );
    }

    const passwordIsValid = await compare(
      password,
      user.passwordHash
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS },
        { status: 401 }
      );
    }

    // Keep a record of successful access only after the
    // rate-limit database operations have succeeded.
    await clearSuccessfulLogin(email);

    await createSession(user.id);

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Unable to sign in." },
      { status: 500 }
    );
  }
}