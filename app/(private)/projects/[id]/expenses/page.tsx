import Link from "next/link";
import { db } from "../../../../../src/prisma/db";
import DeleteExpenseButton from "../../../../components/DeleteExpenseButton";
import { notFound } from "next/navigation";

type ExpensesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExpensesPage({
  params,
}: ExpensesPageProps) {
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

  const expenses = await db.orm.public.Expense
    .where({ projectId })
    .all();

  const projectSymbol =
    project.currency === "EUR" ? "€" : "£";

  const getProjectCost = (
    expense: (typeof expenses)[number]
  ) => {
    const amount = Number(expense.amount);

    if (expense.currency === project.currency) {
      return amount;
    }

    const exchangeRate = expense.exchangeRate
      ? Number(expense.exchangeRate)
      : 0;

    return amount * exchangeRate;
  };

  const totalCosts = expenses.reduce(
    (total, expense) => total + getProjectCost(expense),
    0
  );

  const receiptsCount = expenses.filter(
    (expense) => expense.receiptFilePath
  ).length;

  const formatMoney = (amount: number) =>
    amount.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <main className="p-8">
      <Link
        href={`/projects/${project.id}`}
        className="text-sm font-medium text-gray-500 hover:text-orange-500"
      >
        ← Back to Project
      </Link>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Expenses & Receipts
          </h1>

          <p className="mt-2 text-gray-500">
            {project.name}
          </p>

          <p className="mt-1 text-sm text-gray-400">
            Project currency: {project.currency}
          </p>
        </div>

        <Link
          href={`/projects/${project.id}/expenses/new`}
          className="rounded-lg bg-orange-500 px-5 py-3 font-medium text-white hover:bg-orange-600"
        >
          + Add Expense
        </Link>
      </div>

      {/* Summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Costs
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {projectSymbol}
            {formatMoney(totalCosts)}
          </p>

          <p className="mt-2 text-xs text-gray-400">
            Converted to {project.currency}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Expenses
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {expenses.length}
          </p>

          <p className="mt-2 text-xs text-gray-400">
            Recorded supplier expenses
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Receipts Uploaded
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-500">
            {receiptsCount}
          </p>

          <p className="mt-2 text-xs text-gray-400">
            Attached PDF and image files
          </p>
        </div>
      </div>

      {/* Expenses table */}
      <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[1200px]">
          <thead className="border-b bg-gray-50">
            <tr>
              {[
                "Date",
                "Supplier",
                "Category",
                "Description",
                "Original Amount",
                "Exchange Rate",
                "Project Cost",
                "Receipt",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className={`px-5 py-4 text-sm font-semibold text-gray-600 ${
                    [
                      "Original Amount",
                      "Exchange Rate",
                      "Project Cost",
                      "Actions",
                    ].includes(heading)
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {expenses.map((expense) => {
              const expenseSymbol =
                expense.currency === "EUR" ? "€" : "£";

              const needsConversion =
                expense.currency !== project.currency;

              const projectCost = getProjectCost(expense);

              const hasReceipt = Boolean(
                expense.receiptFilePath
              );

              const isPdf =
                expense.receiptMimeType === "application/pdf";

              return (
                <tr
                  key={expense.id}
                  className="border-b last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-5 py-5 text-gray-700">
                    {new Date(expense.date).toLocaleDateString(
                      "en-GB"
                    )}
                  </td>

                  <td className="px-5 py-5 font-medium text-gray-900">
                    {expense.supplier}
                  </td>

                  <td className="px-5 py-5 text-gray-700">
                    {expense.category}
                  </td>

                  <td className="px-5 py-5 text-gray-500">
                    {expense.description || "—"}
                  </td>

                  <td className="px-5 py-5 text-right font-medium text-gray-900">
                    {expenseSymbol}
                    {formatMoney(Number(expense.amount))}
                  </td>

                  <td className="px-5 py-5 text-right text-gray-600">
                    {needsConversion ? (
                      expense.exchangeRate ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {Number(
                              expense.exchangeRate
                            ).toFixed(4)}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            1 {expense.currency} ={" "}
                            {Number(
                              expense.exchangeRate
                            ).toFixed(4)}{" "}
                            {project.currency}
                          </p>
                        </div>
                      ) : (
                        <span className="font-medium text-red-600">
                          Missing
                        </span>
                      )
                    ) : (
                      <span className="text-gray-400">
                        —
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-5 text-right">
                    {needsConversion &&
                    !expense.exchangeRate ? (
                      <span className="text-sm font-medium text-red-600">
                        Not converted
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-900">
                        {projectSymbol}
                        {formatMoney(projectCost)}
                      </span>
                    )}
                  </td>

                  {/* Receipt */}
                  <td className="px-5 py-5">
                    {hasReceipt ? (
                      <Link
                        href={`/projects/${project.id}/expenses/${expense.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={expense.receiptFileName || "Receipt"}
                        className="inline-flex whitespace-nowrap items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-100"
                      >
                        {isPdf ? "📄" : "🖼️"}
                        {isPdf ? "View PDF" : "View Image"}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">
                        No receipt
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-5">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/projects/${project.id}/expenses/${expense.id}/edit`}
                        className="text-sm font-medium text-gray-600 hover:text-orange-500"
                      >
                        Edit
                      </Link>

                      <DeleteExpenseButton
                        projectId={project.id}
                        expenseId={expense.id}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No expenses have been added to this project yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}