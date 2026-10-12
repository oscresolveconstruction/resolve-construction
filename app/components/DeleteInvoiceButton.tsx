"use client";

import { useState } from "react";
import { deleteInvoice } from "../actions/invoices";

type DeleteInvoiceButtonProps = {
  projectId: number;
  invoiceId: number;
};

export default function DeleteInvoiceButton({
  projectId,
  invoiceId,
}: DeleteInvoiceButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const confirmed = window.confirm(
      "Are you sure you want to delete this invoice? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await deleteInvoice(formData);

      if (result?.success === false) {
        setError(result.message);
        setIsDeleting(false);
      }
    } catch {
      setError(
        "Something went wrong while deleting the invoice."
      );
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="hidden"
          name="projectId"
          value={projectId}
        />

        <input
          type="hidden"
          name="invoiceId"
          value={invoiceId}
        />

        <button
          type="submit"
          disabled={isDeleting}
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete Invoice"}
        </button>
      </form>

      {error && (
        <div className="absolute right-8 mt-3 max-w-md rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-red-700">
            Cannot delete invoice
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}