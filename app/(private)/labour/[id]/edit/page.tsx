import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/src/prisma/db";
import { updateLabour } from "@/app/actions/labour";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditLabourPage({
  params,
}: Props) {
  const { id } = await params;
  const labourId = Number(id);

  if (!Number.isInteger(labourId)) {
    notFound();
  }

  const labour = await db.orm.public.Labour.first({
    id: labourId,
  });

  if (!labour) {
    notFound();
  }

  const workers = await db.orm.public.Worker.all();
  const projects = await db.orm.public.Project.all();

  const updateLabourWithId = updateLabour.bind(
    null,
    labourId
  );

  const dateValue = new Date(labour.date)
    .toISOString()
    .split("T")[0];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/labour"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Daily Labour
        </Link>

        <h1 className="text-3xl font-bold mt-3">
          Edit Labour
        </h1>

        <p className="text-gray-500 mt-2">
          Correct the worker, project, date or hours.
        </p>
      </div>

      <form
        action={updateLabourWithId}
        className="bg-white border rounded-xl p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Date *
            </label>

            <input
              type="date"
              name="date"
              required
              defaultValue={dateValue}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Worker *
            </label>

            <select
              name="workerId"
              required
              defaultValue={String(labour.workerId)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {workers.map((worker) => (
                <option
                  key={worker.id}
                  value={worker.id}
                >
                  {worker.name}
                  {worker.role
                    ? ` - ${worker.role}`
                    : ""}
                  {worker.status === "Inactive"
                    ? " (Inactive)"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Project *
            </label>

            <select
              name="projectId"
              required
              defaultValue={String(labour.projectId)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Hours *
            </label>

            <input
              type="number"
              name="hours"
              required
              min="0.25"
              step="0.25"
              defaultValue={String(labour.hours)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            The labour cost will be recalculated
            automatically when you save the changes.
          </p>
        </div>

        <div className="border-t mt-8 pt-6 flex justify-end gap-3">
          <Link
            href="/labour"
            className="border rounded-lg px-5 py-2 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg px-5 py-2"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}