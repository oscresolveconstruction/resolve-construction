"use server";

import { db } from "@/src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { getPayrollPool } from "../lib/payroll-db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireOwner() {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("Unauthorized. Please sign in.");
  }

  const user = await db.orm.public.AppUser.first({ id: userId });
  if (!user || !user.isActive) {
    throw new Error("Unauthorized. Please sign in.");
  }
}

function parseMoney(
  value: FormDataEntryValue | null,
  fieldName: string
): string {
  const raw = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error(
      `${fieldName} must be a valid amount with up to two decimal places.`
    );
  }

  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) {
    throw new Error(`Invalid ${fieldName}.`);
  }
  return amount.toFixed(2);
}

function parseMonth(value: FormDataEntryValue | null): string {
  const month = String(value ?? "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Month must be in YYYY-MM format.");
  }
  return month;
}

function parseId(value: FormDataEntryValue | null, label: string): number {
  const raw = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(`Invalid ${label}.`);
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) {
    throw new Error(`Invalid ${label}.`);
  }
  return id;
}

type PayrollIdentity = {
  id: number;
  workerId: number;
  month: string;
  status: string;
};

export async function createMonthlyPayroll(formData: FormData) {
  await requireOwner();

  const workerId = parseId(formData.get("workerId"), "worker");
  const month = parseMonth(formData.get("month"));
  const grossPay = parseMoney(formData.get("grossPay"), "Gross Pay");
  const employerSocialInsurance = parseMoney(
    formData.get("employerSocialInsurance"),
    "Employer Social Insurance"
  );

  const worker = await db.orm.public.Worker.first({ id: workerId });
  if (!worker) {
    throw new Error("Worker not found.");
  }
  if (worker.currency !== "GBP") {
    throw new Error("Monthly Payroll currently supports GBP workers only.");
  }

  // The unique database constraint additionally prevents concurrent duplicates.
  const existing = await db.orm.public.MonthlyPayroll.first({ workerId, month });
  if (existing) {
    throw new Error(`A payroll record already exists for ${worker.name} in ${month}.`);
  }

  await db.orm.public.MonthlyPayroll.create({
    workerId,
    month,
    grossPay,
    employerSocialInsurance,
    status: "Draft",
  });

  revalidatePath("/monthly-payroll");
  redirect("/monthly-payroll");
}

/**
 * Edits monetary values only. Worker and month cannot be changed here,
 * and Closed payroll must first be reopened via the dedicated action.
 * Uses the same advisory lock as Close Payroll and Labour operations.
 */
export async function updateMonthlyPayroll(
  payrollId: number,
  formData: FormData
) {
  await requireOwner();

  if (!Number.isSafeInteger(payrollId) || payrollId <= 0) {
    throw new Error("Invalid payroll record.");
  }

  const grossPay = parseMoney(formData.get("grossPay"), "Gross Pay");
  const employerSocialInsurance = parseMoney(
    formData.get("employerSocialInsurance"),
    "Employer Social Insurance"
  );

  const client = await getPayrollPool().connect();
  try {
    await client.query("BEGIN");

    // Identify the worker/month before taking the same lock as Close Payroll.
    const identityResult = await client.query<PayrollIdentity>(
      `SELECT "id", "workerId", "month", "status"
       FROM public."MonthlyPayroll" WHERE "id" = $1`,
      [payrollId]
    );
    const identity = identityResult.rows[0];
    if (!identity) {
      throw new Error("Payroll not found.");
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(identity.month)) {
      throw new Error("Invalid payroll month.");
    }

    await client.query(
      "SELECT pg_advisory_xact_lock(741239, hashtext($1::text))",
      [`${identity.workerId}:${identity.month}`]
    );

    const lockedResult = await client.query<PayrollIdentity>(
      `SELECT "id", "workerId", "month", "status"
       FROM public."MonthlyPayroll" WHERE "id" = $1 FOR UPDATE`,
      [payrollId]
    );
    const payroll = lockedResult.rows[0];
    if (
      !payroll ||
      payroll.workerId !== identity.workerId ||
      payroll.month !== identity.month
    ) {
      throw new Error("Payroll changed while editing. Please try again.");
    }
    if (payroll.status !== "Draft") {
      throw new Error("Only Draft payrolls can be edited. Reopen the payroll first.");
    }

    const updated = await client.query(
      `UPDATE public."MonthlyPayroll"
       SET "grossPay" = $1::numeric,
           "employerSocialInsurance" = $2::numeric,
           "updatedAt" = NOW()
       WHERE "id" = $3 AND "status" = 'Draft'
       RETURNING "id"`,
      [grossPay, employerSocialInsurance, payrollId]
    );
    if (updated.rowCount !== 1) {
      throw new Error("Could not update the payroll.");
    }

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Payroll update rollback failed:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/monthly-payroll");
  revalidatePath("/company-finances");
  redirect("/monthly-payroll");
}
