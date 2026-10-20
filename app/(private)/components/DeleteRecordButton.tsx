"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { deleteCustomer, deleteWorker } from "../../actions/delete-records";

type Props = {
  kind: "customer" | "worker";
  recordId: number;
  recordName: string;
  blocked: boolean;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting..." : label}
    </button>
  );
}

export default function DeleteRecordButton({
  kind,
  recordId,
  recordName,
  blocked,
}: Props) {
  const confirmationRef = useRef<HTMLInputElement>(null);
  const label = kind === "customer" ? "Customer" : "Worker";
  const expected = `DELETE ${recordName}`;

  if (blocked) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">Delete {label} unavailable</p>
        <p className="mt-2">
          {kind === "customer"
            ? "This customer has associated projects. Delete those projects first if you really want to remove this customer."
            : "This worker has recorded labour. You can mark the worker Inactive to preserve the project cost history."}
        </p>
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="font-bold text-gray-900">Danger Zone</h2>
      <p className="mt-2 text-sm text-gray-600">
        Permanently delete this {kind}. This action cannot be undone.
      </p>
      <form
        action={kind === "customer" ? deleteCustomer : deleteWorker}
        onSubmit={(event) => {
          const answer = window.prompt(
            `PERMANENT DELETION\n\n${label}: ${recordName}\n\nType exactly to confirm:\n${expected}`
          );
          if (answer !== expected) {
            event.preventDefault();
            return;
          }
          if (confirmationRef.current) confirmationRef.current.value = answer;
        }}
        className="mt-4"
      >
        <input type="hidden" name="recordId" value={recordId} />
        <input
          type="hidden"
          name="confirmation"
          defaultValue=""
          ref={confirmationRef}
        />
        <SubmitButton label={`Delete ${label}`} />
      </form>
    </section>
  );
}
