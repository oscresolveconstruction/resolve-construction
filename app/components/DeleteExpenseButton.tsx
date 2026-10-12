
"use client";

import { useState } from "react";
import { deleteExpense } from "../actions/expenses";

type DeleteExpenseButtonProps = {
  projectId: number | null;
  expenseId: number;
};

export default function DeleteExpenseButton({
  projectId,
  expenseId,
}: DeleteExpenseButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const confirmed = window.confirm(
      "Are you sure you want to delete this expense? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await deleteExpense(formData);

      if (result?.success === false) {
        setError(result.message);
        setIsDeleting(false);
      }
    } catch {
      setError(
        "Something went wrong while deleting the expense."
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
          value={projectId ?? ""}
        />

        <input
          type="hidden"
          name="expenseId"
          value={expenseId}
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
