import { db } from "../../../../../../../src/prisma/db";
import { getPayrollPool } from "@/app/lib/payroll-db";
import { notFound, redirect } from "next/navigation";
import { updateInvoice } from "../../../../../../actions/invoices";

type EditInvoicePageProps = {
  params: Promise<{
    id: string;
    invoiceId: string;
  }>;
};

export default async function EditInvoicePage({
  params,
}: EditInvoicePageProps) {
  const { id, invoiceId } = await params;

  const projectId = Number(id);
  const invoiceIdNumber = Number(invoiceId);

  const invoice = await db.orm.public.Invoice.first({
    id: invoiceIdNumber,
  });

  if (!invoice || invoice.projectId !== projectId) {
    notFound();
  }

  if(invoice.status==='Void')redirect(`/invoices/${invoiceIdNumber}`);
  const linked = await getPayrollPool().query('SELECT invoice_id FROM commercial_invoice WHERE invoice_id=$1', [invoiceIdNumber]);
  if (linked.rowCount) redirect(`/invoices/${invoiceIdNumber}`);

  const formatDateForInput = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <main className="p-8">
      <div className="max-w-3xl">
        <a
          href={`/projects/${projectId}/invoices/${invoiceIdNumber}`}
          className="text-sm font-medium text-gray-500 hover:text-orange-500"
        >
          ← Back to Invoice
        </a>

        <div className="mt-5">
          <h1 className="text-3xl font-bold text-gray-900">
            Edit Invoice
          </h1>

          <p className="mt-2 text-gray-500">
            Edit {invoice.invoiceNumber}
          </p>
        </div>

        <form
          action={updateInvoice}
          className="mt-8 rounded-xl bg-white p-8 shadow-sm"
        >
          <input
            type="hidden"
            name="projectId"
            value={projectId}
          />

          <input
            type="hidden"
            name="invoiceId"
            value={invoiceIdNumber}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Invoice Number */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Invoice Number
              </label>

              <input
                name="invoiceNumber"
                type="text"
                required
                defaultValue={invoice.invoiceNumber}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                name="status"
                defaultValue={invoice.status}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
              </select>

              <p className="mt-2 text-xs text-gray-500">
                Paid and Partially Paid are calculated automatically.
              </p>
            </div>

            {/* Issue Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Issue Date
              </label>

              <input
                name="issueDate"
                type="date"
                required
                defaultValue={formatDateForInput(invoice.issueDate)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Due Date
              </label>

              <input
                name="dueDate"
                type="date"
                defaultValue={formatDateForInput(invoice.dueDate)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Invoice Amount
              </label>

              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={Number(invoice.amount)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Currency
              </label>

              <select
                name="currency"
                defaultValue={invoice.currency}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              >
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>

              <textarea
                name="description"
                rows={4}
                defaultValue={invoice.description || ""}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <a
              href={`/projects/${projectId}/invoices/${invoiceIdNumber}`}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </a>

            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-5 py-3 font-medium text-white hover:bg-orange-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}