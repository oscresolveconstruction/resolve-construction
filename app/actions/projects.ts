
"use server";

import { db } from "../../src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Pool } from "pg";
import { cleanupProjectStorage } from "../lib/storage-cleanup";

const ALLOWED_STATUSES = [
  "Planning",
  "Active",
  "On Hold",
  "Completed",
];

const projectDeletionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

function validProjectId(value: unknown): number {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid project ID.");
  }

  return id;
}

function validProjectPhotoPath(
  path: string,
  projectId: number
): boolean {
  const match =
    /^project-photos\/([1-9]\d*)\/([a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}\.(?:jpg|png|webp))$/i.exec(
      path
    );

  return match !== null && match[1] === String(projectId);
}

function validReceiptPath(path: string): boolean {
  return /^receipts\/[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(path);
}

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

function parseStartDate(value: string): string | null {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid project start date.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Invalid project start date.");
  }

  return date.toISOString();
}

async function parseProjectFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const customerId = Number(formData.get("customerId"));
  const contractValue = String(
    formData.get("contractValue") ?? ""
  ).trim();
  const startDate = String(
    formData.get("startDate") ?? ""
  ).trim();
  const status = String(
    formData.get("status") ?? "Planning"
  ).trim();
  const description = String(
    formData.get("description") ?? ""
  ).trim();

  if (!name) {
    throw new Error("Project name is required.");
  }

  if (name.length > 200) {
    throw new Error("Project name is too long.");
  }

  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    throw new Error("Please select a valid customer.");
  }

  const customer = await db.orm.public.Customer.first({
    id: customerId,
  });

  if (!customer) {
    throw new Error("Selected customer does not exist.");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(contractValue)) {
    throw new Error(
      "Enter a valid contract value with up to two decimal places."
    );
  }

  const contractAmount = Number(contractValue);

  if (
    !Number.isFinite(contractAmount) ||
    !Number.isSafeInteger(Math.round(contractAmount * 100))
  ) {
    throw new Error("Contract value is too large.");
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error("Invalid project status.");
  }

  if (description.length > 5000) {
    throw new Error("Project description is too long.");
  }

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

// CREATE PROJECT
export async function createProject(formData: FormData) {
  await requireOwner();

  const data = await parseProjectFields(formData);

  await db.orm.public.Project.create({
    ...data,
    currency: "GBP",
  });

  revalidatePath("/projects");
  revalidatePath("/customers");
  revalidatePath("/");

  redirect("/projects");
}

// UPDATE PROJECT
export async function updateProject(formData: FormData) {
  await requireOwner();

  const projectId = validProjectId(
    formData.get("projectId")
  );

  const existing = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!existing) {
    throw new Error("Project not found.");
  }

  const data = await parseProjectFields(formData);

  await db.orm.public.Project.where({
    id: projectId,
  }).update(data);

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  revalidatePath(`/projects/${projectId}/payments`);
  revalidatePath("/company-finances");
  revalidatePath("/customers");

  redirect(`/projects/${projectId}`);
}

