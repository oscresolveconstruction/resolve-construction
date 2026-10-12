"use client";

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
  workers: Worker[];
  projects: Project[];
};

export default function DailyLabourForm({
  workers,
  projects,
}: Props) {
  const [rows, setRows] = useState<Row[]>([
    {
      id: 1,
      workerId: "",
      projectId: "",
      hours: "",
    },
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
      if (current.length === 1) {
        return current;
      }

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
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  const rowsForServer = rows
    .filter(
      (row) =>
        row.workerId &&
        row.projectId &&
        row.hours
    )
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

  return (
    <form action={createDailyLabour}>
      <input
        type="hidden"
        name="rows"
        value={JSON.stringify(rowsForServer)}
      />

      <div className="bg-white border rounded-xl">
        <div className="p-6 border-b">
          <div className="max-w-xs">
            <label className="block text-sm font-medium mb-2">
              Date
            </label>

            <input
              type="date"
              name="date"
              required
              defaultValue={today}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">
                  Worker
                </th>

                <th className="px-6 py-4 font-medium">
                  Project
                </th>

                <th className="px-6 py-4 font-medium w-40">
                  Hours
                </th>

                <th className="px-6 py-4 font-medium w-32">
                  Rate
                </th>

                <th className="px-6 py-4 font-medium w-32">
                  Cost
                </th>

                <th className="px-6 py-4 w-20"></th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {rows.map((row) => {
                const selectedWorker = workers.find(
                  (worker) =>
                    worker.id === Number(row.workerId)
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
                        className="w-full min-w-52 border rounded-lg px-3 py-2"
                      >
                        <option value="">
                          Select worker
                        </option>

                        {workers.map((worker) => (
                          <option
                            key={worker.id}
                            value={worker.id}
                          >
                            {worker.name}
                            {worker.role
                              ? ` - ${worker.role}`
                              : ""}
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
                        className="w-full min-w-52 border rounded-lg px-3 py-2"
                      >
                        <option value="">
                          Select project
                        </option>

                        {projects.map((project) => (
                          <option
                            key={project.id}
                            value={project.id}
                          >
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
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </td>

                    <td className="px-6 py-4">
                      {selectedWorker ? (
                        <span className="font-medium">
                          {selectedWorker.currency === "EUR"
                            ? "€"
                            : "£"}
                          {rate.toFixed(2)}/h
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {selectedWorker && row.hours ? (
                        <span className="font-semibold">
                          {selectedWorker.currency === "EUR"
                            ? "€"
                            : "£"}
                          {cost.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeRow(row.id)
                          }
                          className="text-red-500 hover:text-red-700 text-sm"
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

        <div className="p-6 border-t flex items-center justify-between">
          <button
            type="button"
            onClick={addRow}
            className="border rounded-lg px-4 py-2 font-medium hover:bg-gray-50"
          >
            + Add Row
          </button>

          <div className="text-right">
            <p className="text-sm text-gray-500">
              Total Hours
            </p>

            <p className="text-xl font-bold">
              {totalHours.toFixed(2)}h
            </p>
          </div>
        </div>
      </div>

      {workers.length === 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
          There are no active workers. Add or activate a worker
          before recording labour.
        </div>
      )}

      {projects.length === 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
          There are no projects available.
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          disabled={
            workers.length === 0 ||
            projects.length === 0 ||
            rowsForServer.length === 0
          }
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg px-6 py-2.5"
        >
          Save Day
        </button>
      </div>
    </form>
  );
}