
import Link from "next/link";
import { createProject } from "../../../actions/projects";
import { db } from "../../../../src/prisma/db";

export default async function NewProject() {
  const customers = await db.orm.public.Customer.all();

  const sortedCustomers = [...customers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const inputClass =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  const labelClass =
    "block text-sm font-semibold text-gray-700";

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/projects"
          className="text-sm font-semibold text-orange-600 hover:underline"
        >
          ← Back to Projects
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Resolve Construction
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            New Project
          </h1>

          <p className="mt-2 text-gray-500">
            Create a new construction project.
          </p>
        </div>

        <form
          action={createProject}
          className="mt-8 space-y-6"
        >
          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Project Information
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="name" className={labelClass}>
                  Project Name *
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Ocean Village Apartment"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="customerId"
                  className={labelClass}
                >
                  Customer *
                </label>

                <select
                  id="customerId"
                  name="customerId"
                  required
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a customer
                  </option>

                  {sortedCustomers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-sm text-gray-500">
                  Can&apos;t find the customer?{" "}
                  <Link
                    href="/customers/new"
                    className="font-semibold text-orange-600 hover:underline"
                  >
                    Add a new customer →
                  </Link>
                </p>
              </div>

              <div>
                <label
                  htmlFor="contractValue"
                  className={labelClass}
                >
                  Contract Value (£) *
                </label>

                <input
                  id="contractValue"
                  name="contractValue"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Currency
                </label>

                <input
                  type="text"
                  value="GBP (£) — British Pound"
                  readOnly
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600"
                />

                <input
                  type="hidden"
                  name="currency"
                  value="GBP"
                />
              </div>

              <div>
                <label
                  htmlFor="startDate"
                  className={labelClass}
                >
                  Start Date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="status" className={labelClass}>
                  Status
                </label>

                <select
                  id="status"
                  name="status"
                  defaultValue="Planning"
                  className={inputClass}
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className={labelClass}
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Project description..."
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Link
              href="/projects"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={sortedCustomers.length === 0}
              className="rounded-lg bg-orange-500 px-8 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
