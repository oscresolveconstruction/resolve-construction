
import Link from "next/link";
import { db } from "@/src/prisma/db";
import { createMonthlyPayroll } from "@/app/actions/payroll";

export default async function NewMonthlyPayrollPage() {
  const workers = await db.orm.public.Worker.all();

  const gbpWorkers = workers
    .filter((worker) => worker.currency === "GBP")
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/monthly-payroll"
          className="text-sm font-medium text-gray-500 hover:text-orange-600"
        >
          ← Back to Monthly Payroll
        </Link>

        <div className="mt-6 mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">
            Resolve Construction
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Add Monthly Payroll
          </h1>

          <p className="mt-2 text-gray-500">
            Record the actual monthly gross salary and employer
            social insurance contributions.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          {gbpWorkers.length === 0 ? (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                No GBP workers available
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Create a worker before adding a payroll record.
              </p>

              <Link
                href="/workers/new"
                className="mt-6 inline-block rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
              >
                Add Worker
              </Link>
            </div>
          ) : (
            <form action={createMonthlyPayroll} className="space-y-6">
              <div>
                <label
                  htmlFor="workerId"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Worker
                </label>

                <select
                  id="workerId"
                  name="workerId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Select a worker
                  </option>

                  {gbpWorkers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="month"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Payroll Month
                </label>

                <input
                  id="month"
                  name="month"
                  type="month"
                  defaultValue={currentMonth}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="grossPay"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Gross Pay (£)
                </label>

                <input
                  id="grossPay"
                  name="grossPay"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  required
                  placeholder="1564.37"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Enter the gross salary shown on the payslip,
                  before employee deductions.
                </p>
              </div>

              <div>
                <label
                  htmlFor="employerSocialInsurance"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Employer Social Insurance (£)
                </label>

                <input
                  id="employerSocialInsurance"
                  name="employerSocialInsurance"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  required
                  placeholder="243.65"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Enter the contribution paid by Resolve
                  Construction, not the amount deducted from
                  the employee.
                </p>
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-sm font-semibold text-gray-900">
                  Draft payroll
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  This record will be saved as Draft. It will
                  not change project labour costs until the
                  monthly closing process is implemented.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
                >
                  Save Payroll
                </button>

                <Link
                  href="/monthly-payroll"
                  className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
