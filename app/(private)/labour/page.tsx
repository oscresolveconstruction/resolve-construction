import {randomUUID} from 'node:crypto';
import Link from "next/link";
import { db } from "@/src/prisma/db";
import DailyLabourForm from "./DailyLabourForm";
import DeleteLabourButton from "./DeleteLabourButton";

function currencySymbol(currency: string) {
  return currency === "EUR" ? "€" : "£";
}

export default async function LabourPage() {
  const workers = await db.orm.public.Worker.all();
  const projects = await db.orm.public.Project.all();
  const labourEntries = await db.orm.public.Labour.all();

  const activeWorkers = workers
    .filter((worker) => worker.status === "Active")
    .map((worker) => ({
      id: worker.id,
      name: worker.name,
      role: worker.role,
      hourlyRate: String(worker.hourlyRate),
      currency: worker.currency,
    }));

  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    client: project.client,
    currency: project.currency,
  }));

  const workerMap = new Map(
    workers.map((worker) => [worker.id, worker])
  );

  const projectMap = new Map(
    projects.map((project) => [project.id, project])
  );

  const sortedLabour = [...labourEntries].sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalHours = labourEntries.reduce(
    (total, entry) => total + Number(entry.hours),
    0
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Daily Labour
        </h1>

        <p className="text-gray-500 mt-1">
          Record worker hours across multiple projects in one place.
        </p>
      </div>

      <DailyLabourForm requestId={randomUUID()}
        workers={activeWorkers}
        projects={projectOptions}
      />

      <div className="mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">
              Labour Entries
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Recently recorded worker hours.
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">
              Total Hours
            </p>

            <p className="text-xl font-bold">
              {totalHours.toFixed(2)}h
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          {sortedLabour.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium">
                No labour entries yet
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Saved labour entries will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-6 py-4 font-medium">
                      Date
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Worker
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Project
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
                    const worker = workerMap.get(entry.workerId);
                    const project = projectMap.get(entry.projectId);

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          {new Date(
                            entry.date
                          ).toLocaleDateString("en-GB")}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium">
                            {worker?.name || "Unknown Worker"}
                          </p>

                          {worker?.role && (
                            <p className="text-xs text-gray-500">
                              {worker.role}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium">
                            {project?.name || "Unknown Project"}
                          </p>

                          {project?.client && (
                            <p className="text-xs text-gray-500">
                              {project.client}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4 font-medium">
                          {Number(entry.hours).toFixed(2)}h
                        </td>

                        <td className="px-6 py-4">
                          {currencySymbol(entry.currency)}
                          {Number(entry.hourlyRate).toFixed(2)}/h
                        </td>

                        <td className="px-6 py-4 font-semibold">
                          {currencySymbol(entry.currency)}
                          {Number(entry.amount).toFixed(2)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-4">
                            <Link
                              href={`/labour/${entry.id}/edit`}
                              className="text-orange-600 font-medium hover:underline"
                            >
                              Edit
                            </Link>

                            <DeleteLabourButton
                              labourId={entry.id}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}