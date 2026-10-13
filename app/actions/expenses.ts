"use server";

import { db } from "../../src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { redirect } from "next/navigation";
import {
  saveReceipt,
  removeReceipt,
} from "../lib/receipt-storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

// Only active, authenticated owners may change expenses.
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

function getReceiptFile(formData: FormData) {
  const file = formData.get("receipt");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Receipt must be smaller than 10 MB.");
  }

  if (!ALLOWED_TYPES[file.type]) {
    throw new Error(
      "Only PDF, JPG and PNG files are allowed."
    );
  }

  return file;
}

function parseExpense(formData: FormData) {
  const rawProjectId = String(
    formData.get("projectId") ?? ""
  ).trim();

  // Empty projectId means General Expense.
  const projectId =
    rawProjectId === "" ? null : Number(rawProjectId);

  const date = String(formData.get("date") || "");

  const supplier = String(
    formData.get("supplier") || ""
  ).trim();

  const category = String(
    formData.get("category") || ""
  ).trim();

  const description = String(
    formData.get("description") || ""
  ).trim();

  const amountValue = Number(formData.get("amount"));

  const currency = String(
    formData.get("currency") || ""
  );

  const exchangeRateValue = String(
    formData.get("exchangeRate") || ""
  ).trim();

  if (
    projectId !== null &&
    (!Number.isSafeInteger(projectId) || projectId <= 0)
  ) {
    throw new Error("Invalid project.");
  }

  if (!date || Number.isNaN(Date.parse(date))) {
    throw new Error("Invalid date.");
  }

  if (!supplier) {
    throw new Error("Supplier is required.");
  }

  if (!category) {
    throw new Error("Category is required.");
  }

  if (
    !Number.isFinite(amountValue) ||
    amountValue <= 0
  ) {
    throw new Error(
      "Expense amount must be greater than 0."
    );
  }

  if (currency !== "GBP" && currency !== "EUR") {
    throw new Error("Invalid currency.");
  }

  return {
    projectId,
    date,
    supplier,
    category,
    description: description || null,
    amount: amountValue.toFixed(2),
    currency,
    exchangeRateValue,
  };
}

async function validateExchangeRate(
  projectId: number | null,
  currency: string,
  exchangeRateValue: string
) {
  // General Expenses are reported in GBP.
  const targetCurrency = "GBP";

  if (projectId === null) {
    if (currency === targetCurrency) {
      return null;
    }

    const rate = Number(exchangeRateValue);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(
        "Exchange rate is required when converting EUR to GBP."
      );
    }

    return rate.toString();
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  if (currency === project.currency) {
    return null;
  }

  const rate = Number(exchangeRateValue);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(
      `Exchange rate is required when converting ${currency} to ${project.currency}.`
    );
  }

  return rate.toString();
}

function getExpenseRedirect(projectId: number | null) {
  return projectId === null
    ? "/general-expenses"
    : `/projects/${projectId}/expenses`;
}

export async function createExpense(formData: FormData) {
  await requireOwner();

  const data = parseExpense(formData);

  const exchangeRate = await validateExchangeRate(
    data.projectId,
    data.currency,
    data.exchangeRateValue
  );

  const file = getReceiptFile(formData);
  const receipt = file ? await saveReceipt(file) : null;

  try {
    await db.orm.public.Expense.create({
      projectId: data.projectId,
      date: data.date,
      supplier: data.supplier,
      category: data.category,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      exchangeRate,
      receiptFileName: receipt?.receiptFileName ?? null,
      receiptFilePath: receipt?.receiptFilePath ?? null,
      receiptMimeType: receipt?.receiptMimeType ?? null,
    });
  } catch (error) {
    if (receipt) {
      try {
        await removeReceipt(receipt.receiptFilePath);
      } catch (cleanupError) {
        console.error(
          "Could not clean up uploaded receipt:",
          cleanupError
        );
      }
    }

    throw error;
  }

  redirect(getExpenseRedirect(data.projectId));
}

export async function updateExpense(formData: FormData) {
  await requireOwner();

  const expenseId = Number(formData.get("expenseId"));
  const data = parseExpense(formData);

  if (
    !Number.isSafeInteger(expenseId) ||
    expenseId <= 0
  ) {
    throw new Error("Invalid expense.");
  }

  const expense = await db.orm.public.Expense.first({
    id: expenseId,
  });

  if (!expense) {
    throw new Error("Expense not found.");
  }

  // Prevent moving expenses between sections.
  if (expense.projectId !== data.projectId) {
    throw new Error(
      "The expense project cannot be changed here."
    );
  }

  const exchangeRate = await validateExchangeRate(
    data.projectId,
    data.currency,
    data.exchangeRateValue
  );

  const file = getReceiptFile(formData);
  const newReceipt = file ? await saveReceipt(file) : null;

  try {
    await db.orm.public.Expense
      .where({ id: expenseId })
      .update({
        date: data.date,
        supplier: data.supplier,
        category: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        exchangeRate,
        ...(newReceipt
          ? {
              receiptFileName: newReceipt.receiptFileName,
              receiptFilePath: newReceipt.receiptFilePath,
              receiptMimeType: newReceipt.receiptMimeType,
            }
          : {}),
      });
  } catch (error) {
    if (newReceipt) {
      try {
        await removeReceipt(newReceipt.receiptFilePath);
      } catch (cleanupError) {
        console.error(
          "Could not clean up uploaded receipt:",
          cleanupError
        );
      }
    }

    throw error;
  }

  if (newReceipt && expense.receiptFilePath) {
    try {
      await removeReceipt(expense.receiptFilePath);
    } catch (error) {
      console.error(
        "Could not remove previous receipt:",
        error
      );
    }
  }

  redirect(getExpenseRedirect(data.projectId));
}

export async function deleteExpense(formData: FormData) {
  await requireOwner();

  const expenseId = Number(formData.get("expenseId"));

  const rawProjectId = String(
    formData.get("projectId") ?? ""
  ).trim();

  const projectId =
    rawProjectId === "" ? null : Number(rawProjectId);

  if (
    !Number.isSafeInteger(expenseId) ||
    expenseId <= 0 ||
    (projectId !== null &&
      (!Number.isSafeInteger(projectId) || projectId <= 0))
  ) {
    return {
      success: false,
      message: "Invalid expense.",
    };
  }

  const expense = await db.orm.public.Expense.first({
    id: expenseId,
  });

  if (!expense) {
    return {
      success: false,
      message: "Expense not found.",
    };
  }

  if (expense.projectId !== projectId) {
    return {
      success: false,
      message:
        "This expense does not belong to the selected section.",
    };
  }

  await db.orm.public.Expense
    .where({ id: expenseId })
    .delete();

  if (expense.receiptFilePath) {
    try {
      await removeReceipt(expense.receiptFilePath);
    } catch (error) {
      console.error(
        "Could not remove deleted expense receipt:",
        error
      );
    }
  }

  redirect(getExpenseRedirect(projectId));
}