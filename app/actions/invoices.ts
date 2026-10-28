
"use server";

import { db } from "../../src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { redirect } from "next/navigation";

// Only authenticated, active owners can manage invoices.
async function requireOwner() {
  const userId = await getSessionUserId();

  if (!userId) {
    throw new Error("Unauthorized. Please sign in.");
  }

  const user = await db.orm.public.AppUser.first({
    id: userId,
  });

  if (!user || !user.isActive) {
    throw new Error("Unauthorized. Please sign in.");
  }
}

function validId(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function parseDate(
  value: string,
  fieldName: string
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  // Keep the original date string format.
  return value;
}

function parseInvoice(formData: FormData) {
  const projectId = Number(
    formData.get("projectId")
  );

  const invoiceNumber = String(
    formData.get("invoiceNumber") ?? ""
  ).trim();

  const issueDateRaw = String(
    formData.get("issueDate") ?? ""
  ).trim();

  const dueDateRaw = String(
    formData.get("dueDate") ?? ""
  ).trim();

  const amountRaw = String(
    formData.get("amount") ?? ""
  ).trim();

  const currency = String(
    formData.get("currency") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? "Draft"
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  if (!validId(projectId)) {
    throw new Error("Invalid project.");
  }

  if (!invoiceNumber) {
    throw new Error("Invoice number is required.");
  }

  if (invoiceNumber.length > 100) {
    throw new Error("Invoice number is too long.");
  }

  const issueDate = parseDate(
    issueDateRaw,
    "invoice issue date"
  );

  const dueDate = dueDateRaw
    ? parseDate(dueDateRaw, "invoice due date")
    : null;

  if (dueDate && dueDate < issueDate) {
    throw new Error(
      "Due date cannot be earlier than issue date."
    );
  }

  const amountValue = Number(amountRaw);

  if (
    amountRaw === "" ||
    !Number.isFinite(amountValue) ||
    amountValue <= 0
  ) {
    throw new Error(
      "Invoice amount must be greater than 0."
    );
  }

  const normalizedAmount = amountValue.toFixed(2);

  if (
    Number(normalizedAmount) <= 0 ||
    !Number.isSafeInteger(
      Math.round(amountValue * 100)
    )
  ) {
    throw new Error("Invalid invoice amount.");
  }

  if (currency !== "GBP" && currency !== "EUR") {
    throw new Error("Invalid invoice currency.");
  }

  // Keep existing status values without inventing
  // a new invoice workflow.
  if (!status || status.length > 50) {
    throw new Error("Invalid invoice status.");
  }

  if (description.length > 5000) {
    throw new Error(
      "Invoice description is too long."
    );
  }

  return {
    projectId,
    invoiceNumber,
    issueDate,
    dueDate,
    amount: normalizedAmount,
    currency,
    status,
    description: description || null,
  };
}

export async function createInvoice() {
  await requireOwner();
  redirect("/quotes");
}

export async function updateInvoice(
  formData: FormData
) {
  // Check authorization before modifying an invoice.
  await requireOwner();

  const invoiceId = Number(
    formData.get("invoiceId")
  );

  if (!validId(invoiceId)) {
    throw new Error("Invalid invoice.");
  }

  const data = parseInvoice(formData);

  const invoice = await db.orm.public.Invoice.first({
    id: invoiceId,
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.projectId !== data.projectId) {
    throw new Error(
      "This invoice does not belong to this project."
    );
  }

  // Prevent reducing the invoice below its recorded
  // payments or changing currency after payments exist.
  const payments = await db.orm.public.Payment
    .where({ invoiceId })
    .all();

  if (payments.length > 0) {
    if (data.currency !== invoice.currency) {
      throw new Error(
        "Invoice currency cannot be changed after payments have been recorded."
      );
    }

    const totalPaidPence = payments.reduce(
      (total, payment) =>
        total + Math.round(Number(payment.amount) * 100),
      0
    );

    const newAmountPence = Math.round(
      Number(data.amount) * 100
    );

    if (newAmountPence < totalPaidPence) {
      throw new Error(
        `Invoice amount cannot be less than the amount already paid (${invoice.currency} ${(totalPaidPence / 100).toFixed(2)}).`
      );
    }
  }

  await db.orm.public.Invoice
    .where({ id: invoiceId })
    .update({
      invoiceNumber: data.invoiceNumber,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      description: data.description,
    });

  redirect(
    `/projects/${data.projectId}/invoices/${invoiceId}`
  );
}

export async function deleteInvoice(
  formData: FormData
) {
  // Check authorization before deleting an invoice.
  await requireOwner();

  const invoiceId = Number(
    formData.get("invoiceId")
  );

  const projectId = Number(
    formData.get("projectId")
  );

  if (!validId(invoiceId) || !validId(projectId)) {
    throw new Error("Invalid invoice.");
  }

  const invoice = await db.orm.public.Invoice.first({
    id: invoiceId,
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.projectId !== projectId) {
    throw new Error(
      "This invoice does not belong to this project."
    );
  }

  // Do not delete invoices that have recorded payments.
  const payments = await db.orm.public.Payment
    .where({ invoiceId })
    .all();

  if (payments.length > 0) {
    return {
      success: false,
      message:
        "This invoice cannot be deleted because it has payments associated with it.",
    };
  }

  await db.orm.public.Invoice
    .where({ id: invoiceId })
    .delete();

  redirect(`/projects/${projectId}/invoices`);
}
