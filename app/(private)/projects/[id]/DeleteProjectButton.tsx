
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

  const expected = `DELETE ${projectName}`;

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    const warning =
      `WARNING: PERMANENT PROJECT DELETION\n\n` +
      `Project: ${projectName}\n\n` +
      `This will permanently delete:\n` +
      `- The project\n` +
      `- Expenses and payments\n` +
      `- Invoices and extra works\n` +
      `- Labour records\n` +
      `- Photos and associated files\n\n` +
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
    <form action={deleteProject} onSubmit={handleSubmit}>
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
