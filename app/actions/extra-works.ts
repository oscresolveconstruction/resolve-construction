"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../src/prisma/db";
import { getSessionUserId } from "../lib/auth";

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

function getText(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveAmount(value: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error(
      "Enter a valid amount with up to 2 decimal places."
    );
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 999999999
  ) {
    throw new Error("Enter a valid positive amount.");
  }

  return amount.toFixed(2);
}

function parseDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Enter a valid date.");
  }

  const date = new Date(value + "T12:00:00.000Z");

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Enter a valid date.");
  }

  return date.toISOString();
}

function validateStatus(value: string): string {
  const allowedStatuses = [
    "Pending",
    "Approved",
    "Rejected",
  ];

  if (!allowedStatuses.includes(value)) {
    throw new Error("Invalid extra work status.");
  }

  return value;
}

// CREATE EXTRA WORK

export async function createExtraWork(formData: FormData) {
  await requireOwner();

  const projectId = Number(getText(formData, "projectId"));
  const title = getText(formData, "title");
  const description = getText(formData, "description");
  const amount = parsePositiveAmount(
    getText(formData, "amount")
  );
  const date = parseDate(getText(formData, "date"));
  const status = validateStatus(
    getText(formData, "status") || "Pending"
  );

  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new Error("Invalid project.");
  }

  if (!title || title.length > 200) {
    throw new Error(
      "Title must be between 1 and 200 characters."
    );
  }

  if (description.length > 2000) {
    throw new Error("Description is too long.");
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  if (project.currency !== "GBP") {
    throw new Error(
      "Extra Works currently supports GBP projects."
    );
  }

  await db.orm.public.ExtraWork.create({
    projectId,
    date,
    title,
    description: description || null,
    amount,
    currency: "GBP",
    status,
  });

  revalidatePath("/projects/" + projectId);
  revalidatePath("/projects/" + projectId + "/extra-works");
}

// UPDATE EXTRA WORK

export async function updateExtraWork(formData: FormData) {
  await requireOwner();

  const id = Number(getText(formData, "id"));
  const title = getText(formData, "title");
  const description = getText(formData, "description");
  const amount = parsePositiveAmount(
    getText(formData, "amount")
  );
  const date = parseDate(getText(formData, "date"));
  const status = validateStatus(
    getText(formData, "status")
  );

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid extra work.");
  }

  if (!title || title.length > 200) {
    throw new Error(
      "Title must be between 1 and 200 characters."
    );
  }

  if (description.length > 2000) {
    throw new Error("Description is too long.");
  }

  const extraWork = await db.orm.public.ExtraWork.first({
    id,
  });

  if (!extraWork) {
    throw new Error("Extra work not found.");
  }

  if (extraWork.status === "Approved") {
    throw new Error("Approved extra works cannot be edited. Create a new extra work for changes.");
  }

  await db.orm.public.ExtraWork.where({ id }).update({
    title,
    description: description || null,
    amount,
    date,
    status,
  });

  revalidatePath(
    "/projects/" + extraWork.projectId
  );

  revalidatePath(
    "/projects/" + extraWork.projectId + "/extra-works"
  );
}

// DELETE EXTRA WORK

export async function deleteExtraWork(formData: FormData) {
  await requireOwner();

  const id = Number(getText(formData, "id"));

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid extra work.");
  }

  const extraWork = await db.orm.public.ExtraWork.first({
    id,
  });

  if (!extraWork) {
    throw new Error("Extra work not found.");
  }

  if (extraWork.status === "Approved") {
    throw new Error("Approved extra works cannot be deleted.");
  }

  await db.orm.public.ExtraWork.where({ id }).delete();

  revalidatePath(
    "/projects/" + extraWork.projectId
  );

  revalidatePath(
    "/projects/" + extraWork.projectId + "/extra-works"
  );
}