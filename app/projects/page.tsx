import { db } from "../../src/prisma/db";

export default async function Projects() {
  const projects = await db.orm.public.Project.all();

  return (
    <main className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Projects
          </h1>

          <p className="mt-2 text-gray-500">
            Manage all your construction projects
          </p>
        </div>

        <a
          href="/projects/new"
          className="rounded-lg bg-orange-500 px-5 py-3 font-medium text-white hover:bg-orange-600"
        >
          + New Project
        </a>
      </div>

      {/* Search */}
      <div className="mt-8">
        <input
          type="text"
          placeholder="Search projects..."
          className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-orange-500"
        />
      </div>

      {/* Projects Table */}
      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Project
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Client
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Contract Value
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-b last:border-b-0 hover:bg-gray-50"
              >
                {/* Project */}
                <td className="px-6 py-5">
                  <a
  href={`/projects/${project.id}`}
  className="font-medium text-gray-900 hover:text-orange-500"
>
  {project.name}
</a>

                  <p className="text-sm text-gray-500">
                    {project.description || "No description"}
                  </p>
                </td>

                {/* Client */}
                <td className="px-6 py-5 text-gray-700">
                  {project.client}
                </td>

                {/* Contract Value */}
                <td className="px-6 py-5 font-medium text-gray-900">
                  {project.currency === "EUR" ? "€" : "£"}
                  {Number(project.contractValue).toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>

                {/* Status */}
                <td className="px-6 py-5">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    {project.status}
                  </span>
                </td>
              </tr>
            ))}

            {/* No projects */}
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
    </main>
  );
}