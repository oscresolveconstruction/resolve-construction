"use client";

import { useState } from "react";
import { deletePayment } from "../actions/payments";

type DeletePaymentButtonProps = {
  projectId: number;
  paymentId: number;
};

export default function DeletePaymentButton({
  projectId,
  paymentId,
}: DeletePaymentButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const confirmed = window.confirm(
      "Are you sure you want to delete this payment? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await deletePayment(formData);

      if (result?.success === false) {
        setError(result.message);
        setIsDeleting(false);
      }
    } catch {
      setError(
        "Something went wrong while deleting the payment."
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
          name="paymentId"
          value={paymentId}
        />

        <button
          type="submit"
          disabled={isDeleting}
          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </form>

      {error && (
        <p className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}