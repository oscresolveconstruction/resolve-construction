"use server";

import { db } from "../../src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  saveReceipt,
  removeReceipt,
} from "../lib/receipt-storage";

import {getPayrollPool} from "../lib/payroll-db";
import {createMovementOnce} from "../lib/finance/requests.mjs";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

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
  return user.id;
}

function validId(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function textField(
  formData: FormData,
  key: string
): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function parsePayment(formData: FormData) {
  const projectId = Number(textField(formData, "projectId"));
  const dateText = textField(formData, "date");
  const amountText = textField(formData, "amount");
  const currency = textField(formData, "currency");
  const reference = textField(formData, "reference");
  const description = textField(formData, "description");
  const method = textField(formData, "paymentMethod");

  if (!validId(projectId)) {
    throw new Error("Invalid project.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error("Invalid payment date.");
  }

  const date = new Date(dateText + "T12:00:00.000Z");

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateText
  ) {
    throw new Error("Invalid payment date.");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
    throw new Error(
      "Enter a valid amount with up to 2 decimal places."
    );
  }

  const amountNumber = Number(amountText);

  if (
    !Number.isFinite(amountNumber) ||
    amountNumber <= 0 ||
    amountNumber > 999999999
  ) {
    throw new Error(
      "Payment amount must be between 0.01 and 999999999."
    );
  }

  if (currency !== "GBP" && currency !== "EUR") {
    throw new Error("Invalid payment currency.");
  }

  if (reference.length > 200) {
    throw new Error("Reference is too long.");
  }

  if (description.length > 2000) {
    throw new Error("Description is too long.");
  }

  const methods = [
    "Bank Transfer",
    "Cash",
    "Cheque",
    "Card",
    "Other",
  ];

  if (method && !methods.includes(method)) {
    throw new Error("Invalid payment method.");
  }

  return {
    projectId,
    date: date.toISOString(),
    amount: amountNumber.toFixed(2),
    currency,
    reference: reference || null,
    description: description || null,
    paymentMethod: method || null,
  };
}

async function validateProject(projectId: number) {
  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  return project;
}

function receiptFromForm(formData: FormData): File | null {
  const value = formData.get("receipt");

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  if (value.size > MAX_RECEIPT_BYTES) {
    throw new Error("Receipt must be 10 MB or smaller.");
  }

  return value;
}

// Detect the actual file format rather than trusting its name.
async function savePaymentReceipt(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  let mimeType: string;

  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    mimeType = "application/pdf";
  } else if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    mimeType = "image/jpeg";
  } else if (
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value
    )
  ) {
    mimeType = "image/png";
  } else {
    throw new Error(
      "Only PDF, JPG and PNG receipts are allowed."
    );
  }

  const safeName =
    file.name
      .replace(/[\x00-\x1f\x7f]/g, "")
      .replace(/[\\/]/g, "_")
      .slice(0, 200) || "payment-receipt";

  const verifiedFile = new File(
    [bytes],
    safeName,
    { type: mimeType }
  );

  return saveReceipt(verifiedFile);
}

// Cleanup errors should not undo a successful database change.
async function safeDeleteReceipt(
  storagePath: string | null
) {
  if (!storagePath) return;

  try {
    await removeReceipt(storagePath);
  } catch (error) {
    console.error(
      "Could not remove payment receipt:",
      error
    );
  }
}

function revalidatePaymentPages(projectId: number) {
  revalidatePath("/projects/" + projectId);
  revalidatePath("/projects/" + projectId + "/payments");
}

