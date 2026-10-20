import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/src/prisma/db";
import { updateWorker } from "@/app/actions/workers";
import DeleteRecordButton from "../../../components/DeleteRecordButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditWorkerPage({ params }: Props) {
  const { id } = await params;
  const workerId = Number(id);

  if (!Number.isInteger(workerId)) {
    notFound();
  }

  const worker = await db.orm.public.Worker.first({
    id: workerId,
  });

  if (!worker) {
    notFound();
  }

  const hasLabourHistory = Boolean(
    await db.orm.public.Labour.first({ workerId })
  );

  const updateWorkerWithId = updateWorker.bind(null, workerId);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/workers"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Workers
        </Link>

        <h1 className="text-3xl font-bold mt-3">Edit Worker</h1>

        <p className="text-gray-500 mt-2">
          Update worker details, hourly rate and status.
        </p>
      </div>

      <form
        action={updateWorkerWithId}
        className="bg-white border rounded-xl p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Worker Name *
            </label>

            <input
              type="text"
              name="name"
              required
              defaultValue={worker.name}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Role / Trade
            </label>

            <input
              type="text"
              name="role"
              defaultValue={worker.role || ""}
              placeholder="e.g. Carpenter"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Hourly Rate *
            </label>

            <input
              type="number"
              name="hourlyRate"
              required
              min="0"
              step="0.01"
              defaultValue={String(worker.hourlyRate)}
              className="w-full border rounded-lg px-3 py-2"
            />

            <p className="text-xs text-gray-500 mt-2">
              Changing this rate will not change previous labour records.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Currency *
            </label>

            <select
              name="currency"
              defaultValue={worker.currency}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Status
            </label>

            <select
              name="status"
              defaultValue={worker.status}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <p className="text-xs text-gray-500 mt-2">
              Inactive workers keep their previous labour history.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Phone
            </label>

            <input
              type="text"
              name="phone"
              defaultValue={worker.phone || ""}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>

            <input
              type="email"
              name="email"
              defaultValue={worker.email || ""}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Notes
            </label>

            <textarea
              name="notes"
              rows={4}
              defaultValue={worker.notes || ""}
              className="w-full border rounded-lg px-3 py-2 resize-none"
            />
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex justify-end gap-3">
          <Link
            href="/workers"
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

      <DeleteRecordButton
        kind="worker"
        recordId={workerId}
        recordName={worker.name}
        blocked={hasLabourHistory}
      />
    </div>
  );
}