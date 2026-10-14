
import Link from "next/link";
import { db } from "../../../src/prisma/db";

type PageProps = {
  searchParams: Promise<{
    type?: string;
    project?: string;
    year?: string;
    category?: string;
  }>;
};

export default async function AllExpensesPage({
  searchParams,
}: PageProps) {
  const filters = await searchParams;

  const [expenses, projects] = await Promise.all([
    db.orm.public.Expense.all(),
    db.orm.public.Project.all(),
  ]);

  const projectMap = new Map(
    projects.map((project) => [project.id, project])
  );

  const selectedType = filters.type ?? "all";
  const selectedProject = filters.project ?? "all";
  const selectedYear = filters.year ?? "all";
  const selectedCategory = filters.category ?? "all";

  const categories = Array.from(
    new Set(expenses.map((expense) => expense.category))
  ).sort();

  const years = Array.from(
    new Set(
      expenses.map((expense) =>
        new Date(expense.date).getUTCFullYear()
      )
    )
  ).sort((a, b) => b - a);

  const filteredExpenses = expenses
    .filter((expense) => {
      if (selectedType === "general" && expense.projectId !== null) {
        return false;
      }

      if (selectedType === "project" && expense.projectId === null) {
        return false;
      }

      if (
        selectedProject !== "all" &&
        String(expense.projectId) !== selectedProject
      ) {
        return false;
      }

      if (
        selectedYear !== "all" &&
        String(new Date(expense.date).getUTCFullYear()) !== selectedYear
      ) {
        return false;
      }

      if (
        selectedCategory !== "all" &&
        expense.category !== selectedCategory
      ) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  const formatMoney = (amount: number) =>
    amount.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const receiptCount = filteredExpenses.filter(
    (expense) => expense.receiptFilePath
  ).length;

  const generalCount = filteredExpenses.filter(
    (expense) => expense.projectId === null
  ).length;

  const projectCount = filteredExpenses.length - generalCount;

  return (
    <main className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            All Expenses & Receipts
          </h1>
          <p className="mt-2 text-gray-500">
            View expenses and receipts across all projects and the company.
          </p>
        </div>

        <Link
          href="/general-expenses/new"
          className="rounded-lg bg-orange-500 px-5 py-3 font-medium text-white hover:bg-orange-600"
        >
          + Add General Expense
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ["Total Expenses", filteredExpenses.length],
          ["Project Expenses", projectCount],
          ["General Expenses", generalCount],
          ["Receipts Uploaded", receiptCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {value}
            </p>
          </div>
        ))}
      </div>

      <form
        method="get"
        className="mt-8 grid gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-5"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">
            Expense Type
          </label>
          <select
            name="type"
            defaultValue={selectedType}
            className="w-full rounded-lg border border-gray-300 p-3"
          >
            <option value="all">All Expenses</option>
            <option value="project">Project Expenses</option>
            <option value="general">General Expenses</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">
            Project
          </label>
          <select
            name="project"
            defaultValue={selectedProject}
            className="w-full rounded-lg border border-gray-300 p-3"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">
            Year
          </label>
          <select
            name="year"
            defaultValue={selectedYear}
            className="w-full rounded-lg border border-gray-300 p-3"
          >
            <option value="all">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">
            Category
          </label>
          <select
            name="category"
            defaultValue={selectedCategory}
            className="w-full rounded-lg border border-gray-300 p-3"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-4 py-3 font-medium text-white hover:bg-orange-600"
          >
            Apply
          </button>
          <Link
            href="/expenses"
            className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[1100px]">
          <thead className="border-b bg-gray-50">
            <tr>
              {[
                "Date",
                "Type",
                "Project",
                "Supplier",
                "Category",
                "Description",
                "Amount",
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
            {filteredExpenses.map((expense) => {
              const project =
                expense.projectId === null
                  ? null
                  : projectMap.get(expense.projectId);

              const isGeneral = expense.projectId === null;

              const receiptUrl = isGeneral
                ? `/general-expenses/${expense.id}/receipt`
                : `/projects/${expense.projectId}/expenses/${expense.id}/receipt`;

              const editUrl = isGeneral
                ? `/general-expenses/${expense.id}/edit`
                : `/projects/${expense.projectId}/expenses/${expense.id}/edit`;

              return (
                <tr
                  key={expense.id}
                  className="border-b last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-5 py-4 text-gray-700">
                    {new Date(expense.date).toLocaleDateString("en-GB")}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={
                        isGeneral
                          ? "rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700"
                          : "rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                      }
                    >
                      {isGeneral ? "General" : "Project"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {project ? (
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-orange-600 hover:underline"
                      >
                        {project.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-5 py-4 font-medium text-gray-900">
                    {expense.supplier}
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {expense.category}
                  </td>

                  <td className="px-5 py-4 text-gray-500">
                    {expense.description || "—"}
                  </td>

                  <td className="px-5 py-4 font-semibold text-gray-900">
                    {expense.currency === "EUR" ? "€" : "£"}
                    {formatMoney(Number(expense.amount))}
                    <span className="ml-1 text-xs font-normal text-gray-500">
                      {expense.currency}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {expense.receiptFilePath ? (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-orange-600 hover:underline"
                      >
                        {expense.receiptMimeType === "application/pdf"
                          ? "View PDF"
                          : "View Image"}
                      </a>
                    ) : (
                      <span className="text-gray-400">
                        No receipt
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      href={editUrl}
                      className="font-medium text-orange-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}

            {filteredExpenses.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No expenses match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