// DELETE PROJECT
export async function deleteProject(formData: FormData) {
  await requireOwner();

  const projectId = validProjectId(
    formData.get("projectId")
  );

  const confirmation = String(
    formData.get("confirmation") ?? ""
  ).trim();

  if (!confirmation.startsWith("DELETE ")) {
    throw new Error("Project deletion not confirmed.");
  }

  const client = await projectDeletionPool.connect();

  let committed = false;

  try {
    await client.query("BEGIN");

    const lockedProject = await client.query<{
      id: number;
      name: string;
    }>(
      `
      SELECT "id", "name"
      FROM public."Project"
      WHERE "id" = $1
      FOR UPDATE
      `,
      [projectId]
    );

    if (lockedProject.rowCount !== 1) {
      throw new Error("Project not found.");
    }

    const project = lockedProject.rows[0];

    if (confirmation !== `DELETE ${project.name}`) {
      throw new Error(
        "Project deletion confirmation does not match."
      );
    }

    // Read all associated file paths before deleting rows.
    const expenses = await client.query<{
      receiptFilePath: string | null;
    }>(
      `
      SELECT "receiptFilePath"
      FROM public."Expense"
      WHERE "projectId" = $1
      `,
      [projectId]
    );

    const payments = await client.query<{
      receiptFilePath: string | null;
    }>(
      `
      SELECT "receiptFilePath"
      FROM public."Payment"
      WHERE "projectId" = $1
      `,
      [projectId]
    );

    const photos = await client.query<{
      filePath: string;
    }>(
      `
      SELECT "filePath"
      FROM public."ProjectPhoto"
      WHERE "projectId" = $1
      `,
      [projectId]
    );

    const receiptPaths = [
      ...expenses.rows.map(
        (expense) => expense.receiptFilePath
      ),
      ...payments.rows.map(
        (payment) => payment.receiptFilePath
      ),
    ].filter(
      (path): path is string => Boolean(path)
    );

    // Ignore old local receipt paths.
    const supabaseReceiptPaths = [
      ...new Set(
        receiptPaths.filter(validReceiptPath)
      ),
    ];

    const photoPaths = photos.rows.map(
      (photo) => photo.filePath
    );

    if (
      photoPaths.some(
        (path) => !validProjectPhotoPath(path, projectId)
      )
    ) {
      throw new Error(
        "Invalid project photo path. Deletion cancelled."
      );
    }

    // Prevent deleting receipts used elsewhere.
    if (supabaseReceiptPaths.length > 0) {
      const sharedReceipts = await client.query(
        `
        SELECT 1
        FROM (
          SELECT "receiptFilePath" AS path, "projectId"
          FROM public."Expense"

          UNION ALL

          SELECT "receiptFilePath" AS path, "projectId"
          FROM public."Payment"
        ) AS receipts
        WHERE path = ANY($1::text[])
          AND (
            "projectId" IS NULL
            OR "projectId" <> $2
          )
        LIMIT 1
        `,
        [supabaseReceiptPaths, projectId]
      );

      if ((sharedReceipts.rowCount ?? 0) > 0) {
        throw new Error(
          "Some receipts are used elsewhere. Deletion cancelled."
        );
      }
    }

    // Register files for cleanup.
    const storagePaths = [
      ...new Set([
        ...supabaseReceiptPaths,
        ...photoPaths,
      ]),
    ];

    for (const filePath of storagePaths) {
      await client.query(
        `
        INSERT INTO public."StorageCleanupQueue"
          ("projectId", "filePath")
        VALUES ($1, $2)
        ON CONFLICT ("projectId", "filePath") DO NOTHING
        `,
        [projectId, filePath]
      );
    }

    // Delete related records.
    await client.query(
      `DELETE FROM public."Payment"
       WHERE "projectId" = $1`,
      [projectId]
    );

    await client.query(
      `DELETE FROM public."Invoice"
       WHERE "projectId" = $1`,
      [projectId]
    );

    await client.query(
      `DELETE FROM public."Expense"
       WHERE "projectId" = $1`,
      [projectId]
    );

    await client.query(
      `DELETE FROM public."Labour"
       WHERE "projectId" = $1`,
      [projectId]
    );

    await client.query(
      `DELETE FROM public."ExtraWork"
       WHERE "projectId" = $1`,
      [projectId]
    );

    await client.query(
      `DELETE FROM public."ProjectPhoto"
       WHERE "projectId" = $1`,
      [projectId]
    );

    const deletedProject = await client.query(
      `
      DELETE FROM public."Project"
      WHERE "id" = $1
      `,
      [projectId]
    );

    if (deletedProject.rowCount !== 1) {
      throw new Error("Unable to delete project.");
    }

    await client.query("COMMIT");
    committed = true;
  } catch (error) {
    if (!committed) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Project rollback failed:",
          rollbackError
        );
      }
    }

    throw error;
  } finally {
    client.release();
  }

  // Clean up files after database deletion.
  try {
    await cleanupProjectStorage(projectId);
  } catch (error) {
    console.error(
      "Project deleted, but Storage cleanup needs retry:",
      projectId,
      error
    );
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/company-finances");
  revalidatePath("/customers");
  revalidatePath("/workers");
  revalidatePath("/daily-labour");

  redirect("/projects");
}
