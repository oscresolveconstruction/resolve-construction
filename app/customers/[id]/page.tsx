
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../src/prisma/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

const formatGBP = (value: number) =>
  value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });

export default async function CustomerDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;
  const customerId = Number(id);

  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    notFound();
  }

  const customer = await db.orm.public.Customer.first({
    id: customerId,
  });

  if (!customer) {
    notFound();
  }

  const allProjects = await db.orm.public.Project.all();

  const projects = allProjects
    .filter((project) => project.customerId === customerId)
    .sort((a, b) => b.id - a.id);

  const totalContractValue = projects.reduce(
    (total, project) =>
      total + Number(project.contractValue),
    0
  );

  const completedProjects = projects.filter(
    (project) =>
      project.status.trim().toLowerCase() === "completed"
  ).length;

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/customers"
          className="text-sm font-semibold text-orange-600 hover:underline"
        >
          ← Back to Customers
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
              Resolve Construction
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              {customer.name}
            </h1>

            <p className="mt-2 text-gray-500">
              Customer profile and project history
            </p>
          </div>

          <Link
            href={`/customers/${customer.id}/edit`}
            className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Edit Customer
          </Link>
        </div>

        {/* Summary */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Projects
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {projects.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Completed Projects
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {completedProjects}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Contract Value
            </p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {formatGBP(totalContractValue)}
            </p>
          </div>
        </div>

        {/* Contact details */}
        <section className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Customer Information
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">
                Contact Person
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {customer.contactName || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Phone
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {customer.phone || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Email
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {customer.email || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Address
              </p>
              <p className="mt-1 whitespace-pre-wrap font-medium text-gray-900">
                {customer.address || "Not provided"}
              </p>
            </div>
          </div>

          {customer.notes && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <p className="text-sm text-gray-500">
                Internal Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-gray-800">
                {customer.notes}
              </p>
            </div>
          )}
        </section>

        {/* Customer projects */}
        <section className="mt-8 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Customer Projects
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                All projects linked to this customer
              </p>
            </div>

            <Link
              href="/projects/new"
              className="text-sm font-semibold text-orange-600 hover:underline"
            >
              + New Project
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No projects linked to this customer yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-4">
                      Project
                    </th>
                    <th className="px-6 py-4">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right">
                      Contract Value
                    </th>
                    <th className="px-6 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="hover:bg-orange-50"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {project.name}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                          {project.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {formatGBP(
                          Number(project.contractValue)
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-orange-600 hover:underline"
                        >
                          View Project →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
