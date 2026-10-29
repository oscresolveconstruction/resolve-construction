import {randomUUID} from 'node:crypto';
import PendingSubmit from '../../../../../components/PendingSubmit';
import Link from "next/link";
import { createExpense } from "../../../../../actions/expenses";
import { db } from "../../../../../../src/prisma/db";
import { notFound } from "next/navigation";

type NewExpensePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewExpensePage({
  params,
}: NewExpensePageProps) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    notFound();
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    notFound();
  }

  const projectSymbol =
    project.currency === "EUR" ? "€" : "£";

  return (
    <main className="p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/projects/${project.id}/expenses`}
          className="text-sm font-medium text-gray-500 hover:text-orange-500"
        >
          ← Back to Expenses
        </Link>

        {/* Header */}
        <div className="mt-5">
          <h1 className="text-3xl font-bold text-gray-900">
            Add Expense
          </h1>

          <p className="mt-2 text-gray-500">
            Record an expense and attach its receipt to{" "}
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
          action={createExpense}
          encType="multipart/form-data"
          className="mt-8 rounded-xl border border-gray-100 bg-white p-8 shadow-sm"
        ><input type="hidden" name="requestId" value={randomUUID()}/>
          <input
            type="hidden"
            name="projectId"
            value={project.id}
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
                name="date"
                type="date"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
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
                name="supplier"
                type="text"
                required
                placeholder="e.g. Gib Oil"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
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
                defaultValue=""
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              >
                <option value="" disabled>
                  Select category
                </option>
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
              <label
                htmlFor="expense-currency"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Expense Currency
              </label>

              <select
                id="expense-currency"
                name="currency"
                defaultValue={project.currency}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
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
                name="exchangeRate"
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder="Only if currency is different"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              />

              <p className="mt-2 text-xs text-gray-500">
                Value of 1 unit of the expense currency
                in {project.currency}.
              </p>

              <p className="mt-1 text-xs font-medium text-orange-600">
                Example: 1 EUR = 0.87 GBP → enter 0.87
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
                rows={3}
                placeholder="What was this expense for?"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Receipt Attachment
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Upload the supplier invoice or receipt
                associated with this expense.
              </p>
            </div>

            <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
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
                    Upload Receipt
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
                Optional. You can add an expense without
                uploading a document.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex justify-end gap-3">
            <Link
              href={`/projects/${project.id}/expenses`}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <PendingSubmit
              type="submit"
              className="rounded-lg bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
            >
              Save Expense & Receipt
            </PendingSubmit>
          </div>
        </form>
      </div>
    </main>
  );
}