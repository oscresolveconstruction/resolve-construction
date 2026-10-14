
import Link from "next/link";
import { db } from "../../../src/prisma/db";
import DeleteExpenseButton from "../../components/DeleteExpenseButton";

export default async function GeneralExpensesPage() {
  const expenses = await db.orm.public.Expense
    .where({ projectId: null })
    .all();

  const getCostGBP = (expense: (typeof expenses)[number]) => {
    const amount = Number(expense.amount);

    if (expense.currency === "GBP") {
      return amount;
    }

    return amount * Number(expense.exchangeRate ?? 0);
  };

  const hasMissingRates = expenses.some(
    (expense) =>
      expense.currency === "EUR" &&
      (expense.exchangeRate === null ||
        Number(expense.exchangeRate) <= 0)
  );

  const totalCosts = expenses.reduce(
    (total, expense) =>
      total +
      (expense.currency === "EUR" &&
      !expense.exchangeRate
        ? 0
        : getCostGBP(expense)),
    0
  );

  const receiptCount = expenses.filter(
    (expense) => expense.receiptFilePath
  ).length;

  const formatMoney = (amount: number) =>
    amount.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <main className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            General Expenses
          </h1>

          <p className="mt-2 text-gray-500">
            Manage company expenses not associated with a project.
          </p>
        </div>

        <Link
          href="/general-expenses/new"
          className="rounded-lg bg-orange-500 px-5 py-3 font-medium text-white hover:bg-orange-600"
        >
          + Add General Expense
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total General Expenses
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            £{formatMoney(totalCosts)}
          </p>

          <p className="mt-2 text-xs text-gray-400">
            {hasMissingRates
              ? "Incomplete total: some EUR expenses need an exchange rate."
              : "All amounts converted to GBP"}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Expenses Recorded
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {expenses.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Receipts Uploaded
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-500">
            {receiptCount}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[1100px]">
          <thead className="border-b bg-gray-50">
            <tr>
              {[
                "Date",
                "Supplier",
                "Category",
                "Description",
                "Amount",
                "Cost GBP",
                "Receipt",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-5 py-4 text-left text-sm font-semibold text-gray-600"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {expenses.map((expense) => {
              const needsConversion = expense.currency !== "GBP";

              const missingRate =
                needsConversion &&
                (expense.exchangeRate === null ||
                  Number(expense.exchangeRate) <= 0);

              return (
                <tr
                  key={expense.id}
                  className="border-b last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-5 py-5 text-gray-700">
                    {new Date(expense.date).toLocaleDateString("en-GB")}
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

                  <td className="px-5 py-5 font-medium text-gray-900">
                    {expense.currency === "EUR" ? "€" : "£"}
                    {formatMoney(Number(expense.amount))}
                  </td>

                  <td className="px-5 py-5 font-semibold text-gray-900">
                    {missingRate ? (
                      <span className="text-red-600">
                        Missing rate
                      </span>
                    ) : (
                      <>£{formatMoney(getCostGBP(expense))}</>
                    )}
                  </td>

                  <td className="px-5 py-5">
                    {expense.receiptFilePath ? (
                      <a
                        href={`/general-expenses/${expense.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-orange-600 hover:underline"
                      >
                        {expense.receiptMimeType === "application/pdf"
                          ? "View PDF"
                          : "View Image"}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">
                        No receipt
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-5">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/general-expenses/${expense.id}/edit`}
                        className="font-medium text-orange-600 hover:underline"
                      >
                        Edit
                      </Link>

                      <DeleteExpenseButton
                        expenseId={expense.id}
                        projectId={null}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No general expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
