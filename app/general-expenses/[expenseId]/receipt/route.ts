
import { db } from "../../../../src/prisma/db";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ expenseId: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const { expenseId: rawExpenseId } = await params;
  const expenseId = Number(rawExpenseId);

  if (!Number.isInteger(expenseId) || expenseId <= 0) {
    return new Response("Invalid expense.", { status: 400 });
  }

  const expense = await db.orm.public.Expense.first({
    id: expenseId,
  });

  // This route is exclusively for General Expenses.
  if (!expense || expense.projectId !== null) {
    return new Response("Expense not found.", { status: 404 });
  }

  if (!expense.receiptFilePath || !expense.receiptMimeType) {
    return new Response("Receipt not found.", { status: 404 });
  }

  const fileName = expense.receiptFilePath;
  const mimeType = expense.receiptMimeType;

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  if (
    !/^[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(fileName) ||
    !allowedTypes.includes(mimeType)
  ) {
    return new Response("Invalid receipt.", { status: 400 });
  }

  const fullPath = path.join(
    process.cwd(),
    "storage",
    "receipts",
    fileName
  );

  try {
    const file = await readFile(fullPath);

    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return new Response("Receipt file not found.", {
        status: 404,
      });
    }

    console.error("Error reading receipt:", error);

    return new Response("Unable to open receipt.", {
      status: 500,
    });
  }
}
