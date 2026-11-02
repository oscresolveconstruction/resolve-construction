
"use client";

import { useRef, useState } from "react";
import { deleteProject } from "../../../actions/projects";

type Props = {
  projectId: number;
  projectName: string;
};

export default function DeleteProjectButton({
  projectId,
  projectName,
}: Props) {
  const confirmationRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const expected = `DELETE ${projectName}`;

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    const warning =
      `WARNING: PROJECT REMOVAL\n\n` +
      `Project: ${projectName}\n\n` +
      `This removes the project and its operational records:\n` +
      `- The project\n` +
      `- Expenses and payments\n` +
      `- Invoices and extra works\n` +
      `- Labour records\n` +
      `- Photos and associated files\n\n` +
      `Protected issued/cancelled documents are retained as history in Trash.\n` +
      `Their project is removed from lists and totals.\n\n` +
      `This action cannot be undone.\n\n` +
      `Type exactly:\n${expected}`;

    const answer = window.prompt(warning);

    if (answer !== expected) {
      event.preventDefault();
      return;
    }

    if (confirmationRef.current) {
      confirmationRef.current.value = answer;
    }

    setSubmitting(true);
  }

  return (
    <form action={async (data) => {
      setError("");
      const result = await deleteProject(data);
      if (result?.error) {setError(result.error);setSubmitting(false);}
    }} onSubmit={handleSubmit}>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      <input
        type="hidden"
        name="projectId"
        value={projectId}
      />

      <input
        ref={confirmationRef}
        type="hidden"
        name="confirmation"
        defaultValue=""
      />

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl border border-red-300 bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Deleting Project..."
          : "Delete Project"}
      </button>
    </form>
  );
}
