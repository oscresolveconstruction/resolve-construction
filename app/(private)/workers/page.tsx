import Link from "next/link";
import { db } from "@/src/prisma/db";

function currencySymbol(currency: string) {
  return currency === "EUR" ? "€" : "£";
}

export default async function WorkersPage() {
  const workers = await db.orm.public.Worker.all();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workers</h1>
          <p className="text-gray-500 mt-1">
            Manage workers and their standard hourly rates.
          </p>
        </div>

        <Link
          href="/workers/new"
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg"
        >
          + Add Worker
        </Link>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        {workers.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="text-lg font-semibold">No workers yet</h2>

            <p className="text-gray-500 mt-2 mb-5">
              Add your first worker to start recording labour hours.
            </p>

            <Link
              href="/workers/new"
              className="text-orange-600 font-medium hover:underline"
            >
              Add your first worker →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">Worker</th>
                  <th className="px-6 py-4 font-medium">Role / Trade</th>
                  <th className="px-6 py-4 font-medium">Hourly Rate</th>
                  <th className="px-6 py-4 font-medium">Phone</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {workers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">
                      {worker.name}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {worker.role || "—"}
                    </td>

                    <td className="px-6 py-4 font-medium">
                      {currencySymbol(worker.currency)}
                      {Number(worker.hourlyRate).toFixed(2)}/h
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {worker.phone || "—"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          worker.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {worker.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/workers/${worker.id}/edit`}
                        className="text-orange-600 font-medium hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}