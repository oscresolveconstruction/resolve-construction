import Link from "next/link";
import { db } from "../../../../../../../src/prisma/db";
import { notFound } from "next/navigation";
import { updateExpense } from "../../../../../../actions/expenses";

type EditExpensePageProps = {
  params: Promise<{
    id: string;
    expenseId: string;
  }>;
};

export default async function EditExpensePage({
  params,
}: EditExpensePageProps) {
  const { id, expenseId } = await params;

  const projectId = Number(id);
  const expenseIdNumber = Number(expenseId);

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0 ||
    !Number.isInteger(expenseIdNumber) ||
    expenseIdNumber <= 0
  ) {
    notFound();
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    notFound();
  }

  const expense = await db.orm.public.Expense.first({
    id: expenseIdNumber,
  });

  if (!expense || expense.projectId !== projectId) {
    notFound();
  }

  const formatDateForInput = (date: string) => {
    return new Date(date).toISOString().split("T")[0];
  };

  const projectSymbol =
    project.currency === "EUR" ? "€" : "£";

  const hasReceipt = Boolean(expense.receiptFilePath);

  const isPdf =
    expense.receiptMimeType === "application/pdf";

  const receiptUrl =
    `/projects/${projectId}/expenses/${expenseIdNumber}/receipt`;

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500";

  return (
    <main className="p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/projects/${projectId}/expenses`}
          className="text-sm font-medium text-gray-500 hover:text-orange-500"
        >
          ← Back to Expenses
        </Link>

        {/* Header */}
        <div className="mt-5">
          <h1 className="text-3xl font-bold text-gray-900">
            Edit Expense
          </h1>

          <p className="mt-2 text-gray-500">
            Update expense information and manage the receipt for{" "}
            <span className="font-medium text-gray-800">
              {project.name}
            </span>
          </p>

          <div className="mt-4 inline-flex rounded-lg bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
            Project Currency: {project.currency} (
            {projectSymbol})
          </div>
        </div>

        {/* Form */}
        <form
          action={updateExpense}
          className="mt-8 rounded-xl border border-gray-100 bg-white p-8 shadow-sm"
        >
          <input
            type="hidden"
            name="projectId"
            value={projectId}
          />

          <input
            type="hidden"
            name="expenseId"
            value={expenseIdNumber}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Date */}
            <div>
              <label
                htmlFor="expense-date"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Date *
              </label>

              <input
                id="expense-date"
                type="date"
                name="date"
                required
                defaultValue={formatDateForInput(expense.date)}
                className={inputClass}
              />
            </div>

            {/* Supplier */}
            <div>
              <label
                htmlFor="expense-supplier"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Supplier *
              </label>

              <input
                id="expense-supplier"
                type="text"
                name="supplier"
                required
                defaultValue={expense.supplier}
                className={inputClass}
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="expense-category"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Category *
              </label>

              <select
                id="expense-category"
                name="category"
                required
                defaultValue={expense.category}
                className={inputClass}
              >
                <option value="Materials">Materials</option>
                <option value="Fuel">Fuel</option>
                <option value="Equipment">Equipment</option>
                <option value="Subcontractors">
                  Subcontractors
                </option>
                <option value="Transport">Transport</option>
                <option value="Tools">Tools</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="expense-amount"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Amount *
              </label>

              <input
                id="expense-amount"
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                required
                defaultValue={Number(expense.amount)}
                className={inputClass}
              />
            </div>

            {/* Currency */}
            <div>
              <label
                htmlFor="expense-currency"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Expense Currency
              </label>

              <select
                id="expense-currency"
                name="currency"
                defaultValue={expense.currency}
                className={inputClass}
              >
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>

              <p className="mt-2 text-xs text-gray-500">
                Currency used to pay this expense.
              </p>
            </div>

            {/* Exchange Rate */}
            <div>
              <label
                htmlFor="expense-rate"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Exchange Rate
              </label>

              <input
                id="expense-rate"
                type="number"
                name="exchangeRate"
                step="0.0001"
                min="0.0001"
                defaultValue={
                  expense.exchangeRate
                    ? Number(expense.exchangeRate)
                    : ""
                }
                placeholder="Only if currency is different"
                className={inputClass}
              />

              <p className="mt-2 text-xs text-gray-500">
                Enter how much 1 unit of the expense currency
                is worth in {project.currency}.
              </p>

              <p className="mt-1 text-xs font-medium text-orange-600">
                {project.currency === "GBP"
                  ? "Example: 1 EUR = 0.87 GBP → enter 0.87"
                  : "Example: 1 GBP = 1.15 EUR → enter 1.15"}
              </p>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label
                htmlFor="expense-description"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Description
              </label>

              <textarea
                id="expense-description"
                name="description"
                rows={4}
                defaultValue={expense.description || ""}
                placeholder="Optional expense notes"
                className={inputClass}
              />
            </div>
          </div>

          {/* Receipt section */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              Receipt Attachment
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              View or replace the supplier invoice or receipt
              associated with this expense.
            </p>

            {/* Current Receipt */}
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                Current Receipt
              </h3>

              {hasReceipt ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-2xl">
                      {isPdf ? "📄" : "🖼️"}
                    </div>

                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-gray-900">
                        {expense.receiptFileName ||
                          "Attached receipt"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {isPdf
                          ? "PDF Document"
                          : "Image Attachment"}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50"
                  >
                    View Receipt ↗
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">
                    No receipt attached to this expense.
                  </p>
                </div>
              )}
            </div>

            {/* Replace Receipt */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                {hasReceipt
                  ? "Replace Receipt"
                  : "Upload Receipt"}
              </h3>

              <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 16V4" />
                      <path d="m7 9 5-5 5 5" />
                      <path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
                    </svg>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">
                      {hasReceipt
                        ? "Choose a replacement file"
                        : "Attach a receipt"}
                    </p>

                    <p className="text-sm text-gray-500">
                      PDF, JPG or PNG — maximum 10 MB
                    </p>
                  </div>
                </div>

                <input
                  id="expense-receipt"
                  name="receipt"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-white text-sm text-gray-700 file:mr-4 file:cursor-pointer file:border-0 file:bg-orange-500 file:px-5 file:py-3 file:font-medium file:text-white hover:file:bg-orange-600"
                />

                <p className="mt-3 text-xs text-gray-500">
                  {hasReceipt
                    ? "Leave this empty to keep the current receipt. Selecting a new file will replace it when you save."
                    : "Optional. Select a file to attach it to this expense."}
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex justify-end gap-3">
            <Link
              href={`/projects/${projectId}/expenses`}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}