import {projectFinancials} from '../../../../lib/finance/calculations.mjs';
import { db } from "../../../../../src/prisma/db";
import { notFound } from "next/navigation";

type InvoicesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoicesPage({
  params,
}: InvoicesPageProps) {
  const { id } = await params;
  const projectId = Number(id);

  // Buscar proyecto
  const project = await db.orm.public.Project.first({
    id: projectId,
  });

  if (!project) {
    notFound();
  }

  // Buscar facturas del proyecto
  const invoices = await db.orm.public.Invoice
    .where({
      projectId,
    })
    .all();

  const extras=await db.orm.public.ExtraWork.where({projectId}).all();
  // Buscar pagos del proyecto
  const payments = await db.orm.public.Payment
    .where({
      projectId,
    })
    .all();

  const symbol = project.currency === "EUR" ? "€" : "£";

  const formatMoney = (value: number) => {
    return value.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const summary=projectFinancials(project,{invoices,extras,payments});
  const totalInvoiced=summary.invoiced;
  const totalPaid=payments.filter(p=>p.invoiceId!==null&&p.currency===project.currency).reduce((n,p)=>n+Math.round(Number(p.amount)*100),0)/100;
  const remainingToInvoice=summary.remainingToInvoice;
  const outstandingInvoices=Math.round((totalInvoiced-totalPaid)*100)/100;
  return (
    <main className="p-8">
      {/* Back */}
      <a
        href={`/projects/${project.id}`}
        className="text-sm font-medium text-gray-500 hover:text-orange-500"
      >
        ← Back to Project
      </a>

      {/* Header */}
      <div className="mt-5 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Invoices
          </h1>

          <p className="mt-2 text-gray-500">
            {project.name}
          </p>
        </div>

        <a
          href={`/projects/${project.id}/invoices/new`}
          className="rounded-lg bg-orange-500 px-5 py-3 font-medium text-white hover:bg-orange-600"
        >
          + Add Invoice
        </a>
      </div>

      {/* Summary */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Project Value
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {symbol}
            {formatMoney(summary.totalValue)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Invoiced
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {symbol}
            {formatMoney(totalInvoiced)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Paid
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {symbol}
            {formatMoney(totalPaid)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Outstanding
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {symbol}
            {formatMoney(Math.max(outstandingInvoices, 0))}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Remaining to Invoice
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-600">
            {symbol}
            {formatMoney(remainingToInvoice)}
          </p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Invoice
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Issue Date
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Due Date
              </th>

              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Status
              </th>

              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                Invoiced
              </th>

              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                Paid
              </th>

              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                Outstanding
              </th>
            </tr>
          </thead>

          <tbody>
            {invoices.map((invoice) => {
              const invoiceAmount = invoice.status==='Void'?0:Number(invoice.amount);

              // Pagos pertenecientes a esta factura
              const invoicePayments = payments.filter(
                (payment) =>
                  payment.invoiceId === invoice.id &&
                  payment.currency === invoice.currency
              );

              const paidAmount = invoicePayments.reduce(
                (total, payment) =>
                  total + Number(payment.amount),
                0
              );

              const outstanding = Math.max(
                invoiceAmount - paidAmount,
                0
              );

              // Calcular estado automáticamente
              let status = invoice.status;

              if (invoice.status === 'Void') {
                status = 'Cancelled';
              } else if (paidAmount >= invoiceAmount) {
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

              let statusClasses =
                "bg-gray-100 text-gray-700";

              if (status === "Paid") {
                statusClasses =
                  "bg-green-100 text-green-700";
              }

              if (status === "Partially Paid") {
                statusClasses =
                  "bg-orange-100 text-orange-700";
              }

              if (status === "Overdue") {
                statusClasses =
                  "bg-red-100 text-red-700";
              }

              if (status === "Sent") {
                statusClasses =
                  "bg-blue-100 text-blue-700";
              }

              const invoiceSymbol =
                invoice.currency === "EUR" ? "€" : "£";

              return (
                <tr
                  key={invoice.id}
                  className="border-b last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-6 py-5">
                    <a
  href={`/projects/${project.id}/invoices/${invoice.id}`}
  className="font-medium text-gray-900 hover:text-orange-500"
>
  {invoice.invoiceNumber}
</a>

                    <p className="text-sm text-gray-500">
                      {invoice.description || "No description"}
                    </p>
                  </td>

                  <td className="px-6 py-5 text-gray-700">
                    {new Date(
                      invoice.issueDate
                    ).toLocaleDateString("en-GB")}
                  </td>

                  <td className="px-6 py-5 text-gray-700">
                    {invoice.dueDate
                      ? new Date(
                          invoice.dueDate
                        ).toLocaleDateString("en-GB")
                      : "-"}
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${statusClasses}`}
                    >
                      {status}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-right font-medium text-gray-900">
                    {invoiceSymbol}
                    {formatMoney(invoiceAmount)}
                  </td>

                  <td className="px-6 py-5 text-right font-medium text-green-600">
                    {invoiceSymbol}
                    {formatMoney(paidAmount)}
                  </td>

                  <td className="px-6 py-5 text-right font-medium text-red-600">
                    {invoiceSymbol}
                    {formatMoney(outstanding)}
                  </td>
                </tr>
              );
            })}

            {invoices.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No invoices have been added to this project yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}