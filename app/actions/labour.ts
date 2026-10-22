"use server";

import { db } from "@/src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { getPayrollPool } from "../lib/payroll-db";
import { redirect } from "next/navigation";
import type { PoolClient } from "pg";

type LabourRow = {
  workerId: number;
  projectId: number;
  hours: number;
};

type ExistingLabour = {
  id: number;
  workerId: number;
  date: Date | string;
};

async function requireOwner() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized. Please sign in.");
  const user = await db.orm.public.AppUser.first({ id: userId });
  if (!user || !user.isActive) {
    throw new Error("Unauthorized. Please sign in.");
  }
}

function validId(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function parseLabourDate(value: FormDataEntryValue | null): string {
  const date = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date.");
  }
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Invalid date.");
  }
  return parsed.toISOString();
}

function monthOf(value: Date | string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid labour date.");
  }
  return parsed.toISOString().slice(0, 7);
}

function validateHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0 || value > 24) {
    throw new Error("Hours must be greater than 0 and at most 24.");
  }
  const hours = Number(value.toFixed(2));
  if (hours < 0.01) throw new Error("Hours must be at least 0.01.");
  return hours.toFixed(2);
}

/**
 * This advisory lock MUST ALSO be acquired by Close/Reopen Payroll before
 * it reads or modifies Labour rows for a worker/month. This prevents a
 * labour write racing with a payroll close.
 *
 * All callers acquire locks in sorted order to reduce deadlock risk.
 */
async function lockWorkerMonths(
  client: PoolClient,
  keys: Array<{ workerId: number; month: string }>
): Promise<void> {
  const unique = [...new Set(keys.map((key) => `${key.workerId}:${key.month}`))].sort();
  for (const key of unique) {
    await client.query(
      "SELECT pg_advisory_xact_lock(741239, hashtext($1::text))",
      [key]
    );
  }
}

async function assertOpenInTransaction(
  client: PoolClient,
  keys: Array<{ workerId: number; month: string }>
): Promise<void> {
  for (const key of keys) {
    const result = await client.query<{ status: string }>(
      `SELECT "status" FROM public."MonthlyPayroll"
       WHERE "workerId" = $1 AND "month" = $2`,
      [key.workerId, key.month]
    );
    if (result.rows.some((row) => row.status === "Closed")) {
      throw new Error(
        `Payroll for ${key.month} is closed. Reopen it before changing labour entries.`
      );
    }
  }
}

type Prepared = {
  workerId: number;
  projectId: number;
  hours: string;
  hourlyRate: string;
  amount: string;
  currency: string;
};

async function prepareEntry(
  client: PoolClient,
  workerId: number,
  projectId: number,
  hoursInput: number
): Promise<Prepared> {
  if (!validId(workerId)) throw new Error("Invalid worker.");
  if (!validId(projectId)) throw new Error("Invalid project.");
  const hours = validateHours(hoursInput);

  const workerResult = await client.query<{
    name: string;
    status: string;
    currency: string;
    hourlyRate: string;
  }>(
    `SELECT "name", "status", "currency", "hourlyRate"
     FROM public."Worker" WHERE "id" = $1`,
    [workerId]
  );
  const worker = workerResult.rows[0];
  if (!worker) throw new Error("Worker not found.");
  if (worker.status !== "Active") {
    throw new Error(`${worker.name} is inactive.`);
  }

  const projectResult = await client.query<{ name: string; currency: string }>(
    `SELECT "name", "currency" FROM public."Project" WHERE "id" = $1`,
    [projectId]
  );
  const project = projectResult.rows[0];
  if (!project) throw new Error("Project not found.");
  if (worker.currency !== project.currency) {
    throw new Error(
      `${worker.name} is paid in ${worker.currency}, but ${project.name} uses ${project.currency}. Currency conversion is required.`
    );
  }

  const hourlyRate = Number(worker.hourlyRate);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new Error("Invalid hourly rate.");
  }
  const amount = Number(hours) * hourlyRate;
  if (!Number.isFinite(amount)) {
    throw new Error("Invalid labour amount.");
  }

  return {
    workerId,
    projectId,
    hours,
    hourlyRate: hourlyRate.toFixed(2),
    amount: amount.toFixed(2),
    currency: worker.currency,
  };
}

