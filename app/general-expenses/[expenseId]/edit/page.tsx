
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../src/prisma/db";
import { updateExpense } from "../../../actions/expenses";

type PageProps = {
  params: Promise<{ expenseId: string }>;
};

export default async function EditGeneralExpensePage({
  params,
}: PageProps) {
  const { expenseId: rawExpenseId } = await params;
  const expenseId = Number(rawExpenseId);

  if (!Number.isInteger(expenseId) || expenseId <= 0) {
    notFound();
  }

  const expense = await db.orm.public.Expense.first({
    id: expenseId,
  });

  if (!expense || expense.projectId !== null) {
    notFound();
  }

  const date = new Date(expense.date)
    .toISOString()
    .slice(0, 10);

  const categories = [
    "Office Rent",
    "Utilities",
    "Internet & Phone",
    "Insurance",
    "Vehicle & Fuel",
    "Accounting & Legal",
    "Software & Subscriptions",
    "Office Supplies",
    "Equipment",
    "Bank Charges",
    "Marketing",
    "Other",
  ];

  // Preserve existing categories even if they are not
  // included in the standard list.
  if (!categories.includes(expense.category)) {
    categories.push(expense.category);
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link
        href="/general-expenses"
        className="text-sm font-medium text-orange-600 hover:text-orange-700"
      >
        ← Back to General Expenses
      </Link>

      <div className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Edit General Expense
        </h1>

        <p className="mt-2 text-gray-500">
          Update expense details or replace the attached receipt.
        </p>
      </div>

      <form
        action={updateExpense}
        className="space-y-6 rounded-2xl bg-white p-8 shadow-sm"
      >
        <input type="hidden" name="expenseId" value={expense.id} />
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
              defaultValue={date}
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
              defaultValue={expense.supplier}
              required
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
              defaultValue={expense.category}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
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
              defaultValue={Number(expense.amount)}
              required
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
              defaultValue={expense.currency}
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
              defaultValue={
                expense.exchangeRate === null
                  ? ""
                  : Number(expense.exchangeRate)
              }
              placeholder="e.g. 0.86"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
            />
            <p className="mt-2 text-xs text-gray-500">
              Required for EUR expenses. Enter the GBP value of 1 EUR.
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
            defaultValue={expense.description ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 p-6">
          <p className="mb-2 text-sm font-semibold text-gray-800">
            Current Receipt
          </p>

          {expense.receiptFilePath ? (
            <a
              href={`/general-expenses/${expense.id}/receipt`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-orange-600 hover:underline"
            >
              {expense.receiptFileName || "View current receipt"}
            </a>
          ) : (
            <p className="text-sm text-gray-500">
              No receipt attached.
            </p>
          )}

          <label
            htmlFor="receipt"
            className="mb-2 mt-6 block text-sm font-semibold text-gray-800"
          >
            {expense.receiptFilePath
              ? "Replace Receipt"
              : "Attach Receipt"}
          </label>

          <input
            id="receipt"
            type="file"
            name="receipt"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-orange-600"
          />

          <p className="mt-3 text-xs text-gray-500">
            PDF, JPG or PNG. Maximum 10 MB. Leave empty to keep
            the current receipt.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t pt-6">
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
            Save Changes
          </button>
        </div>
      </form>
    </main>
  );
}
