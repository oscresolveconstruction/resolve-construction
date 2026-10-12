
"use server";

import { db } from "@/src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { redirect } from "next/navigation";

type LabourRow = {
  workerId: number;
  projectId: number;
  hours: number;
};

// Only authenticated, active owners can modify labour.
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

function parseLabourDate(value: FormDataEntryValue | null) {
  const date = String(value ?? "").trim();

  // Require a real date in YYYY-MM-DD format.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date.");
  }

  const parsedDate = new Date(`${date}T12:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Invalid date.");
  }

  return parsedDate.toISOString();
}

function validateHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("Hours must be greater than 0.");
  }

  if (hours > 24) {
    throw new Error(
      "Hours cannot exceed 24 for one entry."
    );
  }

  // Labour hours are recorded with two decimal places.
  const normalizedHours = Number(hours.toFixed(2));

  if (normalizedHours <= 0) {
    throw new Error(
      "Hours must be at least 0.01."
    );
  }

  return normalizedHours;
}

async function prepareLabourEntry(
  workerId: number,
  projectId: number,
  hours: number
) {
  if (!validId(workerId)) {
    throw new Error("Invalid worker.");
  }

  if (!validId(projectId)) {
    throw new Error("Invalid project.");
  }

  const validHours = validateHours(hours);

  const worker = await db.orm.public.Worker.first({
    id: workerId,
  });

  if (!worker) {
    throw new Error("Worker not found.");
  }

  if (worker.status !== "Active") {
    throw new Error(`${worker.name} is inactive.`);
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  // Keep the existing rule: currency must match.
  if (worker.currency !== project.currency) {
    throw new Error(
      `${worker.name} is paid in ${worker.currency}, but ${project.name} uses ${project.currency}. Currency conversion is required.`
    );
  }

  const hourlyRate = Number(worker.hourlyRate);

  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new Error("Invalid hourly rate.");
  }

  const amount = validHours * hourlyRate;

  if (!Number.isFinite(amount)) {
    throw new Error("Invalid labour amount.");
  }

  return {
    workerId,
    projectId,
    hours: validHours.toFixed(2),
    hourlyRate: hourlyRate.toFixed(2),
    amount: amount.toFixed(2),
    currency: worker.currency,
    exchangeRate: null,
  };
}

export async function createDailyLabour(
  formData: FormData
) {
  // Security check before creating labour records.
  await requireOwner();

  const date = parseLabourDate(formData.get("date"));
  const rowsJson = String(formData.get("rows") || "[]");

  let rows: LabourRow[];

  try {
    rows = JSON.parse(rowsJson);
  } catch {
    throw new Error("Invalid labour data.");
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Add at least one labour entry.");
  }

  if (rows.length > 100) {
    throw new Error(
      "You can add a maximum of 100 labour entries at once."
    );
  }

  // Validate all entries before writing to the database.
  // This avoids saving some entries before discovering
  // that a later entry is invalid.
  const preparedRows = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      throw new Error("Invalid labour entry.");
    }

    const workerId = Number(row.workerId);
    const projectId = Number(row.projectId);
    const hours = Number(row.hours);

    const prepared = await prepareLabourEntry(
      workerId,
      projectId,
      hours
    );

    preparedRows.push(prepared);
  }

  for (const row of preparedRows) {
    await db.orm.public.Labour.create({
      ...row,
      date,
      description: null,
    });
  }

  redirect("/labour");
}

export async function updateLabour(
  labourId: number,
  formData: FormData
) {
  // Security check before modifying labour.
  await requireOwner();

  if (!validId(labourId)) {
    throw new Error("Invalid labour entry.");
  }

  const date = parseLabourDate(formData.get("date"));

  const workerId = Number(formData.get("workerId"));
  const projectId = Number(formData.get("projectId"));
  const hours = Number(formData.get("hours"));

  const labour = await db.orm.public.Labour.first({
    id: labourId,
  });

  if (!labour) {
    throw new Error("Labour entry not found.");
  }

  const prepared = await prepareLabourEntry(
    workerId,
    projectId,
    hours
  );

  await db.orm.public.Labour
    .where({ id: labourId })
    .update({
      ...prepared,
      date,
    });

  redirect("/labour");
}

export async function deleteLabour(labourId: number) {
  // Security check before deleting labour.
  await requireOwner();

  if (!validId(labourId)) {
    throw new Error("Invalid labour entry.");
  }

  const labour = await db.orm.public.Labour.first({
    id: labourId,
  });

  if (!labour) {
    throw new Error("Labour entry not found.");
  }

  await db.orm.public.Labour
    .where({ id: labourId })
    .delete();

  redirect("/labour");
}
