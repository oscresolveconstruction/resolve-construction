
"use client";

import { useState } from "react";
import { deleteProjectPhoto } from "../actions/project-photos";

type DeletePhotoButtonProps = {
  projectId: number;
  photoId: number;
};

export default function DeletePhotoButton({
  projectId,
  photoId,
}: DeletePhotoButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    const formData = new FormData();
    formData.set("projectId", String(projectId));
    formData.set("photoId", String(photoId));

    try {
      await deleteProjectPhoto(formData);
      setShowConfirmation(false);
    } catch (error) {
      console.error(error);
      alert("Could not delete the photo. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirmation(true)}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
      >
        Delete Photo
      </button>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-photo-title"
            className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
          >
            <h2
              id="delete-photo-title"
              className="text-xl font-bold text-gray-900"
            >
              Delete Photo?
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Are you sure you want to delete this photo?
              This action cannot be undone.
            </p>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
