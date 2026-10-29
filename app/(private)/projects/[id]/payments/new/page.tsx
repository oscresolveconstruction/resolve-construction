import {randomUUID} from 'node:crypto';
import PendingSubmit from '../../../../../components/PendingSubmit';
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPayment } from "../../../../../actions/payments";
import { db } from "../../../../../../src/prisma/db";

type NewPaymentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewPaymentPage({
  params,
}: NewPaymentPageProps) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    notFound();
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    notFound();
  }

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  const labelClass =
    "mb-2 block text-sm font-semibold text-gray-700";

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/projects/${projectId}/payments`}
          className="text-sm font-semibold text-gray-500 hover:text-orange-600"
        >
          ← Back to Payments
        </Link>

        <div className="mt-7">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
            Resolve Construction
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Add Payment
          </h1>

          <p className="mt-2 text-gray-500">
            Record a payment received for {project.name}
          </p>
        </div>

        <form
          action={createPayment}
          encType="multipart/form-data"
          className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        ><input type="hidden" name="requestId" value={randomUUID()}/>
          <div className="h-2 bg-orange-500" />

          <div className="p-6 lg:p-8">
            <input
              type="hidden"
              name="projectId"
              value={projectId}
            />

            <div className="grid gap-6 md:grid-cols-2">
              {/* PAYMENT DATE */}

              <div>
                <label htmlFor="date" className={labelClass}>
                  Payment Date *
                </label>

                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date()
                    .toISOString()
                    .slice(0, 10)}
                  className={inputClass}
                />
              </div>

              {/* AMOUNT */}

              <div>
                <label htmlFor="amount" className={labelClass}>
                  Amount *
                </label>

                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>

              {/* CURRENCY */}

              <div>
                <label htmlFor="currency" className={labelClass}>
                  Currency *
                </label>

                <select
                  id="currency"
                  name="currency"
                  defaultValue={project.currency}
                  className={inputClass}
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              {/* PAYMENT METHOD */}

              <div>
                <label
                  htmlFor="paymentMethod"
                  className={labelClass}
                >
                  Payment Method
                </label>

                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  defaultValue="Bank Transfer"
                  className={inputClass}
                >
                  <option value="Bank Transfer">
                    Bank Transfer
                  </option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* REFERENCE */}

              <div className="md:col-span-2">
                <label
                  htmlFor="reference"
                  className={labelClass}
                >
                  Payment Reference
                </label>

                <input
                  id="reference"
                  name="reference"
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Bank transfer reference"
                  className={inputClass}
                />
              </div>

              {/* DESCRIPTION */}

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
                  maxLength={2000}
                  placeholder="Additional information about this payment..."
                  className={inputClass}
                />
              </div>

              {/* OPTIONAL RECEIPT */}

              <div className="md:col-span-2">
                <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/50 p-5">
                  <label
                    htmlFor="receipt"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    <span className="mr-2">📎</span>
                    Payment Receipt (Optional)
                  </label>

                  <p className="mb-4 text-sm text-gray-500">
                    Attach a bank transfer confirmation,
                    payment receipt or other supporting
                    document.
                  </p>

                  <input
                    id="receipt"
                    name="receipt"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-orange-700"
                  />

                  <p className="mt-3 text-xs text-gray-500">
                    Accepted formats: PDF, JPG and PNG.
                    Maximum file size: 10 MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
              <Link
                href={`/projects/${projectId}/payments`}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              <PendingSubmit
                type="submit"
                className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Save Payment
              </PendingSubmit>
            </div>
          </div>
        </form>

        <p className="mt-5 text-sm text-gray-500">
          Payments are recorded directly against the project.
          No invoice is required.
        </p>
      </div>
    </main>
  );
}