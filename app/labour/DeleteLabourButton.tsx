"use client";

import { useState } from "react";
import { deleteLabour } from "@/app/actions/labour";

type Props = {
  labourId: number;
};

export default function DeleteLabourButton({
  labourId,
}: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this labour entry?"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await deleteLabour(labourId);
    } catch (error) {
      setDeleting(false);
      alert("Could not delete labour entry.");
      console.error(error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-red-600 font-medium hover:underline disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}