export async function createPayment(formData: FormData) {
  const actor=await requireOwner();

  const data = parsePayment(formData);

  await validateProject(data.projectId);

  const receipt = receiptFromForm(formData);

  const saved = receipt
    ? await savePaymentReceipt(receipt)
    : null;

  try {
    const result=await createMovementOnce(getPayrollPool(),{kind:"payment",requestId:formData.get("requestId"),actor,data:{
      ...data,
      invoiceId: null,
      receiptFileName: saved?.receiptFileName ?? null,
      receiptFilePath: saved?.receiptFilePath ?? null,
      receiptMimeType: saved?.receiptMimeType ?? null,
    }});
    if(result.duplicate&&saved)await safeDeleteReceipt(saved.receiptFilePath);
  } catch (error) {
    if (saved) {
      await safeDeleteReceipt(saved.receiptFilePath);
    }

    throw error;
  }

  revalidatePaymentPages(data.projectId);

  redirect("/projects/" + data.projectId + "/payments");
}

export async function updatePayment(formData: FormData) {
  await requireOwner();

  const paymentId = Number(
    textField(formData, "paymentId")
  );

  if (!validId(paymentId)) {
    throw new Error("Invalid payment.");
  }

  const data = parsePayment(formData);

  const current = await db.orm.public.Payment.first({
    id: paymentId,
  });

  if (!current) {
    throw new Error("Payment not found.");
  }

  if (current.projectId !== data.projectId) {
    throw new Error(
      "Payment does not belong to this project."
    );
  }

  await validateProject(data.projectId);

  const receipt = receiptFromForm(formData);

  const saved = receipt
    ? await savePaymentReceipt(receipt)
    : null;

  try {
    await db.orm.public.Payment
      .where({ id: paymentId })
      .update({
        ...data,
        ...(saved
          ? {
              receiptFileName: saved.receiptFileName,
              receiptFilePath: saved.receiptFilePath,
              receiptMimeType: saved.receiptMimeType,
            }
          : {}),
      });
  } catch (error) {
    if (saved) {
      await safeDeleteReceipt(saved.receiptFilePath);
    }

    throw error;
  }

  if (saved && current.receiptFilePath) {
    await safeDeleteReceipt(current.receiptFilePath);
  }

  revalidatePaymentPages(data.projectId);

  redirect("/projects/" + data.projectId + "/payments");
}

export async function deletePayment(formData: FormData) {
  await requireOwner();

  const paymentId = Number(
    textField(formData, "paymentId")
  );

  const projectId = Number(
    textField(formData, "projectId")
  );

  if (!validId(paymentId) || !validId(projectId)) {
    return {
      success: false,
      message: "Invalid payment.",
    };
  }

  const payment = await db.orm.public.Payment.first({
    id: paymentId,
  });

  if (!payment) {
    return {
      success: false,
      message: "Payment not found.",
    };
  }

  if (payment.projectId !== projectId) {
    return {
      success: false,
      message:
        "This payment does not belong to this project.",
    };
  }

  await db.orm.public.Payment
    .where({ id: paymentId })
    .delete();

  await safeDeleteReceipt(payment.receiptFilePath);

  revalidatePaymentPages(projectId);

  redirect("/projects/" + projectId + "/payments");
}

// Remove the receipt without deleting the payment.
export async function removePaymentReceipt(
  formData: FormData
) {
  await requireOwner();

  const paymentId = Number(
    textField(formData, "paymentId")
  );

  const projectId = Number(
    textField(formData, "projectId")
  );

  if (!validId(paymentId) || !validId(projectId)) {
    throw new Error("Invalid payment.");
  }

  const payment = await db.orm.public.Payment.first({
    id: paymentId,
  });

  if (!payment || payment.projectId !== projectId) {
    throw new Error(
      "Payment not found in this project."
    );
  }

  if (payment.receiptFilePath) {
    const oldPath = payment.receiptFilePath;

    await db.orm.public.Payment
      .where({ id: paymentId })
      .update({
        receiptFileName: null,
        receiptFilePath: null,
        receiptMimeType: null,
      });

    await safeDeleteReceipt(oldPath);
  }

  revalidatePaymentPages(projectId);

  revalidatePath(
    "/projects/" +
      projectId +
      "/payments/" +
      paymentId +
      "/edit"
  );

  redirect(
    "/projects/" +
      projectId +
      "/payments/" +
      paymentId +
      "/edit"
  );
}