
"use client";

import PendingSubmit from "../../components/PendingSubmit";
import { useState } from "react";
import { createDailyLabour } from "@/app/actions/labour";

type Worker = {
  id: number;
  name: string;
  role: string | null;
  hourlyRate: string;
  currency: string;
};

type Project = {
  id: number;
  name: string;
  client: string;
  currency: string;
};

type Row = {
  id: number;
  workerId: string;
  projectId: string;
  hours: string;
};

type Props = {
  requestId:string;
  workers: Worker[];
  projects: Project[];
};

export default function DailyLabourForm({ workers, projects, requestId }: Props) {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, workerId: "", projectId: "", hours: "" },
  ]);

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: Date.now(),
        workerId: "",
        projectId: "",
        hours: "",
      },
    ]);
  }

  function removeRow(id: number) {
    setRows((current) => {
      if (current.length === 1) return current;
      return current.filter((row) => row.id !== id);
    });
  }

  function updateRow(
    id: number,
    field: "workerId" | "projectId" | "hours",
    value: string
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  }

  const rowsForServer = rows
    .filter((row) => row.workerId && row.projectId && row.hours)
    .map((row) => ({
      workerId: Number(row.workerId),
      projectId: Number(row.projectId),
      hours: Number(row.hours),
    }));

  const totalHours = rows.reduce((total, row) => {
    const hours = Number(row.hours);
    return total + (Number.isFinite(hours) ? hours : 0);
  }, 0);

  const today = new Date().toISOString().split("T")[0];

  function formatMoney(value: number, currency: string) {
    return `${currency === "EUR" ? "€" : "£"}${value.toFixed(2)}`;
  }

  return (
    <form action={createDailyLabour} className="min-w-0"><input type="hidden" name="requestId" value={requestId}/>
      <input
        type="hidden"
        name="rows"
        value={JSON.stringify(rowsForServer)}
      />

      <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {/* DATE */}
        <div className="border-b border-gray-200 p-4 sm:p-6">
          <div className="max-w-xs">
            <label
              htmlFor="labour-date"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Date
            </label>

            <input
              id="labour-date"
              type="date"
              name="date"
              required
              defaultValue={today}
              className="w-full max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
            />
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="space-y-4 p-4 md:hidden">
          {rows.map((row, index) => {
            const selectedWorker = workers.find(
              (worker) => worker.id === Number(row.workerId)
            );

            const hours = Number(row.hours) || 0;
            const rate = selectedWorker
              ? Number(selectedWorker.hourlyRate)
              : 0;
            const cost = hours * rate;

            return (
              <div
                key={row.id}
                className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">
                    Entry {index + 1}
                  </h3>

                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-sm font-medium text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor={`mobile-worker-${row.id}`}
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Worker
                    </label>

                    <select
                      id={`mobile-worker-${row.id}`}
                      value={row.workerId}
                      onChange={(event) =>
                        updateRow(
                          row.id,
                          "workerId",
                          event.target.value
                        )
                      }
                      required
                      className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-900"
                    >
                      <option value="">Select worker</option>

                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.name}
                          {worker.role ? ` - ${worker.role}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`mobile-project-${row.id}`}
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Project
                    </label>

                    <select
                      id={`mobile-project-${row.id}`}
                      value={row.projectId}
                      onChange={(event) =>
                        updateRow(
                          row.id,
                          "projectId",
                          event.target.value
                        )
                      }
                      required
                      className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-900"
                    >
                      <option value="">Select project</option>

                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`mobile-hours-${row.id}`}
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Hours
                    </label>

                    <input
                      id={`mobile-hours-${row.id}`}
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={row.hours}
                      onChange={(event) =>
                        updateRow(
                          row.id,
                          "hours",
                          event.target.value
                        )
                      }
                      required
                      placeholder="8"
                      className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-white p-3">
                    <div>
                      <p className="text-xs text-gray-500">
                        Hourly rate
                      </p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {selectedWorker
                          ? `${formatMoney(rate, selectedWorker.currency)}/h`
                          : "—"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        Cost
                      </p>
                      <p className="mt-1 font-bold text-gray-900">
                        {selectedWorker && row.hours
                          ? formatMoney(cost, selectedWorker.currency)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">Worker</th>
                <th className="px-6 py-4 font-medium">Project</th>
                <th className="w-40 px-6 py-4 font-medium">Hours</th>
                <th className="w-32 px-6 py-4 font-medium">Rate</th>
                <th className="w-32 px-6 py-4 font-medium">Cost</th>
                <th className="w-20 px-6 py-4"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => {
                const selectedWorker = workers.find(
                  (worker) => worker.id === Number(row.workerId)
                );

                const hours = Number(row.hours) || 0;
                const rate = selectedWorker
                  ? Number(selectedWorker.hourlyRate)
                  : 0;
                const cost = hours * rate;

                return (
                  <tr key={row.id}>
                    <td className="px-6 py-4">
                      <select
                        value={row.workerId}
                        onChange={(event) =>
                          updateRow(
                            row.id,
                            "workerId",
                            event.target.value
                          )
                        }
                        required
                        className="w-full min-w-52 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      >
                        <option value="">Select worker</option>
                        {workers.map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {worker.name}
                            {worker.role ? ` - ${worker.role}` : ""}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <select
                        value={row.projectId}
                        onChange={(event) =>
                          updateRow(
                            row.id,
                            "projectId",
                            event.target.value
                          )
                        }
                        required
                        className="w-full min-w-52 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      >
                        <option value="">Select project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={row.hours}
                        onChange={(event) =>
                          updateRow(
                            row.id,
                            "hours",
                            event.target.value
                          )
                        }
                        required
                        placeholder="8"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      />
                    </td>

                    <td className="px-6 py-4">
                      {selectedWorker ? (
                        <span className="font-medium text-gray-900">
                          {formatMoney(rate, selectedWorker.currency)}/h
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {selectedWorker && row.hours ? (
                        <span className="font-semibold text-gray-900">
                          {formatMoney(cost, selectedWorker.currency)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-4 border-t border-gray-200 p-4 sm:p-6">
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-900 hover:bg-gray-50"
          >
            + Add Row
          </button>

          <div className="text-right">
            <p className="text-sm text-gray-500">Total Hours</p>
            <p className="text-xl font-bold text-gray-900">
              {totalHours.toFixed(2)}h
            </p>
          </div>
        </div>
      </div>

      {workers.length === 0 && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-gray-900">
          There are no active workers. Add or activate a worker
          before recording labour.
        </div>
      )}

      {projects.length === 0 && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-gray-900">
          There are no projects available.
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <PendingSubmit
          type="submit"
          disabled={
            workers.length === 0 ||
            projects.length === 0 ||
            rowsForServer.length === 0
          }
          className="rounded-lg bg-orange-500 px-6 py-2.5 font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Save Day
        </PendingSubmit>
      </div>
    </form>
  );
}
