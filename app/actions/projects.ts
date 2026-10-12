"use server";

import { db } from "../../src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const ALLOWED_STATUSES = ["Planning", "Active", "On Hold", "Completed"];

async function requireOwner() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized. Please sign in.");
  const user = await db.orm.public.AppUser.first({ id: userId });
  if (!user || !user.isActive) throw new Error("Unauthorized. Please sign in.");
}

function parseStartDate(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid project start date.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Invalid project start date.");
  }
  return date.toISOString();
}

async function parseProjectFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const customerId = Number(formData.get("customerId"));
  const contractValue = String(formData.get("contractValue") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const status = String(formData.get("status") ?? "Planning").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) throw new Error("Project name is required.");
  if (name.length > 200) throw new Error("Project name is too long.");
  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    throw new Error("Please select a valid customer.");
  }
  const customer = await db.orm.public.Customer.first({ id: customerId });
  if (!customer) throw new Error("Selected customer does not exist.");

  // Reject exponent notation and more than two decimal places.
  if (!/^\d+(\.\d{1,2})?$/.test(contractValue)) {
    throw new Error("Enter a valid contract value with up to two decimal places.");
  }
  const contractAmount = Number(contractValue);
  if (!Number.isFinite(contractAmount) || !Number.isSafeInteger(Math.round(contractAmount * 100))) {
    throw new Error("Contract value is too large.");
  }
  if (!ALLOWED_STATUSES.includes(status)) throw new Error("Invalid project status.");
  if (description.length > 5000) throw new Error("Project description is too long.");

  return {
    name,
    client: customer.name,
    customerId: customer.id,
    contractValue: contractAmount.toFixed(2),
    startDate: parseStartDate(startDate),
    status,
    description: description || null,
  };
}

export async function createProject(formData: FormData) {
  await requireOwner();
  const data = await parseProjectFields(formData);
  await db.orm.public.Project.create({ ...data, currency: "GBP" });
  revalidatePath("/projects");
  revalidatePath("/customers");
  revalidatePath("/");
  redirect("/projects");
}

export async function updateProject(formData: FormData) {
  await requireOwner();
  const projectId = Number(formData.get("projectId"));
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new Error("Invalid project.");
  }
  const existing = await db.orm.public.Project.first({ id: projectId });
  if (!existing) throw new Error("Project not found.");

  const data = await parseProjectFields(formData);
  await db.orm.public.Project.where({ id: projectId }).update(data);

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  revalidatePath(`/projects/${projectId}/payments`);
  revalidatePath("/company-finances");
  revalidatePath("/customers");
  redirect(`/projects/${projectId}`);
}
