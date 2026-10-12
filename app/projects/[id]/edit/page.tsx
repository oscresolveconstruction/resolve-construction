import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../src/prisma/db";
import { updateProject } from "../../../actions/projects";
import { getSessionUserId } from "../../../lib/auth";
import { redirect } from "next/navigation";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const owner = await db.orm.public.AppUser.first({ id: userId });
  if (!owner || !owner.isActive) redirect("/login");

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) notFound();

  const [project, customers] = await Promise.all([
    db.orm.public.Project.first({ id: projectId }),
    db.orm.public.Customer.all(),
  ]);
  if (!project) notFound();

  const customerOptions = [...customers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const selectedCustomerExists = customerOptions.some(
    (customer) => customer.id === project.customerId
  );

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
  const labelClass = "mb-2 block text-sm font-semibold text-gray-700";

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm font-semibold text-gray-500 hover:text-orange-600"
        >
          ← Back to Project
        </Link>

        <div className="mt-7">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
            Resolve Construction
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Edit Project</h1>
          <p className="mt-2 text-gray-500">
            Update the project details without affecting expenses, labour, payments or photos.
          </p>
        </div>

        <form
          action={updateProject}
          className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-2 bg-orange-500" />
          <div className="space-y-6 p-6 lg:p-8">
            <input type="hidden" name="projectId" value={projectId} />

            <div>
              <label htmlFor="name" className={labelClass}>Project Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                maxLength={200}
                defaultValue={project.name}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="customerId" className={labelClass}>Customer *</label>
              <select
                id="customerId"
                name="customerId"
                required
                defaultValue={project.customerId ?? ""}
                className={inputClass}
              >
                <option value="" disabled>Select a customer</option>
                {!selectedCustomerExists && project.customerId != null && (
                  <option value={project.customerId} disabled>
                    Previous customer unavailable — select another
                  </option>
                )}
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                The customer name on the project will update to match this selection.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="contractValue" className={labelClass}>
                  Contract Value (£) *
                </label>
                <input
                  id="contractValue"
                  name="contractValue"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={Number(project.contractValue)}
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Original contract amount. Approved extra works are added separately.
                </p>
              </div>

              <div>
                <label htmlFor="status" className={labelClass}>Project Status *</label>
                <select
                  id="status"
                  name="status"
                  required
                  defaultValue={project.status}
                  className={inputClass}
                >
                  {(["Planning", "Active", "On Hold", "Completed"] as const).map(
                    (status) => (
                      <option key={status} value={status}>{status}</option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="startDate" className={labelClass}>Start Date</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={project.startDate ? project.startDate.slice(0, 10) : ""}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>Description</label>
              <textarea
                id="description"
                name="description"
                rows={5}
                maxLength={5000}
                defaultValue={project.description ?? ""}
                placeholder="Project details, scope of works, or notes..."
                className={inputClass}
              />
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
              <strong>Currency: GBP (£).</strong> Updating this project will not delete
              its existing expenses, labour entries, payments, extra works or photos.
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
              <Link
                href={`/projects/${projectId}`}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
