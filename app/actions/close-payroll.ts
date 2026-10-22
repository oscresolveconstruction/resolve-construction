"use server";

import { db } from "@/src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { getPayrollPool } from "../lib/payroll-db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Shares the worker/month advisory lock with app/actions/labour.ts.
// All money is distributed in integer pennies to preserve the exact total.

async function requireOwner() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized. Please sign in.");
  const user = await db.orm.public.AppUser.first({ id: userId });
  if (!user || !user.isActive) {
    throw new Error("Unauthorized. Please sign in.");
  }
}

function moneyToPennies(value: string, label: string): bigint {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  const [pounds, fraction = ""] = value.split(".");
  const pennies = BigInt(pounds) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (pennies > BigInt(100000000)) {
    throw new Error(`${label} exceeds the supported limit.`);
  }
  return pennies;
}

function hoursToHundredths(value: string): bigint {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("Invalid recorded hours.");
  }
  const [whole, fraction = ""] = value.split(".");
  const result = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (result <= BigInt(0)) throw new Error("Recorded hours must be positive.");
  return result;
}

type PayrollRecord = {
  id: number;
  workerId: number;
  month: string;
  status: string;
  grossPay: string;
  employerSocialInsurance: string;
};

type LabourRecord = {
  id: number;
  hours: string;
};

export async function closeMonthlyPayroll(formData: FormData) {
  await requireOwner();

  const payrollId = Number(formData.get("payrollId"));
  if (!Number.isSafeInteger(payrollId) || payrollId <= 0) {
    throw new Error("Invalid payroll record.");
  }

  const client = await getPayrollPool().connect();
  try {
    await client.query("BEGIN");

    // Read identity before taking the advisory lock. Payroll editing actions
    // must use the same advisory lock before changing this worker/month.
    const identity = await client.query<PayrollRecord>(
      `SELECT "id", "workerId", "month", "status", "grossPay", "employerSocialInsurance"
       FROM public."MonthlyPayroll" WHERE "id" = $1`,
      [payrollId]
    );
    const initial = identity.rows[0];
    if (!initial) throw new Error("Payroll not found.");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(initial.month)) {
      throw new Error("Invalid payroll month.");
    }

    const lockKey = `${initial.workerId}:${initial.month}`;
    await client.query(
      "SELECT pg_advisory_xact_lock(741239, hashtext($1::text))",
      [lockKey]
    );

    const currentResult = await client.query<PayrollRecord>(
      `SELECT "id", "workerId", "month", "status", "grossPay", "employerSocialInsurance"
       FROM public."MonthlyPayroll" WHERE "id" = $1 FOR UPDATE`,
      [payrollId]
    );
    const payroll = currentResult.rows[0];
    if (!payroll || payroll.workerId !== initial.workerId || payroll.month !== initial.month) {
      throw new Error("Payroll changed while closing. Please try again.");
    }
    if (payroll.status !== "Draft") {
      throw new Error("Only Draft payrolls can be closed.");
    }

    const workerResult = await client.query<{ currency: string }>(
      `SELECT "currency" FROM public."Worker" WHERE "id" = $1`,
      [payroll.workerId]
    );
    if (workerResult.rows[0]?.currency !== "GBP") {
      throw new Error("Monthly Payroll supports GBP workers only.");
    }

    const monthStart = `${payroll.month}-01T00:00:00.000Z`;
    const [year, month] = payroll.month.split("-").map(Number);
    const nextMonthStart = new Date(Date.UTC(year, month, 1)).toISOString();

    const labourResult = await client.query<LabourRecord>(
      `SELECT "id", "hours" FROM public."Labour"
       WHERE "workerId" = $1 AND "date" >= $2 AND "date" < $3
       ORDER BY "id" FOR UPDATE`,
      [payroll.workerId, monthStart, nextMonthStart]
    );
    if (labourResult.rows.length === 0) {
      throw new Error("This worker has no recorded labour hours for the month.");
    }

    const gross = moneyToPennies(String(payroll.grossPay), "Gross Pay");
    const employerNI = moneyToPennies(
      String(payroll.employerSocialInsurance), "Employer Social Insurance"
    );
    const totalPennies = gross + employerNI;

    const entries = labourResult.rows.map((row) => ({
      id: row.id,
      hourUnits: hoursToHundredths(String(row.hours)),
    }));
    const totalHours = entries.reduce((sum, row) => sum + row.hourUnits, BigInt(0));
    if (totalHours <= BigInt(0)) throw new Error("Total recorded hours must be positive.");

    // Largest remainder: allocate the leftover pennies fairly and exactly.
    const allocations = entries.map((entry) => {
      const numerator = totalPennies * entry.hourUnits;
      return {
        ...entry,
        pennies: numerator / totalHours,
        remainder: numerator % totalHours,
      };
    });
    const allocated = allocations.reduce((sum, row) => sum + row.pennies, BigInt(0));
    const extraPennies = Number(totalPennies - allocated);
    const ranked = [...allocations].sort((a, b) => {
      if (a.remainder === b.remainder) return a.id - b.id;
      return a.remainder > b.remainder ? -1 : 1;
    });
    for (let i = 0; i < extraPennies; i++) ranked[i].pennies += BigInt(1);

    // Stored hourlyRate is indicative (4dp). Stored amount is exact (2dp).
    const hourlyRate = (Number(totalPennies) / Number(totalHours)).toFixed(4);
    for (const row of allocations) {
      const amount = (Number(row.pennies) / 100).toFixed(2);
      await client.query(
        `UPDATE public."Labour"
         SET "hourlyRate" = $1, "amount" = $2, "updatedAt" = NOW()
         WHERE "id" = $3`,
        [hourlyRate, amount, row.id]
      );
    }

    const verification = allocations.reduce((sum, row) => sum + row.pennies, BigInt(0));
    if (verification !== totalPennies) {
      throw new Error("Payroll allocation does not match the full employer cost.");
    }

    await client.query(
      `UPDATE public."MonthlyPayroll"
       SET "status" = 'Closed', "updatedAt" = NOW()
       WHERE "id" = $1 AND "status" = 'Draft'`,
      [payroll.id]
    );
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Payroll close rollback failed:", rollbackError);
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
