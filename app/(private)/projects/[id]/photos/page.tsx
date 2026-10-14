
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../../src/prisma/db";
import { uploadProjectPhotos } from "../../../../actions/project-photos";
import DeletePhotoButton from "../../../../components/DeletePhotoButton";

export const dynamic = "force-dynamic";

export default async function ProjectPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    notFound();
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    notFound();
  }

  const photos = await db.orm.public.ProjectPhoto.where({
    projectId,
  }).all();

  const categories = [
    {
      name: "Before",
      description: "Photos before starting the work",
    },
    {
      name: "In Progress",
      description: "Photos showing construction progress",
    },
    {
      name: "Completed",
      description: "Photos of the finished project",
    },
  ];

  const sortedPhotos = [...photos].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">

        {/* BACK BUTTON */}

        <Link
          href={`/projects/${projectId}`}
          className="text-sm font-medium text-orange-600 hover:underline"
        >
          ← Back to Project
        </Link>

        {/* PAGE HEADER */}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Project Photos
            </h1>

            <p className="mt-2 text-gray-500">
              {project.name}
            </p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3">
            <p className="text-sm text-orange-700">
              Total Photos
            </p>

            <p className="text-2xl font-bold text-orange-600">
              {photos.length}
            </p>
          </div>
        </div>

        {/* UPLOAD PHOTOS */}

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Upload Project Photos
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Add multiple photos from your computer or mobile phone.
          </p>

          <form
            action={uploadProjectPhotos}
            className="mt-6 space-y-5"
          >
            <input
              type="hidden"
              name="projectId"
              value={projectId}
            />

            {/* PHOTO SELECTOR */}

            <div>
              <label
                htmlFor="photos"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Select Photos
              </label>

              <input
                id="photos"
                type="file"
                name="photos"
                accept="image/jpeg,image/png,image/webp"
                multiple
                required
                className="block w-full rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 p-5 text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-orange-700"
              />

              <p className="mt-2 text-xs text-gray-500">
                JPG, PNG or WebP. Maximum 20 photos per upload,
                10 MB per photo.
              </p>
            </div>

            {/* CATEGORY */}

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Construction Stage
              </label>

              <select
                id="category"
                name="category"
                defaultValue="In Progress"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
              >
                <option value="Before">
                  Before
                </option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Completed">
                  Completed
                </option>
              </select>
            </div>

            {/* DESCRIPTION */}

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Description (Optional)
              </label>

              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Example: Kitchen renovation, first week of work..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* UPLOAD BUTTON */}

            <button
              type="submit"
              className="rounded-xl bg-orange-600 px-7 py-3 font-semibold text-white transition hover:bg-orange-700"
            >
              Upload Photos
            </button>
          </form>
        </section>

        {/* PHOTO GALLERY */}

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Photo Gallery
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Photos organised by construction stage.
          </p>

          <div className="mt-6 space-y-8">
            {categories.map((category) => {
              const categoryPhotos = sortedPhotos.filter(
                (photo) => photo.category === category.name
              );

              return (
                <div
                  key={category.name}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  {/* CATEGORY HEADER */}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {category.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {category.description}
                      </p>
                    </div>

                    <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                      {categoryPhotos.length} photos
                    </span>
                  </div>

                  {/* EMPTY CATEGORY */}

                  {categoryPhotos.length === 0 ? (
                    <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                      <p className="text-3xl">
                        📷
                      </p>

                      <p className="mt-3 text-sm text-gray-500">
                        No photos in this category yet.
                      </p>
                    </div>
                  ) : (

                    /* PHOTO GRID */

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryPhotos.map((photo) => {
                        const imageUrl =
                          `/projects/${projectId}/photos/${photo.id}/image`;

                        return (
                          <div
                            key={photo.id}
                            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                          >
                            {/* PHOTO IMAGE */}

                            <a
                              href={imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open full-size photo"
                              className="block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageUrl}
                                alt={
                                  photo.description ||
                                  photo.fileName
                                }
                                loading="lazy"
                                className="h-52 w-full object-cover transition hover:opacity-90"
                              />
                            </a>

                            {/* PHOTO INFORMATION */}

                            <div className="p-4">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {photo.fileName}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {new Date(
                                  photo.createdAt
                                ).toLocaleDateString("en-GB")}
                              </p>

                              {photo.description && (
                                <p className="mt-3 text-sm text-gray-600">
                                  {photo.description}
                                </p>
                              )}

                              {/* VIEW AND DELETE BUTTONS */}

                              <div className="mt-5 flex items-center justify-between gap-3">
                                <a
                                  href={imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-semibold text-orange-600 hover:underline"
                                >
                                  View Photo ↗
                                </a>

                                <DeletePhotoButton
                                  projectId={projectId}
                                  photoId={photo.id}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
