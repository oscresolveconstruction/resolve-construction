
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "../../../../src/prisma/db";
import { createSession } from "../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid email or password." },
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
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user = await db.orm.public.AppUser.first({
      email,
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordIsValid = await compare(
      password,
      user.passwordHash
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Unable to sign in." },
      { status: 500 }
    );
  }
}
