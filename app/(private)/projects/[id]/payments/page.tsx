import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../../src/prisma/db";
import DeletePaymentButton from "../../../../components/DeletePaymentButton";

type PaymentsPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "GBP",
  }).format(value);
}

export default async function PaymentsPage({
  params,
}: PaymentsPageProps) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    notFound();
  }

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    notFound();
  }

  const [payments, extraWorks] = await Promise.all([
    db.orm.public.Payment.where({ projectId }).all(),
    db.orm.public.ExtraWork.where({ projectId }).all(),
  ]);

  const contractValue = Number(project.contractValue);

  const approvedExtraWorks = extraWorks
    .filter(
      (work) =>
        work.status === "Approved" &&
        work.currency === project.currency
    )
    .reduce((total, work) => total + Number(work.amount), 0);

  const totalProjectValue = contractValue + approvedExtraWorks;

  const totalPaid = payments
    .filter((payment) => payment.currency === project.currency)
    .reduce((total, payment) => total + Number(payment.amount), 0);

  const outstanding = Math.max(totalProjectValue - totalPaid, 0);

  const sortedPayments = [...payments].sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm font-semibold text-gray-500 hover:text-orange-600"
        >
          ← Back to Project
        </Link>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
              Resolve Construction
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Payments
            </h1>

            <p className="mt-2 text-gray-500">{project.name}</p>
          </div>

          <Link
            href={`/projects/${projectId}/payments/new`}
            className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700"
          >
            + Add Payment
          </Link>
        </div>

        {/* FINANCIAL SUMMARY */}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Original Contract",
              amount: contractValue,
            },
            {
              label: "Approved Extra Works",
              amount: approvedExtraWorks,
            },
            {
              label: "Total Project Value",
              amount: totalProjectValue,
            },
            {
              label: "Payments Received",
              amount: totalPaid,
            },
            {
              label: "Outstanding",
              amount: outstanding,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">
                {item.label}
              </p>

              <p
                className={`mt-3 text-2xl font-bold ${
                  item.label === "Outstanding"
                    ? "text-orange-600"
                    : item.label === "Payments Received"
                      ? "text-green-600"
                      : "text-gray-900"
                }`}
              >
                {formatMoney(item.amount, project.currency)}
              </p>
            </div>
          ))}
        </div>

        {/* PAYMENT RECORDS */}

        <section className="mt-9 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900">
              Payment History
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              All payments received for this project
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Date",
                    "Reference",
                    "Payment Method",
                    "Description",
                    "Receipt",
                    "Amount",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sortedPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-t border-gray-100 hover:bg-orange-50/30"
                  >
                    <td className="whitespace-nowrap px-5 py-5 text-sm text-gray-700">
                      {new Date(payment.date).toLocaleDateString(
                        "en-GB"
                      )}
                    </td>

                    <td className="px-5 py-5 text-sm font-medium text-gray-900">
                      {payment.reference || "—"}
                    </td>

                    <td className="px-5 py-5 text-sm text-gray-600">
                      {payment.paymentMethod || "Not specified"}
                    </td>

                    <td className="max-w-[220px] px-5 py-5 text-sm text-gray-600">
                      {payment.description || "—"}
                    </td>

                    <td className="px-5 py-5 text-sm">
                      {payment.receiptFilePath ? (
  <a
    href={`/api/payments/${payment.id}/receipt`}
    className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-100"
    title={payment.receiptFileName || "Download receipt"}
  >
    📎 Download
  </a>
) : (
  <span className="text-gray-400">
    No receipt
  </span>
)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-5 text-sm font-bold text-green-600">
                      {formatMoney(
                        Number(payment.amount),
                        payment.currency
                      )}
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/projects/${projectId}/payments/${payment.id}/edit`}
                          className="text-sm font-semibold text-gray-600 hover:text-orange-600"
                        >
                          Edit
                        </Link>

                        <DeletePaymentButton
                          projectId={projectId}
                          paymentId={payment.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {sortedPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-14 text-center text-gray-500"
                    >
                      No payments have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-5 text-xs text-gray-500">
          Only payments recorded in the project currency are included
          in the financial summary.
        </p>
      </div>
    </main>
  );
}