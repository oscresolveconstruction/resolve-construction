import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../../../../src/prisma/db";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string; invoiceId: string }> };

function displayDate(value: string | null | undefined) {
  if (!value) return "On Receipt";
  const day = value.slice(0, 10);
  const [year, month, date] = day.split("-");
  return year && month && date ? `${date}/${month}/${year}` : day;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "GBP",
  }).format(amount);
}

export default async function InvoicePrintPage({ params }: PageProps) {
  const { id, invoiceId } = await params;
  const projectId = Number(id);
  const invoiceNumberId = Number(invoiceId);
  if (!Number.isSafeInteger(projectId) || projectId <= 0 ||
      !Number.isSafeInteger(invoiceNumberId) || invoiceNumberId <= 0) notFound();

  const [project, invoice] = await Promise.all([
    db.orm.public.Project.first({ id: projectId }),
    db.orm.public.Invoice.first({ id: invoiceNumberId }),
  ]);
  if (!project || !invoice || invoice.projectId !== projectId) notFound();

  const payments = await db.orm.public.Payment.where({ invoiceId: invoiceNumberId }).all();
  const paid = payments.filter(p => p.currency === invoice.currency)
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const due = Math.max(0, Number(invoice.amount) - paid);
  const currency = invoice.currency;
  const money = (number: number) => formatAmount(number, currency);

  return (
    <main className="invoice-print-root min-h-screen bg-gray-100 py-8 text-[#333]">
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          body { background: white !important; }
          .invoice-print-root { background: white !important; padding: 0 !important; }
          .invoice-sheet { width: 100% !important; min-height: auto !important; box-shadow: none !important; margin: 0 !important; }
          .no-print { display: none !important; }
        }
        .invoice-lines { white-space: pre-wrap; overflow-wrap: anywhere; }
        .invoice-items tr { break-inside: avoid; }
        .invoice-summary { break-inside: avoid; }
      `}</style>

      <div className="no-print mx-auto mb-5 flex max-w-[800px] justify-between gap-3 px-4">
        <Link className="rounded-lg bg-white px-4 py-2 text-sm shadow" href={`/projects/${projectId}/invoices/${invoiceNumberId}`}>← Invoice details</Link>
        <p className="text-xs text-slate-600">Print-ready preview · use browser Print → Save as PDF</p>
      </div>

      <article className="invoice-sheet mx-auto min-h-[1122px] w-full max-w-[794px] bg-white shadow-lg">
        <div className="h-3 bg-[#f36b21]" />
        <div className="grid gap-5 px-10 pb-7 pt-8 sm:grid-cols-[1fr_210px]">
          <div>
            <p className="text-[23px] font-bold tracking-tight text-[#ee6423]">Resolve Construction Ltd</p>
            <p className="mt-2 text-sm leading-6">Unit 27, Block 3, Watergardens, Gibraltar</p>
            <p className="text-sm leading-6">Postal code: GX11 1AA</p>
            <p className="text-sm leading-6">+350 54099237</p>
            <p className="text-sm leading-6">www.resolveconstructionltd.com</p>
            <p className="text-sm leading-6">inforesolveconstruction@gmail.com</p>
          </div>
          <div className="space-y-3 sm:text-right">
            <div><h1 className="text-3xl font-black tracking-widest text-[#f36b21]">INVOICE</h1><p className="font-semibold">{invoice.invoiceNumber}</p></div>
            <div><p className="text-xs font-bold tracking-widest text-[#ec6a2b]">DATE</p><p className="text-sm">{displayDate(invoice.issueDate)}</p></div>
            <div><p className="text-xs font-bold tracking-widest text-[#ec6a2b]">DUE</p><p className="text-sm">{displayDate(invoice.dueDate)}</p></div>
            <div><p className="text-xs font-bold tracking-widest text-[#ec6a2b]">BALANCE DUE</p><p className="text-xl font-semibold">{money(due)}</p></div>
          </div>
        </div>

        <section className="px-10 pb-8">
          <h2 className="text-xs font-extrabold tracking-widest text-[#ec6a2b]">BILL TO</h2>
          <p className="mt-2 font-semibold">{project.client}</p>
          <p className="text-sm text-gray-600">{project.name}</p>
        </section>

        <section className="px-10">
          <table className="invoice-items w-full table-fixed text-left">
            <colgroup><col style={{width:"61%"}}/><col style={{width:"16%"}}/><col style={{width:"7%"}}/><col style={{width:"16%"}}/></colgroup>
            <thead className="bg-[#f36b21] text-xs text-white">
              <tr><th className="px-3 py-3">DESCRIPTION</th><th className="px-2 py-3 text-right">RATE</th><th className="px-2 py-3 text-right">QTY</th><th className="px-2 py-3 text-right">AMOUNT</th></tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 align-top text-sm">
                <td className="invoice-lines px-3 py-5">{invoice.description || "Construction works"}</td>
                <td className="px-2 py-5 text-right">{money(Number(invoice.amount))}</td>
                <td className="px-2 py-5 text-right">1</td>
                <td className="px-2 py-5 text-right font-semibold">{money(Number(invoice.amount))}</td>
              </tr>
            </tbody>
          </table>
          <div className="invoice-summary ml-auto mt-9 w-full max-w-[310px] space-y-3 text-sm">
            <div className="flex justify-between"><span>Total</span><strong>{money(Number(invoice.amount))}</strong></div>
            <div className="flex justify-between"><span>Payments received</span><span>{money(paid)}</span></div>
            <div className="flex justify-between border-t-2 border-[#f36b21] pt-3 text-base font-bold"><span>Balance Due</span><span>{money(due)}</span></div>
          </div>
          <p className="mt-14 border-t border-gray-200 pt-4 text-xs text-gray-500">
            Invoice generated from a recorded project invoice. Verify customer address, itemised works, payment terms and approved bank details before sending.
          </p>
        </section>
      </article>
    </main>
  );
}
