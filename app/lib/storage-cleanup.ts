
import "server-only";

import { Pool } from "pg";
import { getSupabaseStorage } from "./supabase-storage";

const cleanupPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

function validCleanupPath(
  path: string,
  projectId: number
): boolean {
  const validReceipt =
    /^receipts\/[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(
      path
    );

  const match =
    /^project-photos\/([1-9]\d*)\/([a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}\.(?:jpg|png|webp))$/i.exec(
      path
    );

  const validPhoto =
    match !== null &&
    match[1] === String(projectId);

  return validReceipt || validPhoto;
}

export async function cleanupProjectStorage(
  projectId: number
): Promise<void> {
  if (
    !Number.isSafeInteger(projectId) ||
    projectId <= 0
  ) {
    throw new Error("Invalid project ID.");
  }

  const client = await cleanupPool.connect();

  try {
    const pending = await client.query<{
      id: string;
      filePath: string;
    }>(
      `
      SELECT "id", "filePath"
      FROM public."StorageCleanupQueue"
      WHERE "projectId" = $1
        AND "status" IN ('pending', 'failed')
      ORDER BY "id"
      `,
      [projectId]
    );

    for (const item of pending.rows) {
      try {
        if (!validCleanupPath(item.filePath, projectId)) {
          throw new Error(
            "Invalid Storage path. Cleanup blocked."
          );
        }

        // Do not delete files that other records use.
        const references = await client.query(
          `
          SELECT 1
          FROM public."Expense"
          WHERE "receiptFilePath" = $1

          UNION ALL

          SELECT 1
          FROM public."Payment"
          WHERE "receiptFilePath" = $1

          UNION ALL

          SELECT 1
          FROM public."ProjectPhoto"
          WHERE "filePath" = $1

          LIMIT 1
          `,
          [item.filePath]
        );

        if ((references.rowCount ?? 0) > 0) {
          throw new Error(
            "Storage file is still referenced."
          );
        }

        const { error } = await getSupabaseStorage().remove([
          item.filePath,
        ]);

        if (error) {
          throw new Error(error.message);
        }

        await client.query(
          `
          UPDATE public."StorageCleanupQueue"
          SET "status" = 'completed',
              "completedAt" = NOW(),
              "lastError" = NULL
          WHERE "id" = $1
          `,
          [item.id]
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown Storage error";

        await client.query(
          `
          UPDATE public."StorageCleanupQueue"
          SET "status" = 'failed',
              "attempts" = "attempts" + 1,
              "lastError" = $2
          WHERE "id" = $1
          `,
          [item.id, message]
        );

        console.error(
          "Storage cleanup failed:",
          item.id,
          message
        );
      }
    }
  } finally {
    client.release();
  }
}
