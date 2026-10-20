"use server";

import { db } from "../../src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Pool } from "pg";

const deletionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

async function requireOwner() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized. Please sign in.");
  const user = await db.orm.public.AppUser.first({ id: userId });
  if (!user || !user.isActive) {
    throw new Error("Unauthorized. Please sign in.");
  }
}

function requireId(formData: FormData): number {
  const value = String(formData.get("recordId") ?? "");
  if (!/^[1-9]\d*$/.test(value)) throw new Error("Invalid record ID.");
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new Error("Invalid record ID.");
  return id;
}

function requireConfirmation(formData: FormData, name: string) {
  if (formData.get("confirmation") !== `DELETE ${name}`) {
    throw new Error("Deletion cancelled. Confirmation does not match.");
  }
}

export async function deleteCustomer(formData: FormData) {
  await requireOwner();
  const id = requireId(formData);
  const client = await deletionPool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ name: string }>(
      'SELECT "name" FROM public."Customer" WHERE "id" = $1 FOR UPDATE',
      [id]
    );
    if (existing.rowCount !== 1) throw new Error("Customer not found.");
    requireConfirmation(formData, existing.rows[0].name);

    const deleted = await client.query(
      `DELETE FROM public."Customer" AS c
       WHERE c."id" = $1
         AND NOT EXISTS (
           SELECT 1 FROM public."Project" AS p
           WHERE p."customerId" = c."id"
         )
       RETURNING c."id"`,
      [id]
    );
    if (deleted.rowCount !== 1) {
      throw new Error("Customer has associated projects and cannot be deleted.");
    }
    await client.query("COMMIT");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) {
      console.error("Could not roll back customer deletion:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
  revalidatePath("/customers");
  revalidatePath("/projects");
  redirect("/customers");
}

export async function deleteWorker(formData: FormData) {
  await requireOwner();
  const id = requireId(formData);
  const client = await deletionPool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ name: string }>(
      'SELECT "name" FROM public."Worker" WHERE "id" = $1 FOR UPDATE',
      [id]
    );
    if (existing.rowCount !== 1) throw new Error("Worker not found.");
    requireConfirmation(formData, existing.rows[0].name);

    const deleted = await client.query(
      `DELETE FROM public."Worker" AS w
       WHERE w."id" = $1
         AND NOT EXISTS (
           SELECT 1 FROM public."Labour" AS l
           WHERE l."workerId" = w."id"
         )
       RETURNING w."id"`,
      [id]
    );
    if (deleted.rowCount !== 1) {
      throw new Error("Worker has labour history and cannot be deleted.");
    }
    await client.query("COMMIT");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) {
      console.error("Could not roll back worker deletion:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
  revalidatePath("/workers");
  revalidatePath("/labour");
  redirect("/workers");
}
