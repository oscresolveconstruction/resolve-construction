
"use server";

import { db } from "@/src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { getPayrollPool } from "../lib/payroll-db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type PayrollRecord = {
  id: number;
  workerId: number;
  month: string;
  status: string;
};

type WorkerRecord = {
  hourlyRate: string;
  currency: string;
};

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

export async function reopenMonthlyPayroll(
  formData: FormData
) {
  await requireOwner();

  const payrollId = Number(formData.get("payrollId"));

  if (
    !Number.isSafeInteger(payrollId) ||
    payrollId <= 0
  ) {
    throw new Error("Invalid payroll record.");
  }

  const client = await getPayrollPool().connect();

  try {
    await client.query("BEGIN");

    // Read the payroll identity before taking the advisory lock.
    const identityResult = await client.query<PayrollRecord>(
      `SELECT "id", "workerId", "month", "status"
       FROM public."MonthlyPayroll"
       WHERE "id" = $1`,
      [payrollId]
    );

    const identity = identityResult.rows[0];

    if (!identity) {
      throw new Error("Payroll not found.");
    }

    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(identity.month)
    ) {
      throw new Error("Invalid payroll month.");
    }

    // Same worker/month lock used by Close Payroll
    // and the protected Labour actions.
    const lockKey = `${identity.workerId}:${identity.month}`;

    await client.query(
      "SELECT pg_advisory_xact_lock(741239, hashtext($1::text))",
      [lockKey]
    );

    // Lock the payroll row and verify its identity.
    const payrollResult = await client.query<PayrollRecord>(
      `SELECT "id", "workerId", "month", "status"
       FROM public."MonthlyPayroll"
       WHERE "id" = $1
       FOR UPDATE`,
      [payrollId]
    );

    const payroll = payrollResult.rows[0];

    if (
      !payroll ||
      payroll.workerId !== identity.workerId ||
      payroll.month !== identity.month
    ) {
      throw new Error(
        "Payroll changed during reopening. Please try again."
      );
    }

    if (payroll.status !== "Closed") {
      throw new Error(
        "Only Closed payrolls can be reopened."
      );
    }

    // Get the worker's current provisional hourly rate.
    const workerResult = await client.query<WorkerRecord>(
      `SELECT "hourlyRate", "currency"
       FROM public."Worker"
       WHERE "id" = $1`,
      [payroll.workerId]
    );

    const worker = workerResult.rows[0];

    if (!worker) {
      throw new Error("Worker not found.");
    }

    if (worker.currency !== "GBP") {
      throw new Error(
        "Monthly Payroll currently supports GBP workers only."
      );
    }

    const provisionalRate = Number(worker.hourlyRate);

    if (
      !Number.isFinite(provisionalRate) ||
      provisionalRate < 0
    ) {
      throw new Error("Invalid provisional hourly rate.");
    }

    // Define the exact payroll month in UTC.
    const monthStart =
      `${payroll.month}-01T00:00:00.000Z`;

    const [year, month] = payroll.month
      .split("-")
      .map(Number);

    const nextMonthStart = new Date(
      Date.UTC(year, month, 1)
    ).toISOString();

    // Restore the provisional costs of this worker's
    // labour entries for the selected payroll month.
    await client.query(
      `UPDATE public."Labour"
       SET
         "hourlyRate" = $1::numeric,
         "amount" = ROUND("hours" * $1::numeric, 2),
         "updatedAt" = NOW()
       WHERE "workerId" = $2
         AND "date" >= $3
         AND "date" < $4`,
      [
        provisionalRate.toFixed(2),
        payroll.workerId,
        monthStart,
        nextMonthStart,
      ]
    );

    // Reopen the payroll so hours can be corrected.
    const updated = await client.query(
      `UPDATE public."MonthlyPayroll"
       SET "status" = 'Draft',
           "updatedAt" = NOW()
       WHERE "id" = $1
         AND "status" = 'Closed'
       RETURNING "id"`,
      [payroll.id]
    );

    if (updated.rowCount !== 1) {
      throw new Error("Payroll could not be reopened.");
    }

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Payroll reopening rollback failed:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/monthly-payroll");
  revalidatePath("/labour");
  revalidatePath("/projects");
  revalidatePath("/company-finances");
  revalidatePath("/");

  redirect("/monthly-payroll");
}
