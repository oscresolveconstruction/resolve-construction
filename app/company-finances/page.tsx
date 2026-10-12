
import Link from "next/link";
import { db } from "../../src/prisma/db";

type PageProps = {
  searchParams: Promise<{ year?: string }>;
};

const money = (value: number) =>
  value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });

export default async function CompanyFinancesPage({
  searchParams,
}: PageProps) {
  const { year } = await searchParams;

  const [projects, expenses, labour, payments] =
    await Promise.all([
      db.orm.public.Project.all(),
      db.orm.public.Expense.all(),
      db.orm.public.Labour.all(),
      db.orm.public.Payment.all(),
    ]);

  const currentYear = new Date().getUTCFullYear();
  const selectedYear =
    year && /^\d{4}$/.test(year) ? Number(year) : currentYear;

  const projectMap = new Map(
    projects.map((project) => [project.id, project])
  );

  const inSelectedYear = (date: string) =>
    new Date(date).getUTCFullYear() === selectedYear;

  const yearExpenses = expenses.filter((item) =>
    inSelectedYear(item.date)
  );

  const yearLabour = labour.filter((item) =>
    inSelectedYear(item.date)
  );

  const yearPayments = payments.filter((item) =>
    inSelectedYear(item.date)
  );

  // For amounts already denominated in GBP, no conversion is needed.
  // For EUR project costs, the stored exchange rate is in the
  // project's currency, which is not always GBP.
  // We therefore do not guess a GBP rate.
  function expenseGBP(
    expense: (typeof expenses)[number]
  ): number | null {
    const amount = Number(expense.amount);

    if (expense.currency === "GBP") return amount;

    if (expense.projectId === null) {
      const rate = Number(expense.exchangeRate ?? 0);
      return rate > 0 ? amount * rate : null;
    }

    const project = projectMap.get(expense.projectId);

    if (project?.currency === "GBP") {
      const rate = Number(expense.exchangeRate ?? 0);
      return rate > 0 ? amount * rate : null;
    }

    return null;
  }

  function labourGBP(
    entry: (typeof labour)[number]
  ): number | null {
    const amount = Number(entry.amount);

    if (entry.currency === "GBP") return amount;

    const project = projectMap.get(entry.projectId);

    if (project?.currency === "GBP") {
      const rate = Number(entry.exchangeRate ?? 0);
      return rate > 0 ? amount * rate : null;
    }

    return null;
  }

  const projectExpenses = yearExpenses.filter(
    (expense) => expense.projectId !== null
  );

  const generalExpenses = yearExpenses.filter(
    (expense) => expense.projectId === null
  );

  function sumConverted<T>(
    items: T[],
    convert: (item: T) => number | null
  ) {
    return items.reduce(
      (result, item) => {
        const value = convert(item);

        if (value === null) {
          result.missing += 1;
        } else {
          result.total += value;
        }

        return result;
      },
      { total: 0, missing: 0 }
    );
  }

  const projectCost = sumConverted(
    projectExpenses,
    expenseGBP
  );

  const generalCost = sumConverted(
    generalExpenses,
    expenseGBP
  );

  const labourCost = sumConverted(
    yearLabour,
    labourGBP
  );

  const received = sumConverted(yearPayments, (payment) =>
    payment.currency === "GBP"
      ? Number(payment.amount)
      : null
  );

  // Contract value is a lifetime project figure.
  // Do not pretend it is revenue earned in this year.
  const contractValue = sumConverted(
    projects,
    (project) =>
      project.currency === "GBP"
        ? Number(project.contractValue)
        : null
  );

  const annualCosts =
    projectCost.total +
    generalCost.total +
    labourCost.total;

  const annualCashBalance =
    received.total - annualCosts;

  // Lifetime estimated profit requires all costs, not only
  // costs from the selected year.
  const allProjectExpenses = sumConverted(
    expenses.filter((expense) => expense.projectId !== null),
    expenseGBP
  );

  const allGeneralExpenses = sumConverted(
    expenses.filter((expense) => expense.projectId === null),
    expenseGBP
  );

  const allLabour = sumConverted(labour, labourGBP);

  const estimatedProfit =
    contractValue.total -
    allProjectExpenses.total -
    allGeneralExpenses.total -
    allLabour.total;

  const missingAnnual =
    projectCost.missing +
    generalCost.missing +
    labourCost.missing +
    received.missing;

  const missingLifetime =
    contractValue.missing +
    allProjectExpenses.missing +
    allGeneralExpenses.missing +
    allLabour.missing;

  const availableYears = Array.from(
    new Set([
      currentYear,
      ...expenses.map((item) =>
        new Date(item.date).getUTCFullYear()
      ),
      ...labour.map((item) =>
        new Date(item.date).getUTCFullYear()
      ),
      ...payments.map((item) =>
        new Date(item.date).getUTCFullYear()
      ),
    ])
  ).sort((a, b) => b - a);

  const annualCards = [
    {
      label: "Payments Received",
      value: received.total,
      note: `${yearPayments.length} payments recorded`,
    },
    {
      label: "Project Expenses",
      value: projectCost.total,
      note: `${projectExpenses.length} expenses recorded`,
    },
    {
      label: "Labour Costs",
      value: labourCost.total,
      note: `${yearLabour.length} labour entries`,
    },
    {
      label: "General Expenses",
      value: generalCost.total,
      note: `${generalExpenses.length} general expenses`,
    },
  ];

  const monthlyData = Array.from(
    { length: 12 },
    (_, index) => {
      const month = index;

      const matchingMonth = (date: string) => {
        const parsed = new Date(date);
        return (
          parsed.getUTCFullYear() === selectedYear &&
          parsed.getUTCMonth() === month
        );
      };

      const monthReceived = sumConverted(
        payments.filter((item) => matchingMonth(item.date)),
        (payment) =>
          payment.currency === "GBP"
            ? Number(payment.amount)
            : null
      );

      const monthExpenses = sumConverted(
        expenses.filter((item) => matchingMonth(item.date)),
        expenseGBP
      );

      const monthLabour = sumConverted(
        labour.filter((item) => matchingMonth(item.date)),
        labourGBP
      );

      return {
        month: new Date(
          Date.UTC(2026, index, 1)
        ).toLocaleDateString("en-GB", {
          month: "short",
          timeZone: "UTC",
        }),
        received: monthReceived.total,
        costs: monthExpenses.total + monthLabour.total,
      };
    }
  );

  const chartMax = Math.max(
    1,
    ...monthlyData.flatMap((item) => [
      item.received,
      item.costs,
    ])
  );

  return (
    <main className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Resolve Construction
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Company Finances
          </h1>

          <p className="mt-2 text-gray-500">
            Financial overview across all active and completed
            projects.
          </p>
        </div>

        <form method="get">
          <label
            htmlFor="year"
            className="mb-2 block text-sm font-medium text-gray-600"
          >
            Financial Year
          </label>

          <select
            id="year"
            name="year"
            defaultValue={selectedYear}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900"
          >
            {availableYears.map((availableYear) => (
              <option
                key={availableYear}
                value={availableYear}
              >
                {availableYear}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="ml-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Apply
          </button>
        </form>
      </div>

      {missingAnnual > 0 && (
        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <strong>Incomplete currency conversion:</strong>{" "}
          {missingAnnual} annual transaction(s) cannot yet be
          converted to GBP. The annual totals below exclude
          those amounts.
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {annualCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">
              {card.label}
            </p>

            <p className="mt-3 text-3xl font-bold text-gray-900">
              {money(card.value)}
            </p>

            <p className="mt-2 text-xs text-gray-400">
              {card.note}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Annual Costs
          </p>

          <p className="mt-3 text-3xl font-bold text-red-600">
            {money(annualCosts)}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            Project expenses + labour + general expenses in{" "}
            {selectedYear}
          </p>
        </div>

        <div className="rounded-xl border border-orange-100 bg-orange-50 p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-600">
            Annual Cash Balance
          </p>

          <p
            className={`mt-3 text-3xl font-bold ${
              annualCashBalance >= 0
                ? "text-green-700"
                : "text-red-600"
            }`}
          >
            {missingAnnual > 0
              ? "Incomplete"
              : money(annualCashBalance)}
          </p>

          <p className="mt-2 text-xs text-gray-600">
            Payments received minus recorded costs in{" "}
            {selectedYear}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Monthly Cash Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Payments received versus expenses and labour
              during {selectedYear}
            </p>
          </div>

          <div className="flex gap-5 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-orange-500" />
              Received
            </span>

            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-gray-700" />
              Costs
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-12 gap-2">
          {monthlyData.map((item) => (
            <div
              key={item.month}
              className="flex min-w-0 flex-col items-center"
            >
              <div className="flex h-48 w-full items-end justify-center gap-1">
                <div
                  title={`Received: ${money(item.received)}`}
                  className="w-2/5 rounded-t bg-orange-500"
                  style={{
                    height: `${
                      (item.received / chartMax) * 100
                    }%`,
                  }}
                />

                <div
                  title={`Costs: ${money(item.costs)}`}
                  className="w-2/5 rounded-t bg-gray-700"
                  style={{
                    height: `${
                      (item.costs / chartMax) * 100
                    }%`,
                  }}
                />
              </div>

              <span className="mt-3 text-xs text-gray-500">
                {item.month}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-gray-400">
          Charts use recorded GBP amounts and supported
          conversions only.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Lifetime Company Overview
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              All projects, regardless of status or selected year.
            </p>
          </div>

          <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
            All Time
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Total Contract Value
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {money(contractValue.total)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Total Project Expenses
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {money(allProjectExpenses.total)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Total Labour Costs
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {money(allLabour.total)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Total General Expenses
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {money(allGeneralExpenses.total)}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-6">
          <p className="text-sm font-semibold text-gray-700">
            Estimated Company Profit
          </p>

          <p
            className={`mt-2 text-4xl font-bold ${
              estimatedProfit >= 0
                ? "text-green-700"
                : "text-red-600"
            }`}
          >
            {missingLifetime > 0
              ? "Incomplete"
              : money(estimatedProfit)}
          </p>

          <p className="mt-2 text-sm text-gray-600">
            Total contract value minus all recorded project,
            labour and general expenses.
          </p>

          {missingLifetime > 0 && (
            <p className="mt-3 text-sm font-medium text-amber-800">
              {missingLifetime} amount(s) require currency
              conversion before this profit can be calculated
              accurately.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/projects"
          className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          View Projects
        </Link>

        <Link
          href="/expenses"
          className="rounded-lg bg-orange-500 px-5 py-3 font-medium text-white hover:bg-orange-600"
        >
          All Expenses & Receipts
        </Link>
      </div>
    </main>
  );
}
