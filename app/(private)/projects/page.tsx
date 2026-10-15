
import Link from "next/link";
import { db } from "../../../src/prisma/db";

export default async function Projects() {
  const projects = await db.orm.public.Project.all();

  function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency === "EUR" ? "EUR" : "GBP",
    }).format(amount);
  }

  return (
    <main className="min-w-0 bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Projects
            </h1>
            <p className="mt-2 text-gray-500">
              Manage all your construction projects
            </p>
          </div>

          <Link
            href="/projects/new"
            className="rounded-xl bg-orange-500 px-5 py-3 text-center font-semibold text-white hover:bg-orange-600"
          >
            + New Project
          </Link>
        </div>

        {/* MOBILE PROJECT CARDS */}
        <div className="mt-6 space-y-4 md:hidden">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words text-lg font-bold text-gray-900">
                  {project.name}
                </h2>
                <span className="shrink-0 text-orange-600">→</span>
              </div>

              {project.description && (
                <p className="mt-2 break-words text-sm text-gray-500">
                  {project.description}
                </p>
              )}

              <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                <div className="flex justify-between gap-3">
                  <span className="text-sm text-gray-500">Client</span>
                  <span className="min-w-0 break-words text-right text-sm font-medium text-gray-900">
                    {project.client}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="shrink-0 text-sm text-gray-500">
                    Contract Value
                  </span>
                  <span className="min-w-0 break-words text-right font-bold text-gray-900">
                    {formatAmount(
                      Number(project.contractValue),
                      project.currency
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="max-w-[60%] break-words rounded-full bg-orange-50 px-3 py-1 text-center text-xs font-semibold text-orange-700">
                    {project.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {projects.length === 0 && (
            <div className="rounded-xl bg-white p-8 text-center text-gray-500">
              No projects yet. Create your first project.
            </div>
          )}
        </div>

        {/* DESKTOP PROJECTS TABLE */}
        <div className="mt-6 hidden min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Project
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Client
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Contract Value
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-6 py-5">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-semibold text-gray-900 hover:text-orange-600"
                      >
                        {project.name}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        {project.description || "No description"}
                      </p>
                    </td>

                    <td className="px-6 py-5 text-gray-700">
                      {project.client}
                    </td>

                    <td className="whitespace-nowrap px-6 py-5 font-semibold text-gray-900">
                      {formatAmount(
                        Number(project.contractValue),
                        project.currency
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
                        {project.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {projects.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No projects yet. Create your first project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
