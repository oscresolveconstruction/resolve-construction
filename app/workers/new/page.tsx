import Link from "next/link";
import { createWorker } from "@/app/actions/workers";

export default function NewWorkerPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/workers"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Workers
        </Link>

        <h1 className="text-3xl font-bold mt-3">Add Worker</h1>

        <p className="text-gray-500 mt-2">
          Add a worker and their standard hourly rate.
        </p>
      </div>

      <form action={createWorker} className="bg-white border rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Worker Name *
            </label>

            <input
              type="text"
              name="name"
              required
              placeholder="e.g. John Smith"
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
              placeholder="20.00"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Currency *
            </label>

            <select
              name="currency"
              defaultValue="GBP"
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Phone
            </label>

            <input
              type="text"
              name="phone"
              placeholder="Phone number"
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
              placeholder="worker@email.com"
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
              placeholder="Optional notes about this worker..."
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
            Add Worker
          </button>
        </div>
      </form>
    </div>
  );
}