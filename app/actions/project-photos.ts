
"use server";

import { db } from "../../src/prisma/db";
import { getSessionUserId } from "../lib/auth";
import { getSupabaseStorage } from "../lib/supabase-storage";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 20;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_CATEGORIES = [
  "Before",
  "In Progress",
  "Completed",
];

function isValidImage(
  bytes: Buffer,
  mimeType: string
): boolean {
  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff &&
      bytes[bytes.length - 2] === 0xff &&
      bytes[bytes.length - 1] === 0xd9
    );
  }

  if (mimeType === "image/png") {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];

    return (
      bytes.length >= 24 &&
      signature.every((byte, i) => bytes[i] === byte) &&
      bytes.toString("ascii", 12, 16) === "IHDR"
    );
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 16 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP" &&
      ["VP8 ", "VP8L", "VP8X"].includes(
        bytes.toString("ascii", 12, 16)
      )
    );
  }

  return false;
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

  return user;
}

export async function uploadProjectPhotos(formData: FormData) {
  await requireOwner();

  const projectId = Number(formData.get("projectId"));
  const category = String(
    formData.get("category") ?? "In Progress"
  );
  const description = String(
    formData.get("description") ?? ""
  ).trim();

  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new Error("Invalid project.");
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new Error("Invalid photo category.");
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

  const photos = formData.getAll("photos").filter(
    (file): file is File =>
      file instanceof File && file.size > 0
  );

  if (photos.length === 0) {
    throw new Error("Please select at least one photo.");
  }

  if (photos.length > MAX_PHOTOS) {
    throw new Error(
      "You can upload a maximum of 20 photos at once."
    );
  }

  const prepared: {
    file: File;
    bytes: Buffer;
    extension: string;
  }[] = [];

  for (const photo of photos) {
    if (!ALLOWED_TYPES.includes(photo.type)) {
      throw new Error(
        "Only JPG, PNG and WebP images are allowed."
      );
    }

    if (photo.size > MAX_FILE_SIZE) {
      throw new Error(
        "Each photo must be smaller than 10 MB."
      );
    }

    const bytes = Buffer.from(
      await photo.arrayBuffer()
    );

    if (!isValidImage(bytes, photo.type)) {
      throw new Error(
        "One of the selected files is not a valid image."
      );
    }

    const extension =
      photo.type === "image/png"
        ? ".png"
        : photo.type === "image/webp"
          ? ".webp"
          : ".jpg";

    prepared.push({
      file: photo,
      bytes,
      extension,
    });
  }

  const storage = getSupabaseStorage();

  for (const { file, bytes, extension } of prepared) {
    const storedFileName = `${randomUUID()}${extension}`;

    const filePath =
      `project-photos/${projectId}/${storedFileName}`;

    const { error: uploadError } = await storage.upload(
      filePath,
      bytes,
      {
        contentType: file.type,
        upsert: false,
      }
    );

    if (uploadError) {
      console.error("Photo upload failed:", uploadError);
      throw new Error("Unable to upload photo.");
    }

    try {
      await db.orm.public.ProjectPhoto.create({
        projectId,
        fileName: file.name,
        filePath,
        mimeType: file.type,
        category,
        description: description || null,
      });
    } catch (error) {
      const { error: cleanupError } =
        await storage.remove([filePath]);

      if (cleanupError) {
        console.error(
          "Unable to clean up uploaded photo:",
          cleanupError
        );
      }

      throw error;
    }
  }

  revalidatePath(`/projects/${projectId}/photos`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectPhoto(formData: FormData) {
  await requireOwner();

  const projectId = Number(formData.get("projectId"));
  const photoId = Number(formData.get("photoId"));

  if (
    !Number.isSafeInteger(projectId) ||
    projectId <= 0 ||
    !Number.isSafeInteger(photoId) ||
    photoId <= 0
  ) {
    throw new Error("Invalid photo.");
  }

  const photo = await db.orm.public.ProjectPhoto.first({
    id: photoId,
  });

  if (!photo || photo.projectId !== projectId) {
    throw new Error("Photo not found.");
  }

  const match =
    /^project-photos\/([1-9]\d*)\/([a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}\.(?:jpg|png|webp))$/i.exec(
      photo.filePath
    );

  if (!match || match[1] !== String(projectId)) {
    throw new Error("Invalid photo path.");
  }

  const storage = getSupabaseStorage();

  const { error: storageError } = await storage.remove([
    photo.filePath,
  ]);

  if (storageError) {
    console.error(
      "Unable to delete photo from storage:",
      storageError
    );

    throw new Error(
      "Unable to delete photo. Please try again."
    );
  }

  await db.orm.public.ProjectPhoto.where({
    id: photoId,
  }).delete();

  revalidatePath(`/projects/${projectId}/photos`);
  revalidatePath(`/projects/${projectId}`);
}
