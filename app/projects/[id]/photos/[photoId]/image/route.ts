
import { db } from "../../../../../../src/prisma/db";
import { getSessionUserId } from "../../../../../lib/auth";
import { getSupabaseStorage } from "../../../../../lib/supabase-storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await db.orm.public.AppUser.first({
    id: userId,
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, photoId } = await params;
  const projectId = Number(id);
  const imageId = Number(photoId);

  if (
    !Number.isSafeInteger(projectId) ||
    projectId <= 0 ||
    !Number.isSafeInteger(imageId) ||
    imageId <= 0
  ) {
    return NextResponse.json(
      { error: "Photo not found" },
      { status: 404 }
    );
  }

  const photo = await db.orm.public.ProjectPhoto.first({
    id: imageId,
  });

  if (!photo || photo.projectId !== projectId) {
    return NextResponse.json(
      { error: "Photo not found" },
      { status: 404 }
    );
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(photo.mimeType)) {
    return NextResponse.json(
      { error: "Unsupported image format" },
      { status: 404 }
    );
  }

  // Only accept paths created by our Supabase uploader.
  const match =
    /^project-photos\/([1-9]\d*)\/([a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}\.(?:jpg|png|webp))$/i.exec(
      photo.filePath
    );

  if (!match || match[1] !== String(projectId)) {
    return NextResponse.json(
      { error: "Photo not found" },
      { status: 404 }
    );
  }

  try {
    const storage = getSupabaseStorage();

    const { data, error } = await storage.download(
      photo.filePath
    );

    if (error || !data) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    const bytes = await data.arrayBuffer();

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to load project photo:", error);

    return NextResponse.json(
      { error: "Unable to load photo" },
      { status: 500 }
    );
  }
}
