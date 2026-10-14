import Link from "next/link";

import { db } from "../../src/prisma/db";
import { requireActiveUser } from "../lib/require-active-user";

export const dynamic = "force-dynamic";



const formatGBP = (value: number) =>

  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);



const formatOriginal = (amount: number, currency: string) =>

  new Intl.NumberFormat("en-GB", {

    style: "currency",

    currency: currency === "EUR" ? "EUR" : "GBP",

  }).format(amount);



const formatDate = (date: string) =>

  new Date(date).toLocaleDateString("en-GB", {

    day: "2-digit", month: "short", year: "numeric",

  });



type AmountResult = { total: number; missing: number };



function sumAmounts<T>(items: T[], convert: (item: T) => number | null): AmountResult {

  return items.reduce<AmountResult>((result, item) => {

    const amount = convert(item);

    if (amount === null || !Number.isFinite(amount)) result.missing++;

    else result.total += amount;

    return result;

  }, { total: 0, missing: 0 });

}



type DashboardProps = {
  searchParams: Promise<{ period?: string; month?: string; year?: string }>;
};

export default async function Home({ searchParams }: DashboardProps) {
    await requireActiveUser();
  const query = await searchParams;
  const period = ["all", "month", "year"].includes(query.period ?? "")
    ? query.period!
    : "all";
  const currentYear = new Date().getFullYear();
  const year = /^\d{4}$/.test(query.year ?? "") ? query.year! : String(currentYear);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month ?? "")
    ? query.month!
    : new Date().toISOString().slice(0, 7);
  const inPeriod = (date: string) => {
    if (period === "all") return true;
    const day = date.slice(0, 10);
    return period === "month" ? day.startsWith(month + "-") : day.startsWith(year + "-");
  };
  const periodLabel = period === "month" ? month : period === "year" ? year : "All time";


  const [projects, expenses, labour, payments, extraWorks] = await Promise.all([

    db.orm.public.Project.all(),

    db.orm.public.Expense.all(),

    db.orm.public.Labour.all(),

    db.orm.public.Payment.all(),

    db.orm.public.ExtraWork.all(),

  ]);



  const projectMap = new Map(projects.map((project) => [project.id, project]));

  const activeProjects = projects.filter(

    (project) => !["completed", "complete", "finished"].includes(project.status.trim().toLowerCase())

  );

  const approvedWorks = extraWorks.filter((work) => work.status === "Approved");



  // The saved exchange rate is only treated as EUR-to-GBP when its

  // destination is known to be GBP. Never invent a rate for projects or payments.

  const expenseToGBP = (expense: (typeof expenses)[number]): number | null => {

    const amount = Number(expense.amount);

    if (expense.currency === "GBP") return amount;

    const rate = Number(expense.exchangeRate ?? 0);

    if (rate <= 0) return null;

    if (expense.projectId === null) return amount * rate;

    return projectMap.get(expense.projectId)?.currency === "GBP" ? amount * rate : null;

  };



  const labourToGBP = (entry: (typeof labour)[number]): number | null => {

    const amount = Number(entry.amount);

    if (entry.currency === "GBP") return amount;

    const rate = Number(entry.exchangeRate ?? 0);

    return projectMap.get(entry.projectId)?.currency === "GBP" && rate > 0

      ? amount * rate

      : null;

  };



  // Movements are filtered by their recorded date; contracts and extras
  // are lifetime values and are never presented as monthly revenue.
  const periodPayments = payments.filter((payment) => inPeriod(payment.date));
  const periodExpenses = expenses.filter((expense) => inPeriod(expense.date));
  const periodLabour = labour.filter((entry) => inPeriod(entry.date));

  const contracts = sumAmounts(projects, (project) =>

    project.currency === "GBP" ? Number(project.contractValue) : null

  );

  const approvedExtras = sumAmounts(approvedWorks, (work) =>

    work.currency === "GBP" ? Number(work.amount) : null

  );

  const received = sumAmounts(periodPayments, (payment) =>

    payment.currency === "GBP" ? Number(payment.amount) : null

  );

  const projectExpenses = sumAmounts(

    periodExpenses.filter((expense) => expense.projectId !== null), expenseToGBP

  );

  const generalExpenses = sumAmounts(

    periodExpenses.filter((expense) => expense.projectId === null), expenseToGBP

  );

  const labourCosts = sumAmounts(periodLabour, labourToGBP);



  const totalValue = contracts.total + approvedExtras.total;

  const totalExpenses = projectExpenses.total + generalExpenses.total;

  const totalCosts = totalExpenses + labourCosts.total;

  const lifetimeReceived = sumAmounts(payments, (payment) =>
    payment.currency === "GBP" ? Number(payment.amount) : null
  );
  const outstanding = totalValue - lifetimeReceived.total;

  const estimatedProfit = totalValue - totalCosts;

  const valueMissing = contracts.missing + approvedExtras.missing;

  const costMissing = projectExpenses.missing + generalExpenses.missing + labourCosts.missing;

  const outstandingIncomplete = valueMissing + lifetimeReceived.missing > 0;

  const profitIncomplete = valueMissing + costMissing > 0;

  const missingConversions = valueMissing + received.missing + costMissing;



  const cards = [

    { title: "Total Project Value", value: formatGBP(totalValue), detail: "Contracts + approved extra works", color: "text-gray-900", incomplete: valueMissing > 0 },

    { title: "Payments Received", value: formatGBP(received.total), detail: `Client payments · ${periodLabel}`, color: "text-green-600", incomplete: received.missing > 0 },

    { title: "Outstanding Payments", value: outstandingIncomplete ? "Incomplete" : formatGBP(outstanding), detail: "Lifetime outstanding balance", color: "text-orange-600", incomplete: outstandingIncomplete },

    { title: "Total Expenses", value: formatGBP(totalExpenses), detail: `Project expenses + overheads · ${periodLabel}`, color: "text-red-600", incomplete: projectExpenses.missing + generalExpenses.missing > 0 },

    { title: "Labour Costs", value: formatGBP(labourCosts.total), detail: `Recorded worker costs · ${periodLabel}`, color: "text-red-600", incomplete: labourCosts.missing > 0 },

    { title: "Estimated Profit", value: period !== "all" ? "All time only" : profitIncomplete ? "Incomplete" : formatGBP(estimatedProfit), detail: "Lifetime project value less costs (not monthly profit)", color: estimatedProfit >= 0 ? "text-green-600" : "text-red-600", incomplete: profitIncomplete },

  ];



  const projectRows = projects.map((project) => {

    const extras = approvedWorks.filter((work) => work.projectId === project.id);

    const projectPayments = payments.filter((payment) => payment.projectId === project.id);

    const sameCurrencyExtras = extras.filter((work) => work.currency === project.currency);

    const sameCurrencyPayments = projectPayments.filter((payment) => payment.currency === project.currency);

    const hasOtherCurrencies = sameCurrencyExtras.length !== extras.length || sameCurrencyPayments.length !== projectPayments.length;

    const value = Number(project.contractValue) + sameCurrencyExtras.reduce((sum, work) => sum + Number(work.amount), 0);

    const paid = sameCurrencyPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    return { project, value, paid, outstanding: value - paid, hasOtherCurrencies };

  });



  const recentActivity = [

    ...periodExpenses.map((expense) => ({

      id: `expense-${expense.id}`,

      date: expense.date,

      title: expense.supplier,

      description: expense.projectId === null

        ? "General Expense"

        : projectMap.get(expense.projectId)?.name ?? "Project Expense",

      amount: Number(expense.amount), currency: expense.currency, type: "Expense",

      href: expense.projectId === null

        ? `/general-expenses/${expense.id}/edit`

        : `/projects/${expense.projectId}/expenses/${expense.id}/edit`,

    })),

    ...periodPayments.map((payment) => ({

      id: `payment-${payment.id}`,

      date: payment.date,

      title: "Payment Received",

      description: projectMap.get(payment.projectId)?.name ?? "Project",

      amount: Number(payment.amount), currency: payment.currency, type: "Payment",

      href: `/projects/${payment.projectId}/payments`,

    })),

  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);



  return (

    <main className="flex-1 bg-gray-50 p-5 lg:p-8">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>

            <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Resolve Construction</p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">Dashboard</h1>

            <p className="mt-2 text-gray-500">Your construction business at a glance.</p>

          </div>

          <Link href="/company-finances" className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600">

            View Company Finances →

          </Link>

        </div>



        <form method="get" className="mt-8 flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="period" className="mb-2 block text-sm font-semibold text-gray-700">Financial period</label>
            <select id="period" name="period" defaultValue={period} className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900">
              <option value="all">All Time</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div>
            <label htmlFor="month" className="mb-2 block text-sm font-semibold text-gray-700">Month</label>
            <input id="month" type="month" name="month" defaultValue={month} className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900" />
          </div>
          <div>
            <label htmlFor="year" className="mb-2 block text-sm font-semibold text-gray-700">Year</label>
            <input id="year" type="number" name="year" min="2000" max="2100" defaultValue={year} className="w-28 rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900" />
          </div>
          <button type="submit" className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700">Apply Filters</button>
          <Link href="/" className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50">Reset</Link>
          <p className="w-full text-xs text-gray-500">Choose Monthly or Yearly and press Apply Filters. Contract values, outstanding balances and project summary always show lifetime amounts.</p>
        </form>

        <div className="mt-8 grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-gray-500">Total Projects</p>

            <p className="mt-2 text-4xl font-bold text-gray-900">{projects.length}</p>

            <Link href="/projects" className="mt-3 inline-block text-sm font-medium text-orange-600 hover:underline">View all projects →</Link>

          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-gray-500">Active Projects</p>

            <p className="mt-2 text-4xl font-bold text-orange-500">{activeProjects.length}</p>

            <p className="mt-3 text-sm text-gray-500">Projects not marked as completed</p>

          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-gray-500">Total Recorded Costs</p>

            <p className="mt-2 text-3xl font-bold text-gray-900">{formatGBP(totalCosts)}</p>

            <p className="mt-3 text-sm text-gray-500">Expenses + labour + company overheads · {periodLabel}</p>

            {costMissing > 0 && <p className="mt-2 text-xs font-semibold text-amber-700">Partial total — conversion pending</p>}

          </div>

        </div>



        {missingConversions > 0 && (

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">

            <p className="font-semibold text-amber-900">Currency conversion required</p>

            <p className="mt-1 text-sm text-amber-800">

              {missingConversions} amount(s) cannot be safely converted to GBP. Some totals exclude these amounts and are incomplete.

            </p>

          </div>

        )}



        <div className="mt-10">

          <h2 className="text-xl font-bold text-gray-900">Financial Overview</h2>

          <p className="mt-1 text-sm text-gray-500">Contract value and outstanding are lifetime figures; cash movements follow the selected period</p>

        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          {cards.map((card) => (

            <div key={card.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

              <p className="text-sm font-medium text-gray-500">{card.title}</p>

              <p className={`mt-3 text-3xl font-bold ${card.color}`}>{card.value}</p>

              <p className="mt-2 text-sm text-gray-500">{card.detail}</p>

              {card.incomplete && <p className="mt-2 text-xs font-semibold text-amber-700">Partial amount — conversion pending</p>}

            </div>

          ))}

        </div>



        <section className="mt-10 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-3 p-6">

            <div>

              <h2 className="text-xl font-bold text-gray-900">Project Financial Summary</h2>

              <p className="mt-1 text-sm text-gray-500">Contract value, approved extras and client payments by project</p>

            </div>

            <Link href="/projects" className="text-sm font-semibold text-orange-600 hover:underline">View All →</Link>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[750px] text-left text-sm">

              <thead className="border-y border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">

                <tr><th className="px-6 py-4">Project</th><th className="px-6 py-4 text-right">Total Value</th><th className="px-6 py-4 text-right">Paid</th><th className="px-6 py-4 text-right">Outstanding</th><th className="px-6 py-4">Status</th></tr>

              </thead>

              <tbody>

                {projectRows.map(({ project, value, paid, outstanding: due, hasOtherCurrencies }) => (

                  <tr key={project.id} className="border-b border-gray-100 last:border-b-0 hover:bg-orange-50/30">

                    <td className="px-6 py-4"><Link href={`/projects/${project.id}`} className="font-semibold text-gray-900 hover:text-orange-600">{project.name}</Link><p className="mt-1 text-xs text-gray-500">{project.client}</p></td>

                    <td className="px-6 py-4 text-right font-medium">{formatOriginal(value, project.currency)}</td>

                    <td className="px-6 py-4 text-right font-medium text-green-600">{formatOriginal(paid, project.currency)}</td>

                    <td className="px-6 py-4 text-right font-semibold text-orange-600">{hasOtherCurrencies ? "Incomplete" : formatOriginal(due, project.currency)}{hasOtherCurrencies && <p className="text-xs font-normal text-amber-700">Other currency entries</p>}</td>

                    <td className="px-6 py-4"><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">{project.status}</span></td>

                  </tr>

                ))}

                {projectRows.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No projects recorded yet.</td></tr>}

              </tbody>

            </table>

          </div>

        </section>



        <div className="mt-10 grid gap-6 xl:grid-cols-2">

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-gray-900">Active Projects</h2><Link href="/projects" className="text-sm font-semibold text-orange-600 hover:underline">View All →</Link></div>

            {activeProjects.length === 0 ? <p className="mt-6 text-sm text-gray-500">No active projects recorded.</p> : (

              <div className="mt-5 divide-y divide-gray-100">

                {activeProjects.slice(0, 6).map((project) => (

                  <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between gap-4 py-4 hover:bg-orange-50">

                    <div><p className="font-semibold text-gray-900">{project.name}</p><p className="mt-1 text-sm text-gray-500">{project.client}</p></div>

                    <div className="text-right"><p className="font-semibold text-gray-900">{formatOriginal(Number(project.contractValue), project.currency)}</p><span className="mt-1 inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">{project.status}</span></div>

                  </Link>

                ))}

              </div>

            )}

          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-gray-900">Recent Activity</h2><Link href="/expenses" className="text-sm font-semibold text-orange-600 hover:underline">View Expenses →</Link></div>

            {recentActivity.length === 0 ? <p className="mt-6 text-sm text-gray-500">No expenses or payments recorded yet.</p> : (

              <div className="mt-5 divide-y divide-gray-100">

                {recentActivity.map((activity) => (

                  <Link key={activity.id} href={activity.href} className="flex items-center justify-between gap-4 py-4 hover:bg-orange-50">

                    <div><p className="font-semibold text-gray-900">{activity.title}</p><p className="mt-1 text-sm text-gray-500">{activity.description} · {formatDate(activity.date)}</p></div>

                    <div className="text-right"><p className={`font-semibold ${activity.type === "Payment" ? "text-green-600" : "text-red-600"}`}>{activity.type === "Payment" ? "+" : "−"}{formatOriginal(activity.amount, activity.currency)}</p><p className="mt-1 text-xs text-gray-400">{activity.type}</p></div>

                  </Link>

                ))}

              </div>

            )}

          </section>

        </div>



        <section className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>

          <p className="mt-1 text-sm text-gray-500">Access your most-used management tools.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {[

              { href: "/projects", label: "Manage Projects →" },

              { href: "/general-expenses/new", label: "Add General Expense →" },

              { href: "/expenses", label: "All Expenses & Receipts →" },

              { href: "/company-finances", label: "Company Finances →" },

            ].map((action) => (

              <Link key={action.href} href={action.href} className="rounded-xl border border-gray-200 p-5 font-semibold text-gray-800 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600">{action.label}</Link>

            ))}

          </div>

        </section>

      </div>

    </main>

  );

}
