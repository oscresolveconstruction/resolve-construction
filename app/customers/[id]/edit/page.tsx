
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../src/prisma/db";
import { updateCustomer } from "../../../actions/customers";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({
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

  const inputClass =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  const labelClass =
    "block text-sm font-semibold text-gray-700";

  return (
    <main className="flex-1 p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/customers"
          className="text-sm font-semibold text-orange-600 hover:underline"
        >
          ← Back to Customers
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Resolve Construction
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Edit Customer
          </h1>

          <p className="mt-2 text-gray-500">
            Update the details for {customer.name}.
          </p>
        </div>

        <form action={updateCustomer} className="mt-8 space-y-6">
          <input
            type="hidden"
            name="customerId"
            value={customer.id}
          />

          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Customer Information
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="name" className={labelClass}>
                  Customer / Company Name *
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  maxLength={200}
                  defaultValue={customer.name}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="contactName"
                  className={labelClass}
                >
                  Contact Person
                </label>

                <input
                  id="contactName"
                  name="contactName"
                  type="text"
                  defaultValue={customer.contactName ?? ""}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={customer.phone ?? ""}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="email" className={labelClass}>
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={customer.email ?? ""}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className={labelClass}>
                  Address
                </label>

                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  defaultValue={customer.address ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Additional Information
            </h2>

            <div className="mt-5">
              <label htmlFor="notes" className={labelClass}>
                Internal Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={5}
                defaultValue={customer.notes ?? ""}
                className={inputClass}
              />
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/customers"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-8 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
