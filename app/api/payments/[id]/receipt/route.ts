import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../../../../../src/prisma/db";
import { getSessionUserId } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  { params }: RouteProps
) {
  const userId = await getSessionUserId();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await db.orm.public.AppUser.first({
    id: userId,
  });

  if (!user || !user.isActive) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const paymentId = Number(id);

  if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
    return new NextResponse("Invalid payment", { status: 400 });
  }

  const payment = await db.orm.public.Payment.first({
    id: paymentId,
  });

  if (
    !payment ||
    !payment.receiptFilePath ||
    !payment.receiptMimeType
  ) {
    return new NextResponse("Receipt not found", { status: 404 });
  }

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  if (!allowedTypes.includes(payment.receiptMimeType)) {
    return new NextResponse("Invalid receipt type", {
      status: 400,
    });
  }

  const receiptDirectory = path.resolve(
    process.cwd(),
    "private-uploads",
    "payment-receipts"
  );

  const filePath = path.resolve(payment.receiptFilePath);

  // Prevent access to files outside the receipt directory.
  if (path.dirname(filePath) !== receiptDirectory) {
    return new NextResponse("Invalid receipt path", {
      status: 403,
    });
  }

  try {
    const file = await readFile(filePath);

    const originalName =
      payment.receiptFileName || "payment-receipt";

    const safeName = originalName
      .replace(/[^\w.\- ]/g, "_")
      .slice(0, 150);

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": payment.receiptMimeType,
        "Content-Disposition":
          `attachment; filename="${safeName}"`,
        "Content-Length": String(file.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Receipt file unavailable", {
      status: 404,
    });
  }
}