export async function createDailyLabour(formData: FormData) {
  await requireOwner();
  const date = parseLabourDate(formData.get("date"));
  const rowsJson = String(formData.get("rows") ?? "[]");
  let rows: unknown;
  try {
    rows = JSON.parse(rowsJson);
  } catch {
    throw new Error("Invalid labour data.");
  }
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100) {
    throw new Error("Add between 1 and 100 labour entries.");
  }

  const parsedRows: LabourRow[] = rows.map((row: unknown) => {
    if (!row || typeof row !== "object") {
      throw new Error("Invalid labour entry.");
    }
    const item = row as Record<string, unknown>;
    const workerId = Number(item.workerId);
    const projectId = Number(item.projectId);
    const hours = Number(item.hours);
    if (!validId(workerId) || !validId(projectId)) {
      throw new Error("Invalid worker or project.");
    }
    validateHours(hours);
    return { workerId, projectId, hours };
  });

  const client = await getPayrollPool().connect();
  try {
    await client.query("BEGIN");
    const keys = parsedRows.map((row) => ({
      workerId: row.workerId,
      month: monthOf(date),
    }));
    await lockWorkerMonths(client, keys);
    await assertOpenInTransaction(client, keys);

    const prepared: Prepared[] = [];
    for (const row of parsedRows) {
      prepared.push(await prepareEntry(client, row.workerId, row.projectId, row.hours));
    }
    for (const row of prepared) {
      await client.query(
        `INSERT INTO public."Labour"
         ("workerId", "projectId", "date", "hours", "hourlyRate",
          "amount", "currency", "exchangeRate", "description", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NOW(), NOW())`,
        [row.workerId, row.projectId, date, row.hours, row.hourlyRate, row.amount, row.currency]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) {
      console.error("Labour creation rollback failed:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
  redirect("/labour");
}

export async function updateLabour(labourId: number, formData: FormData) {
  await requireOwner();
  if (!validId(labourId)) throw new Error("Invalid labour entry.");
  const date = parseLabourDate(formData.get("date"));
  const workerId = Number(formData.get("workerId"));
  const projectId = Number(formData.get("projectId"));
  const hours = Number(formData.get("hours"));
  if (!validId(workerId) || !validId(projectId)) {
    throw new Error("Invalid worker or project.");
  }
  validateHours(hours);

  const client = await getPayrollPool().connect();
  try {
    await client.query("BEGIN");
    // Read first, then acquire advisory locks BEFORE locking the Labour row.
    const originalResult = await client.query<ExistingLabour>(
      `SELECT "id", "workerId", "date" FROM public."Labour" WHERE "id" = $1`,
      [labourId]
    );
    const original = originalResult.rows[0];
    if (!original) throw new Error("Labour entry not found.");

    const keys = [
      { workerId: original.workerId, month: monthOf(original.date) },
      { workerId, month: monthOf(date) },
    ];
    await lockWorkerMonths(client, keys);

    const currentResult = await client.query<ExistingLabour>(
      `SELECT "id", "workerId", "date"
       FROM public."Labour" WHERE "id" = $1 FOR UPDATE`,
      [labourId]
    );
    const current = currentResult.rows[0];
    if (!current) throw new Error("Labour entry no longer exists.");
    if (
      current.workerId !== original.workerId ||
      monthOf(current.date) !== monthOf(original.date)
    ) {
      throw new Error("Labour entry changed concurrently. Please try again.");
    }
    await assertOpenInTransaction(client, keys);
    const prepared = await prepareEntry(client, workerId, projectId, hours);
    await client.query(
      `UPDATE public."Labour"
       SET "workerId" = $1, "projectId" = $2, "date" = $3,
           "hours" = $4, "hourlyRate" = $5, "amount" = $6,
           "currency" = $7, "exchangeRate" = NULL, "updatedAt" = NOW()
       WHERE "id" = $8`,
      [prepared.workerId, prepared.projectId, date, prepared.hours,
        prepared.hourlyRate, prepared.amount, prepared.currency, labourId]
    );
    await client.query("COMMIT");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) {
      console.error("Labour update rollback failed:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
  redirect("/labour");
}

export async function deleteLabour(labourId: number) {
  await requireOwner();
  if (!validId(labourId)) throw new Error("Invalid labour entry.");
  const client = await getPayrollPool().connect();
  try {
    await client.query("BEGIN");
    const originalResult = await client.query<ExistingLabour>(
      `SELECT "id", "workerId", "date" FROM public."Labour" WHERE "id" = $1`,
      [labourId]
    );
    const original = originalResult.rows[0];
    if (!original) throw new Error("Labour entry not found.");
    const key = { workerId: original.workerId, month: monthOf(original.date) };
    await lockWorkerMonths(client, [key]);
    const currentResult = await client.query<ExistingLabour>(
      `SELECT "id", "workerId", "date" FROM public."Labour"
       WHERE "id" = $1 FOR UPDATE`,
      [labourId]
    );
    const current = currentResult.rows[0];
    if (!current) throw new Error("Labour entry no longer exists.");
    if (
      current.workerId !== original.workerId ||
      monthOf(current.date) !== monthOf(original.date)
    ) {
      throw new Error("Labour entry changed concurrently. Please try again.");
    }
    await assertOpenInTransaction(client, [key]);
    await client.query(`DELETE FROM public."Labour" WHERE "id" = $1`, [labourId]);
    await client.query("COMMIT");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) {
      console.error("Labour deletion rollback failed:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
  redirect("/labour");
}
