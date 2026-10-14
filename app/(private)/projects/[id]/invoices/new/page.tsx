import { createInvoice } from "../../../../../actions/invoices";

type NewInvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewInvoicePage({
  params,
}: NewInvoicePageProps) {
  const { id } = await params;

  return (
    <main className="p-8">
      <div className="max-w-3xl">
        {/* Back */}
        <a
          href={`/projects/${id}/invoices`}
          className="text-sm font-medium text-gray-500 hover:text-orange-500"
        >
          ← Back to Invoices
        </a>

        {/* Header */}
        <div className="mt-5">
          <h1 className="text-3xl font-bold text-gray-900">
            Add Invoice
          </h1>

          <p className="mt-2 text-gray-500">
            Add a new invoice to this project
          </p>
        </div>

        {/* Form */}
        <form
          action={createInvoice}
          className="mt-8 rounded-xl bg-white p-8 shadow-sm"
        >
          <input
            type="hidden"
            name="projectId"
            value={id}
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
                placeholder="e.g. INV-2026-001"
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
                defaultValue="Draft"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
              </select>

              <p className="mt-2 text-xs text-gray-500">
                Payment status is calculated automatically.
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
                placeholder="0.00"
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
                defaultValue="GBP"
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
                placeholder="e.g. First stage payment - demolition and preparation works"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex justify-end gap-3">
            <a
              href={`/projects/${id}/invoices`}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </a>

            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-5 py-3 font-medium text-white hover:bg-orange-600"
            >
              Add Invoice
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}