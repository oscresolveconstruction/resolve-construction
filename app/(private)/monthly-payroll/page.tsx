import Link from "next/link";
import { db } from "@/src/prisma/db";
import { closeMonthlyPayroll } from "@/app/actions/close-payroll";
import { reopenMonthlyPayroll } from "@/app/actions/reopen-payroll";

function money(value: number) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

export default async function MonthlyPayrollPage() {
  const [workers, payrolls] = await Promise.all([
    db.orm.public.Worker.all(),
    db.orm.public.MonthlyPayroll.all(),
  ]);

  const workerMap = new Map(
    workers.map((worker) => [worker.id, worker.name])
  );

  const sortedPayrolls = [...payrolls].sort(
    (a, b) => b.month.localeCompare(a.month) || b.id - a.id
  );

  const totalPayroll = payrolls.reduce(
    (total, payroll) =>
      total +
      Number(payroll.grossPay) +
      Number(payroll.employerSocialInsurance),
    0
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">
            Resolve Construction
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Monthly Payroll
            </h1>
            <Link
              href="/monthly-payroll/new"
              className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700"
            >
              + Add Payroll
            </Link>
          </div>
          <p className="mt-2 text-gray-500">
            Manage monthly employee costs and allocate payroll to
            recorded project labour.
          </p>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Total Workers</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {workers.length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Payroll Records</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {payrolls.length}
            </p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
            <p className="text-sm text-gray-600">Recorded Employer Costs</p>
            <p className="mt-3 text-3xl font-bold text-orange-600">
              {money(totalPayroll)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Across all recorded payroll months, including drafts
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900">
              Payroll History
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Edit a draft to correct payroll amounts. Close it only after
              recording all of the worker&apos;s hours and checking the payslip.
              Reopen a closed payroll to make corrections.
            </p>
          </div>

          {sortedPayrolls.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-lg font-semibold text-gray-900">
                No payroll records yet
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Select Add Payroll to record your first monthly payslip.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-5 py-4">Month</th>
                    <th className="px-5 py-4">Worker</th>
                    <th className="px-5 py-4">Gross Pay</th>
                    <th className="px-5 py-4">Employer Social Insurance</th>
                    <th className="px-5 py-4">Total Cost</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPayrolls.map((payroll) => {
                    const gross = Number(payroll.grossPay);
                    const insurance = Number(payroll.employerSocialInsurance);
                    const closed = payroll.status === "Closed";
                    const draft = payroll.status === "Draft";

                    return (
                      <tr key={payroll.id}>
                        <td className="px-5 py-4 font-medium">{payroll.month}</td>
                        <td className="px-5 py-4">
                          {workerMap.get(payroll.workerId) ?? "Unknown Worker"}
                        </td>
                        <td className="px-5 py-4">{money(gross)}</td>
                        <td className="px-5 py-4">{money(insurance)}</td>
                        <td className="px-5 py-4 font-semibold">
                          {money(gross + insurance)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              closed
                                ? "bg-green-50 text-green-700"
                                : "bg-orange-50 text-orange-700"
                            }`}
                          >
                            {payroll.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {draft ? (
                            <div className="flex flex-col items-start gap-3">
                              <Link
                                href={`/monthly-payroll/${payroll.id}/edit`}
                                className="whitespace-nowrap rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700"
                              >
                                Edit Payroll
                              </Link>
                              <form action={closeMonthlyPayroll}>
                                <input
                                  type="hidden"
                                  name="payrollId"
                                  value={payroll.id}
                                />
                                <label className="mb-2 flex max-w-[200px] items-start gap-2 text-xs text-gray-600">
                                  <input
                                    type="checkbox"
                                    required
                                    className="mt-0.5"
                                  />
                                  <span>
                                    All hours and payroll amounts are final
                                  </span>
                                </label>
                                <button
                                  type="submit"
                                  className="whitespace-nowrap rounded-lg border border-orange-600 px-4 py-2 font-semibold text-orange-700 transition hover:bg-orange-50"
                                >
                                  Close Payroll
                                </button>
                              </form>
                            </div>
                          ) : closed ? (
                            <form action={reopenMonthlyPayroll}>
                              <input
                                type="hidden"
                                name="payrollId"
                                value={payroll.id}
                              />
                              <label className="mb-2 flex max-w-[200px] items-start gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  required
                                  className="mt-0.5"
                                />
                                <span>
                                  I understand project labour costs will become
                                  provisional until this payroll is closed again.
                                </span>
                              </label>
                              <button
                                type="submit"
                                className="whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
                              >
                                Reopen Payroll
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Unavailable
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Draft payroll amounts are not yet allocated to project labour.
          Closing a payroll distributes its cost across that worker&apos;s
          recorded labour entries for the selected month. Reopening restores
          provisional labour rates until it is closed again.
        </p>
      </div>
    </main>
  );
}
