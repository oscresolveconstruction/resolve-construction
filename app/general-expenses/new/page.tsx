
import Link from "next/link";
import { createExpense } from "../../actions/expenses";

export default function NewGeneralExpensePage() {
  const today = new Date().toLocaleDateString("en-CA");

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <Link
          href="/general-expenses"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          ← Back to General Expenses
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          New General Expense
        </h1>

        <p className="mt-2 text-gray-500">
          Record a company expense not associated with any project.
        </p>
      </div>

      <form
        action={createExpense}
        encType="multipart/form-data"
        className="space-y-6 rounded-2xl bg-white p-8 shadow-sm"
      >
        {/* Empty projectId means General Expense */}
        <input type="hidden" name="projectId" value="" />

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="date"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Expense Date *
            </label>
            <input
              id="date"
              type="date"
              name="date"
              defaultValue={today}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="supplier"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Supplier *
            </label>
            <input
              id="supplier"
              type="text"
              name="supplier"
              required
              placeholder="e.g. Gibtelecom"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Category *
            </label>
            <select
              id="category"
              name="category"
              required
              defaultValue=""
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
            >
              <option value="" disabled>
                Select a category
              </option>
              <option value="Office Rent">Office Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Internet & Phone">Internet & Phone</option>
              <option value="Insurance">Insurance</option>
              <option value="Vehicle & Fuel">Vehicle & Fuel</option>
              <option value="Accounting & Legal">
                Accounting & Legal
              </option>
              <option value="Software & Subscriptions">
                Software & Subscriptions
              </option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Equipment">Equipment</option>
              <option value="Bank Charges">Bank Charges</option>
              <option value="Marketing">Marketing</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Amount *
            </label>
            <input
              id="amount"
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="currency"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Currency *
            </label>
            <select
              id="currency"
              name="currency"
              defaultValue="GBP"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
            >
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="exchangeRate"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Exchange Rate (EUR to GBP)
            </label>
            <input
              id="exchangeRate"
              type="number"
              name="exchangeRate"
              step="any"
              min="0.000001"
              placeholder="e.g. 0.86"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
            />
            <p className="mt-2 text-xs text-gray-500">
              Required only for EUR expenses. Enter how many GBP
              equal 1 EUR.
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Additional details about this expense..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 p-6">
          <label
            htmlFor="receipt"
            className="mb-2 block text-sm font-semibold text-gray-800"
          >
            Attach Receipt or Invoice
          </label>

          <input
            id="receipt"
            type="file"
            name="receipt"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-orange-600"
          />

          <p className="mt-3 text-xs text-gray-500">
            PDF, JPG or PNG. Maximum file size: 10 MB.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t pt-6">
          <Link
            href="/general-expenses"
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Save General Expense
          </button>
        </div>
      </form>
    </main>
  );
}
