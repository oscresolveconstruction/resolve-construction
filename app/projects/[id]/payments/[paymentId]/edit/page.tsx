import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../../../src/prisma/db";
import { updatePayment } from "../../../../../actions/payments";
import RemovePaymentReceiptButton from "../../../../../components/RemovePaymentReceiptButton";

type EditPaymentPageProps = {
  params: Promise<{
    id: string;
    paymentId: string;
  }>;
};

export default async function EditPaymentPage({
  params,
}: EditPaymentPageProps) {
  const { id, paymentId } = await params;

  const projectId = Number(id);
  const paymentIdNumber = Number(paymentId);

  if (
    !Number.isSafeInteger(projectId) ||
    projectId <= 0 ||
    !Number.isSafeInteger(paymentIdNumber) ||
    paymentIdNumber <= 0
  ) {
    notFound();
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    notFound();
  }

  const payment = await db.orm.public.Payment.first({
    id: paymentIdNumber,
  });

  if (!payment || payment.projectId !== projectId) {
    notFound();
  }

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  const labelClass =
    "mb-2 block text-sm font-semibold text-gray-700";

  const paymentMethods = [
    "Bank Transfer",
    "Cash",
    "Cheque",
    "Card",
    "Other",
  ];

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
            Edit Payment
          </h1>

          <p className="mt-2 text-gray-500">
            Update payment information for {project.name}
          </p>
        </div>

        <form
          action={updatePayment}
          className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-2 bg-orange-500" />

          <div className="p-6 lg:p-8">
            <input
              type="hidden"
              name="projectId"
              value={projectId}
            />

            <input
              type="hidden"
              name="paymentId"
              value={paymentIdNumber}
            />

            <div className="grid gap-6 md:grid-cols-2">
              {/* PAYMENT DATE */}

              <div>
                <label htmlFor="date" className={labelClass}>
                  Payment Date *
                </label>

                <input
                  id="date"
                  type="date"
                  name="date"
                  required
                  defaultValue={payment.date.slice(0, 10)}
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
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={Number(payment.amount)}
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
                  defaultValue={payment.currency}
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
                  defaultValue={payment.paymentMethod || ""}
                  className={inputClass}
                >
                  <option value="">Not specified</option>

                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
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
                  type="text"
                  name="reference"
                  maxLength={200}
                  defaultValue={payment.reference || ""}
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
                  defaultValue={payment.description || ""}
                  placeholder="Additional information about this payment..."
                  className={inputClass}
                />
              </div>

              {/* PAYMENT RECEIPT */}

              <div className="md:col-span-2">
                <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/50 p-5">
                  <label
                    htmlFor="receipt"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    📎 Payment Receipt (Optional)
                  </label>

                  {payment.receiptFilePath ? (
                    <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Current Receipt
                      </p>

                      <p className="mt-2 break-all text-sm font-medium text-gray-800">
                        {payment.receiptFileName ||
                          "Payment receipt"}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <a
                          href={`/api/payments/${payment.id}/receipt`}
                          className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-100"
                        >
                          📥 Download Current Receipt
                        </a>

                        <RemovePaymentReceiptButton
                          projectId={projectId}
                          paymentId={payment.id}
                        />
                      </div>

                      <p className="mt-3 text-xs text-gray-500">
                        Removing the receipt will not delete
                        or change the payment.
                      </p>
                    </div>
                  ) : (
                    <p className="mb-4 text-sm text-gray-500">
                      No receipt has been uploaded for this payment.
                    </p>
                  )}

                  <input
                    id="receipt"
                    name="receipt"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-orange-700"
                  />

                  <p className="mt-3 text-xs text-gray-500">
                    PDF, JPG or PNG. Maximum 10 MB.
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Leave this field empty to keep the existing
                    receipt. Uploading a new file will replace it.
                  </p>
                </div>
              </div>
            </div>

            {/* ACTIONS */}

            <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
              <Link
                href={`/projects/${projectId}/payments`}
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