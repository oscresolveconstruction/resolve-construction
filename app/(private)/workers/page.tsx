
import Link from "next/link";
import { db } from "@/src/prisma/db";

function formatHourlyRate(amount: number, currency: string) {
  return `${currency === "EUR" ? "€" : "£"}${amount.toFixed(2)}/h`;
}

export default async function WorkersPage() {
  const workers = await db.orm.public.Worker.all();

  return (
    <main className="min-w-0 bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Workers
            </h1>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              Manage workers and their standard hourly rates.
            </p>
          </div>

          <Link
            href="/workers/new"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
          >
            + Add Worker
          </Link>
        </div>

        {workers.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              No workers yet
            </h2>
            <p className="mb-5 mt-2 text-sm text-gray-500">
              Add your first worker to start recording labour hours.
            </p>
            <Link
              href="/workers/new"
              className="font-semibold text-orange-600 hover:underline"
            >
              Add your first worker →
            </Link>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS */}
            <div className="space-y-4 md:hidden">
              {workers.map((worker) => (
                <article
                  key={worker.id}
                  className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold text-gray-900">
                        {worker.name}
                      </h2>
                      <p className="mt-1 break-words text-sm text-gray-500">
                        {worker.role || "No trade specified"}
                      </p>
                    </div>

                    <span
                      className={`max-w-[45%] shrink-0 break-words rounded-full px-3 py-1 text-center text-xs font-semibold ${
                        worker.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {worker.status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-500">
                        Hourly Rate
                      </span>
                      <span className="text-right font-bold text-gray-900">
                        {formatHourlyRate(
                          Number(worker.hourlyRate),
                          worker.currency
                        )}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-gray-500">
                        Phone
                      </span>
                      <span className="min-w-0 break-words text-right text-sm font-medium text-gray-900">
                        {worker.phone || "—"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/workers/${worker.id}/edit`}
                    className="mt-5 flex w-full items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 font-semibold text-orange-700 hover:bg-orange-100"
                  >
                    Edit Worker →
                  </Link>
                </article>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr className="text-sm text-gray-500">
                      <th className="px-6 py-4 font-medium">Worker</th>
                      <th className="px-6 py-4 font-medium">
                        Role / Trade
                      </th>
                      <th className="px-6 py-4 font-medium">
                        Hourly Rate
                      </th>
                      <th className="px-6 py-4 font-medium">Phone</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {workers.map((worker) => (
                      <tr
                        key={worker.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {worker.name}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {worker.role || "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-gray-900">
                          {formatHourlyRate(
                            Number(worker.hourlyRate),
                            worker.currency
                          )}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {worker.phone || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
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
                            className="font-semibold text-orange-600 hover:underline"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
