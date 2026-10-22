import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/src/prisma/db";
import { updateMonthlyPayroll } from "@/app/actions/payroll";

type Props = {
  params: Promise<{ id: string }>;
};

function money(value: number) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

export default async function EditPayrollPage({ params }: Props) {
  const { id } = await params;
  const payrollId = Number(id);

  if (!Number.isSafeInteger(payrollId) || payrollId <= 0) {
    notFound();
  }

  const payroll = await db.orm.public.MonthlyPayroll.first({
    id: payrollId,
  });

  if (!payroll) {
    notFound();
  }

  const worker = await db.orm.public.Worker.first({
    id: payroll.workerId,
  });

  const grossPay = Number(payroll.grossPay);
  const employerNI = Number(payroll.employerSocialInsurance);
  const isDraft = payroll.status === "Draft";
  const updatePayrollWithId = updateMonthlyPayroll.bind(null, payrollId);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/monthly-payroll"
          className="text-sm font-medium text-gray-500 hover:text-orange-600"
        >
          ← Back to Monthly Payroll
        </Link>

        <div className="mb-8 mt-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">
            Resolve Construction
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Edit Monthly Payroll
          </h1>
          <p className="mt-2 text-gray-500">
            Correct payroll amounts before closing the month.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div>
              <p className="text-sm text-gray-500">Payroll Record</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">
                {worker?.name ?? "Unknown Worker"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{payroll.month}</p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                isDraft
                  ? "bg-orange-50 text-orange-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {payroll.status}
            </span>
          </div>

          {!isDraft ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-semibold text-amber-900">
                Payroll is closed
              </h3>
              <p className="mt-2 text-sm text-amber-800">
                Reopen this payroll in Monthly Payroll before editing it.
              </p>
              <Link
                href="/monthly-payroll"
                className="mt-5 inline-block rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
              >
                Back to Monthly Payroll
              </Link>
            </div>
          ) : (
            <form action={updatePayrollWithId} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Worker
                </label>
                <input
                  value={worker?.name ?? "Unknown Worker"}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-600"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Payroll Month
                </label>
                <input
                  value={payroll.month}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-600"
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
                  defaultValue={grossPay.toFixed(2)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Gross salary before employee deductions.
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
                  defaultValue={employerNI.toFixed(2)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter only the contribution paid by the employer.
                </p>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
                <p className="text-sm font-semibold text-gray-700">
                  Currently Recorded Employer Cost
                </p>
                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {money(grossPay + employerNI)}
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  This is the saved total. Your changes appear after saving.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
                >
                  Save Changes
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
