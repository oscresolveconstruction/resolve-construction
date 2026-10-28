import { db } from "../../../../../../src/prisma/db";
import DeleteInvoiceButton from "../../../../../components/DeleteInvoiceButton";
import { getPayrollPool } from "@/app/lib/payroll-db";
import { notFound, redirect } from "next/navigation";

type InvoiceDetailPageProps = {
  params: Promise<{
    id: string;
    invoiceId: string;
  }>;
};

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { id, invoiceId } = await params;

  const projectId = Number(id);
  const invoiceIdNumber = Number(invoiceId);

  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    notFound();
  }

  const invoice = await db.orm.public.Invoice.first({
    id: invoiceIdNumber,
  });

  if (!invoice || invoice.projectId !== projectId) {
    notFound();
  }

  const linked = await getPayrollPool().query('SELECT invoice_id FROM commercial_invoice WHERE invoice_id=$1', [invoiceIdNumber]);
  if (linked.rowCount) redirect(`/invoices/${invoiceIdNumber}`);

  const payments = await db.orm.public.Payment
    .where({
      invoiceId: invoiceIdNumber,
    })
    .all();

  const invoiceAmount = Number(invoice.amount);

  const paidAmount = payments.reduce((total, payment) => {
    if (payment.currency === invoice.currency) {
      return total + Number(payment.amount);
    }

    return total;
  }, 0);

  const outstanding = Math.max(
    invoiceAmount - paidAmount,
    0
  );

  let status = invoice.status;

  if (paidAmount >= invoiceAmount) {
    status = "Paid";
  } else if (paidAmount > 0) {
    status = "Partially Paid";
  } else if (
    invoice.status !== "Draft" &&
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date()
  ) {
    status = "Overdue";
  } else if (invoice.status !== "Draft") {
    status = "Sent";
  }

  let statusClasses = "bg-gray-100 text-gray-700";

  if (status === "Paid") {
    statusClasses = "bg-green-100 text-green-700";
  }

  if (status === "Partially Paid") {
    statusClasses = "bg-orange-100 text-orange-700";
  }

  if (status === "Overdue") {
    statusClasses = "bg-red-100 text-red-700";
  }

  if (status === "Sent") {
    statusClasses = "bg-blue-100 text-blue-700";
  }

  const symbol =
    invoice.currency === "EUR" ? "€" : "£";

  const formatMoney = (value: number) => {
    return value.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <main className="p-8">
      <div className="max-w-6xl">

        {/* Back */}
        <a
          href={`/projects/${project.id}/invoices`}
          className="text-sm font-medium text-gray-500 hover:text-orange-500"
        >
          ← Back to Invoices
        </a>

        {/* Header */}
        <div className="mt-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Invoice
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              {invoice.invoiceNumber}
            </h1>

            <p className="mt-2 text-gray-500">
              {project.name} · {project.client}
            </p>
          </div>

          <div className="flex items-center gap-3">
  <a
    href={`/projects/${project.id}/invoices/${invoice.id}/edit`}
    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-orange-500 hover:text-orange-500"
  >
    Edit Invoice
  </a>

  <DeleteInvoiceButton
    projectId={project.id}
    invoiceId={invoice.id}
  />

  <span
    className={`rounded-full px-4 py-2 text-sm font-medium ${statusClasses}`}
  >
    {status}
  </span>
</div>
        </div>

        <div className="mt-5">
          <a href={`/projects/${projectId}/invoices/${invoiceIdNumber}/print`} className="inline-flex rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700">
            Preview / Print invoice
          </a>
        </div>

        {/* Financial Summary */}
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Invoice Amount
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {symbol}
              {formatMoney(invoiceAmount)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Paid
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {symbol}
              {formatMoney(paidAmount)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Outstanding
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {symbol}
              {formatMoney(outstanding)}
            </p>
          </div>

        </div>

        {/* Invoice Information */}
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Invoice Information
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">

            <div>
              <p className="text-sm text-gray-500">
                Issue Date
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {new Date(
                  invoice.issueDate
                ).toLocaleDateString("en-GB")}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Due Date
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {invoice.dueDate
                  ? new Date(
                      invoice.dueDate
                    ).toLocaleDateString("en-GB")
                  : "Not set"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Currency
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {invoice.currency}
              </p>
            </div>

          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-500">
              Description
            </p>

            <p className="mt-1 text-gray-900">
              {invoice.description || "No description"}
            </p>
          </div>
        </div>

        {/* Payments */}
        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Payments
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Payments received for this invoice
            </p>
          </div>

          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Date
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Reference
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Description
                </th>

                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b last:border-b-0"
                >
                  <td className="px-6 py-5 text-gray-700">
                    {new Date(
                      payment.date
                    ).toLocaleDateString("en-GB")}
                  </td>

                  <td className="px-6 py-5 text-gray-700">
                    {payment.reference || "-"}
                  </td>

                  <td className="px-6 py-5 text-gray-700">
                    {payment.description || "-"}
                  </td>

                  <td className="px-6 py-5 text-right font-medium text-green-600">
                    {payment.currency === "EUR"
                      ? "€"
                      : "£"}
                    {formatMoney(Number(payment.amount))}
                  </td>
                </tr>
              ))}

              {payments.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No payments have been recorded for this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}