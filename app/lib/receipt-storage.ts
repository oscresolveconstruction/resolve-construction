import "server-only";

import { randomUUID } from "node:crypto";
import { getSupabaseStorage } from "./supabase-storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export type StoredReceipt = {
  receiptFileName: string;
  receiptFilePath: string;
  receiptMimeType: string;
};

function isValidReceiptContent(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "application/pdf") {
    return (
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    );
  }

  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mimeType === "image/png") {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];

    return signature.every((value, index) => bytes[index] === value);
  }

  return false;
}

export async function saveReceipt(
  file: File
): Promise<StoredReceipt> {
  const extension = ALLOWED_TYPES[file.type];

  if (!extension) {
    throw new Error("Only PDF, JPG and PNG receipts are allowed.");
  }

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    throw new Error("Receipt must be between 1 byte and 10 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!isValidReceiptContent(bytes, file.type)) {
    throw new Error("Receipt file content is invalid.");
  }

  const storagePath = `receipts/${randomUUID()}${extension}`;

  const { error } = await getSupabaseStorage().upload(
    storagePath,
    bytes,
    {
      contentType: file.type,
      upsert: false,
    }
  );

  if (error) {
    throw new Error(`Could not upload receipt: ${error.message}`);
  }

  return {
    receiptFileName: file.name,
    receiptFilePath: storagePath,
    receiptMimeType: file.type,
  };
}

export async function removeReceipt(
  storagePath: string | null
): Promise<void> {
  if (!storagePath) return;

  // Solo eliminamos recibos nuevos guardados en Supabase.
  // Los archivos antiguos del ordenador no se tocan.
  if (
    !/^receipts\/[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(storagePath)
  ) {
    return;
  }

  const { error } = await getSupabaseStorage().remove([
    storagePath,
  ]);

  if (error) {
    throw new Error(`Could not delete receipt: ${error.message}`);
  }
}