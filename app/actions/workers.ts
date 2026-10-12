
"use server";

import { db } from "@/src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { redirect } from "next/navigation";

// Only authenticated, active owners can manage workers.
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

function validateWorkerId(workerId: number) {
  if (
    !Number.isSafeInteger(workerId) ||
    workerId <= 0
  ) {
    throw new Error("Invalid worker.");
  }
}

function parseWorker(formData: FormData) {
  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const role = String(
    formData.get("role") ?? ""
  ).trim();

  const hourlyRateRaw = String(
    formData.get("hourlyRate") ?? ""
  ).trim();

  const hourlyRateValue = Number(hourlyRateRaw);

  const currency = String(
    formData.get("currency") ?? "GBP"
  );

  const phone = String(
    formData.get("phone") ?? ""
  ).trim();

  const email = String(
    formData.get("email") ?? ""
  ).trim();

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  if (!name) {
    throw new Error("Worker name is required.");
  }

  if (name.length > 200) {
    throw new Error("Worker name is too long.");
  }

  if (
    hourlyRateRaw === "" ||
    !Number.isFinite(hourlyRateValue) ||
    hourlyRateValue < 0
  ) {
    throw new Error(
      "Hourly rate must be a valid number."
    );
  }

  if (currency !== "GBP" && currency !== "EUR") {
    throw new Error("Currency must be GBP or EUR.");
  }

  if (email.length > 254) {
    throw new Error("Email address is too long.");
  }

  if (notes.length > 5000) {
    throw new Error("Notes are too long.");
  }

  return {
    name,
    role: role || null,
    hourlyRate: hourlyRateValue.toFixed(2),
    currency,
    phone: phone || null,
    email: email || null,
    notes: notes || null,
  };
}

export async function createWorker(
  formData: FormData
) {
  // Check authorization before creating a worker.
  await requireOwner();

  const data = parseWorker(formData);

  await db.orm.public.Worker.create({
    ...data,
    status: "Active",
  });

  redirect("/workers");
}

export async function updateWorker(
  workerId: number,
  formData: FormData
) {
  // Check authorization before updating a worker.
  await requireOwner();

  validateWorkerId(workerId);

  const data = parseWorker(formData);

  const status = String(
    formData.get("status") ?? "Active"
  );

  if (
    status !== "Active" &&
    status !== "Inactive"
  ) {
    throw new Error("Invalid worker status.");
  }

  const worker = await db.orm.public.Worker.first({
    id: workerId,
  });

  if (!worker) {
    throw new Error("Worker not found.");
  }

  await db.orm.public.Worker
    .where({ id: workerId })
    .update({
      ...data,
      status,
    });

  redirect("/workers");
}
