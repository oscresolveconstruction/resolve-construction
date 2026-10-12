import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/src/prisma/db";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function currencySymbol(currency: string) {
  return currency === "EUR" ? "€" : "£";
}

function formatMoney(value: number) {
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function ProjectLabourPage({
  params,
}: Props) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isInteger(projectId)) {
    notFound();
  }

  // Project
  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    notFound();
  }

  // Guardamos la referencia para que TypeScript
  // sepa que el proyecto existe.
  const currentProject = project;

  // Labour entries for this project
  const labourEntries = await db.orm.public.Labour
    .where({
      projectId,
    })
    .all();

  // Workers
  const workers = await db.orm.public.Worker.all();

  // Quick worker lookup
  const workerMap = new Map(
    workers.map((worker) => [worker.id, worker])
  );

  // Newest entries first
  const sortedLabour = [...labourEntries].sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );

  /*
   * Convert a labour entry into the
   * project's currency.
   */
  function getProjectLabourCost(
    entry: (typeof labourEntries)[number]
  ) {
    const amount = Number(entry.amount);

    // Same currency
    if (entry.currency === currentProject.currency) {
      return amount;
    }

    // Different currency
    const exchangeRate = entry.exchangeRate
      ? Number(entry.exchangeRate)
      : 0;

    return amount * exchangeRate;
  }

  // Total hours
  const totalHours = labourEntries.reduce(
    (total, entry) => {
      return total + Number(entry.hours);
    },
    0
  );

  // Total labour cost
  const totalLabourCost = labourEntries.reduce(
    (total, entry) => {
      return total + getProjectLabourCost(entry);
    },
    0
  );

  const projectSymbol = currencySymbol(
    currentProject.currency
  );

  return (
    <main className="p-8">
      {/* Back */}
      <Link
        href={`/projects/${currentProject.id}`}
        className="text-sm font-medium text-gray-500 hover:text-orange-500"
      >
        ← Back to Project
      </Link>

      {/* Header */}
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Labour
          </h1>

          <p className="mt-2 text-gray-500">
            {currentProject.name} · {currentProject.client}
          </p>
        </div>

        <Link
          href="/labour"
          className="rounded-lg bg-orange-500 px-5 py-2.5 font-medium text-white hover:bg-orange-600"
        >
          + Add Labour
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Entries */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Labour Entries
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {labourEntries.length}
          </p>
        </div>

        {/* Hours */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Hours
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalHours.toFixed(2)}h
          </p>
        </div>

        {/* Cost */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Labour Cost
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {projectSymbol}
            {formatMoney(totalLabourCost)}
          </p>
        </div>
      </div>

      {/* Labour Table */}
      <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
        {sortedLabour.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              No labour recorded
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              There are no labour hours recorded for this
              project yet.
            </p>

            <Link
              href="/labour"
              className="mt-5 inline-block font-medium text-orange-600 hover:underline"
            >
              Add Labour →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">
                    Date
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Worker
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Role / Trade
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Hours
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Rate
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Cost
                  </th>

                  <th className="px-6 py-4 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {sortedLabour.map((entry) => {
                  const worker = workerMap.get(
                    entry.workerId
                  );

                  const entryCost =
                    getProjectLabourCost(entry);

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-gray-50"
                    >
                      {/* Date */}
                      <td className="px-6 py-4">
                        {new Date(
                          entry.date
                        ).toLocaleDateString("en-GB")}
                      </td>

                      {/* Worker */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {worker?.name ||
                            "Unknown Worker"}
                        </p>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 text-gray-600">
                        {worker?.role || "—"}
                      </td>

                      {/* Hours */}
                      <td className="px-6 py-4 font-medium">
                        {Number(entry.hours).toFixed(2)}h
                      </td>

                      {/* Rate */}
                      <td className="px-6 py-4">
                        {currencySymbol(entry.currency)}
                        {Number(
                          entry.hourlyRate
                        ).toFixed(2)}
                        /h
                      </td>

                      {/* Cost */}
                      <td className="px-6 py-4 font-semibold">
                        {projectSymbol}
                        {formatMoney(entryCost)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/labour/${entry.id}/edit`}
                          className="font-medium text-orange-600 hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}