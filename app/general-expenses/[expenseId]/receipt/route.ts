import { db } from "../../../../src/prisma/db";
import { getSessionUserId } from "../../../lib/auth";
import { getSupabaseStorage } from "../../../lib/supabase-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ expenseId: string }>;
};

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  // Only authenticated, active owners can view receipts.
  const userId = await getSessionUserId();

  if (!userId) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const user = await db.orm.public.AppUser.first({
    id: userId,
  });

  if (!user || !user.isActive) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const { expenseId: rawExpenseId } = await params;
  const expenseId = Number(rawExpenseId);

  if (
    !Number.isSafeInteger(expenseId) ||
    expenseId <= 0
  ) {
    return new Response("Invalid expense.", { status: 400 });
  }

  const expense = await db.orm.public.Expense.first({
    id: expenseId,
  });

  // This route is exclusively for General Expenses.
  if (!expense || expense.projectId !== null) {
    return new Response("Expense not found.", { status: 404 });
  }

  const storagePath = expense.receiptFilePath;
  const mimeType = expense.receiptMimeType;

  if (!storagePath || !mimeType) {
    return new Response("Receipt not found.", { status: 404 });
  }

  // Only accept new receipt paths stored in Supabase.
  if (
    !/^receipts\/[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(
      storagePath
    ) ||
    !ALLOWED_TYPES.includes(mimeType)
  ) {
    return new Response("Receipt not available.", {
      status: 404,
    });
  }

  try {
    const { data, error } =
      await getSupabaseStorage().download(storagePath);

    if (error || !data) {
      console.error("Unable to download receipt:", error);

      return new Response("Receipt not available.", {
        status: 404,
      });
    }

    const bytes = new Uint8Array(
      await data.arrayBuffer()
    );

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error reading receipt:", error);

    return new Response("Unable to open receipt.", {
      status: 500,
    });
  }
}