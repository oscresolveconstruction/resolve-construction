
import Link from "next/link";
import { db } from "../../../src/prisma/db";

export default async function CustomersPage() {
  const [customers, projects] = await Promise.all([
    db.orm.public.Customer.all(),
    db.orm.public.Project.all(),
  ]);

  const sortedCustomers = [...customers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const projectCounts = new Map<number, number>();

  for (const project of projects) {
    if (project.customerId !== null) {
      projectCounts.set(
        project.customerId,
        (projectCounts.get(project.customerId) ?? 0) + 1
      );
    }
  }

  return (
    <main className="flex-1 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Resolve Construction
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Customers
          </h1>

          <p className="mt-2 text-gray-500">
            Manage customers and their construction projects.
          </p>
        </div>

        <Link
          href="/customers/new"
          className="rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
        >
          + Add Customer
        </Link>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Customers
          </p>
          <p className="mt-2 text-4xl font-bold text-gray-900">
            {customers.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Linked Projects
          </p>
          <p className="mt-2 text-4xl font-bold text-orange-500">
            {projects.filter((project) => project.customerId !== null).length}
          </p>
        </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Customer Directory
          </h2>
        </div>

        {sortedCustomers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-gray-900">
              No customers yet
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Add your first customer to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">
                    Customer
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    Contact
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    Email
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    Phone
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    Projects
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {sortedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-orange-50"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {customer.name}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {customer.contactName || "—"}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {customer.email || "—"}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {customer.phone || "—"}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {projectCounts.get(customer.id) ?? 0}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-4">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-semibold text-orange-600 hover:underline"
                        >
                          View
                        </Link>

                        <Link
                          href={`/customers/${customer.id}/edit`}
                          className="font-semibold text-gray-600 hover:underline"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
